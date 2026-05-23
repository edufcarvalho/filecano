import hashlib
import tempfile
import zipfile
from contextlib import suppress
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from app.core import NotFoundError, Settings, StorageError
from app.models import Archive, User
from app.models.file import File
from app.repositories.archive_repository import ArchiveRepository
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.services.base_service import BaseService
from app.services.file_storage_service import FileStorageService
from app.utils.time import current_datetime

if TYPE_CHECKING:
  from app.models.folder import Folder


class ArchiveService(BaseService):
  def __init__(
    self,
    archive_repository: ArchiveRepository,
    file_repository: FileRepository,
    folder_repository: FolderRepository,
    storage_service: FileStorageService,
    settings: Settings,
  ):
    self.repository = archive_repository
    self.file_repository = file_repository
    self.folder_repository = folder_repository
    self.storage = storage_service
    self.settings = settings

  def get_or_create_archive(
    self, user: User, file_ids: list[UUID]
  ) -> tuple[Archive, bool]:
    file_ids_sorted = sorted(file_ids)
    file_ids_hash = self._compute_file_ids_hash(file_ids_sorted)

    if existing := self.repository.get_by_file_ids_hash(user.id, file_ids_hash):
      existing.last_time_downloaded = current_datetime()
      self.repository.add(existing)
      self.repository.commit()
      return existing, False

    files = self.file_repository.list_by_multiple_ids_and_user(file_ids_sorted, user.id)
    found_ids = sorted({f.id for f in files})

    if not found_ids:
      raise NotFoundError("None of the requested files were found")

    found_hash = self._compute_file_ids_hash(found_ids)

    if found_ids and found_hash != file_ids_hash:
      if existing := self.repository.get_by_file_ids_hash(user.id, found_hash):
        existing.last_time_downloaded = current_datetime()
        self.repository.add(existing)
        self.repository.commit()
        return existing, False

    name_map = {f.id: (f, f.original_name) for f in files}
    archive = self._create_archive(user, found_ids, found_hash, name_map)
    return archive, True

  def get_or_create_folder_archive(
    self, user: User, folder: "Folder"
  ) -> tuple[Archive, bool]:
    folder_ids = self.folder_repository.get_all_descendant_ids(folder.id)
    folder_ids.append(folder.id)

    all_folders = self.folder_repository.list_by_multiple_ids_and_user(
      folder_ids, user.id
    )

    if not all_folders:
      all_folders = [folder]

    parent_map: dict[UUID, Optional[UUID]] = {f.id: f.parent_id for f in all_folders}
    name_cache: dict[UUID, str] = {f.id: f.name for f in all_folders}

    files = self.file_repository.list_by_folder_ids(folder_ids)

    file_ids_sorted = sorted({f.id for f in files})
    if not file_ids_sorted:
      raise NotFoundError("No files found in this folder")
    file_ids_hash = self._compute_file_ids_hash(file_ids_sorted)

    if existing := self.repository.get_by_file_ids_hash(user.id, file_ids_hash):
      existing.last_time_downloaded = current_datetime()
      self.repository.add(existing)
      self.repository.commit()
      return existing, False

    name_map: dict[UUID, tuple[File, str]] = {}

    for f in files:
      path_parts = []
      current_id = f.parent_id
      while current_id is not None and current_id in parent_map:
        path_parts.append(name_cache[current_id])
        current_id = parent_map[current_id]
      path_parts.reverse()
      zip_path = "/".join(path_parts + [f.original_name]) if path_parts else f.original_name
      name_map[f.id] = (f, zip_path)

    archive = self._create_archive(user, file_ids_sorted, file_ids_hash, name_map)

    return archive

  def get_archive_download(self, archive: Archive):
    return self.storage.download(archive.object_key)

  def stream_response(self, response):
    return self.storage.iter_response(response)

  def enforce_retention_policy(self) -> None:
    for archive in self.repository.list_not_retainable():
      self._delete_archive_permanently(archive, commit=False)

    self.repository.commit()

  def _compute_file_ids_hash(self, file_ids: list[UUID]) -> str:
    joined = ",".join(str(fid) for fid in file_ids)
    return hashlib.sha256(joined.encode()).hexdigest()

  def _create_archive(
    self,
    user: User,
    file_ids: list[UUID],
    file_ids_hash: str,
    name_map: dict[UUID, tuple[File, str]],
  ) -> Archive:
    tmp = tempfile.SpooledTemporaryFile(max_size=64 * 1024 * 1024)

    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, allowZip64=True) as zf:
      for file_id in file_ids:
        file, zip_path = name_map[file_id]
        try:
          with self.storage.download(file.object_key) as response:
            with zf.open(zip_path, "w", force_zip64=True) as zf_entry:
              for chunk in response.stream(1024 * 1024):
                zf_entry.write(chunk)
            response.close()
            response.release_conn()
        except StorageError:
          continue

    tmp.seek(0, 2)
    compressed_size = tmp.tell()
    original_size = sum(
      (name_map[fid][0].size_bytes or 0) for fid in file_ids if fid in name_map
    )

    object_key = f"users/{user.id}/archives/{file_ids_hash}.zip"

    tmp.seek(0)
    self.storage.upload(object_key, tmp, compressed_size, "application/zip")
    tmp.close()

    archive = Archive(
      user_id=user.id,
      object_key=object_key,
      file_ids_hash=file_ids_hash,
      file_count=len(file_ids),
      original_size_bytes=original_size,
      compressed_size_bytes=compressed_size,
    )

    self.repository.add(archive)
    self.repository.commit()
    self.repository.refresh(archive)

    return archive

  def _delete_archive_permanently(self, archive: Archive, commit: bool = True) -> None:
    with suppress(StorageError):
      self.storage.delete_all_versions(archive.object_key)

    self.repository.hard_delete(archive)

    if commit:
      self.repository.commit()
