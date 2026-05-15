import unittest
from io import BytesIO

from app.tests.integration.helpers import ApiTestCase


class TestHealthEndpoints(ApiTestCase):
  def test_root_returns_app_info(self):
    """GET / should return app name and status."""
    resp = self.client.get("/")
    self.assertEqual(resp.status_code, 200, "root endpoint should return 200")
    data = resp.json()
    self.assertIn("name", data, "response should contain name")
    self.assertIn("status", data, "response should contain status")
    self.assertEqual(data["status"], "running", "status should be 'running'")

  def test_health_returns_ok(self):
    """GET /health should return ok status."""
    resp = self.client.get("/health")
    self.assertEqual(resp.status_code, 200, "health endpoint should return 200")
    self.assertEqual(
      resp.json(), {"status": "ok"}, "health should return {'status': 'ok'}"
    )


class TestUserEndpoints(ApiTestCase):
  def test_register_user(self):
    """POST /api/v1/users should register a new user and return token."""
    resp = self.client.post(
      "/api/v1/users",
      json={
        "name": "John",
        "email": "john@test.com",
        "password": "SecureP@ss1",
      },
    )
    self.assertEqual(resp.status_code, 201, "user creation should return 201")
    data = resp.json()
    self.assertIn("access_token", data, "response should contain access_token")
    self.assertEqual(data["token_type"], "bearer", "token_type should be 'bearer'")

  def test_register_user_duplicate_email(self):
    """POST /api/v1/users should reject duplicate emails with 409."""
    self.client.post(
      "/api/v1/users",
      json={
        "name": "First",
        "email": "dup@test.com",
        "password": "SecureP@ss1",
      },
    )
    resp = self.client.post(
      "/api/v1/users",
      json={
        "name": "Second",
        "email": "dup@test.com",
        "password": "SecureP@ss1",
      },
    )
    self.assertEqual(resp.status_code, 409, "duplicate email should return 409")

  def test_register_user_invalid_email(self):
    """POST /api/v1/users should reject invalid email with 422."""
    resp = self.client.post(
      "/api/v1/users",
      json={
        "name": "Test",
        "email": "not-an-email",
        "password": "SecureP@ss1",
      },
    )
    self.assertEqual(resp.status_code, 422, "invalid email should return 422")

  def test_register_user_weak_password(self):
    """POST /api/v1/users should reject weak passwords with 400."""
    resp = self.client.post(
      "/api/v1/users",
      json={
        "name": "Test",
        "email": "weak@test.com",
        "password": "weak",
      },
    )
    self.assertEqual(resp.status_code, 400, "weak password should return 400")

  def test_login_user(self):
    """POST /api/v1/users/login should authenticate and return token."""
    self.client.post(
      "/api/v1/users",
      json={
        "name": "Login",
        "email": "login@test.com",
        "password": "SecureP@ss1",
      },
    )
    resp = self.client.post(
      "/api/v1/users/login",
      json={
        "email": "login@test.com",
        "password": "SecureP@ss1",
      },
    )
    self.assertEqual(resp.status_code, 200, "login should return 200")
    self.assertIn("access_token", resp.json(), "login should return access_token")

  def test_login_user_wrong_password(self):
    """POST /api/v1/users/login should reject wrong password with 401."""
    self.client.post(
      "/api/v1/users",
      json={
        "name": "Login",
        "email": "wrongpw@test.com",
        "password": "SecureP@ss1",
      },
    )
    resp = self.client.post(
      "/api/v1/users/login",
      json={
        "email": "wrongpw@test.com",
        "password": "WrongP@ss1",
      },
    )
    self.assertEqual(resp.status_code, 401, "wrong password should return 401")

  def test_refresh_token(self):
    """POST /api/v1/users/token/refresh should return a new token."""
    token = self._register_and_login(email="refresh@test.com")
    resp = self.client.post(
      "/api/v1/users/token/refresh",
      headers=self._auth_headers(token),
    )
    self.assertEqual(resp.status_code, 200, "token refresh should return 200")
    self.assertIn("access_token", resp.json(), "refresh should return access_token")

  def test_refresh_token_without_auth(self):
    """POST /api/v1/users/token/refresh should reject without auth header."""
    resp = self.client.post("/api/v1/users/token/refresh")
    self.assertEqual(resp.status_code, 401, "missing auth should return 401")

  def test_update_user(self):
    """PUT /api/v1/users should update current user."""
    token = self._register_and_login(email="update@test.com")
    resp = self.client.put(
      "/api/v1/users",
      json={
        "name": "Updated Name",
      },
      headers=self._auth_headers(token),
    )
    self.assertEqual(resp.status_code, 200, "user update should return 200")
    self.assertEqual(resp.json()["name"], "Updated Name", "name should be updated")


class TestFileEndpoints(ApiTestCase):
  def setUp(self):
    super().setUp()
    self.token = self._register_and_login(email="filetest@test.com")

  def _upload_text_file(self, filename="test.txt"):
    resp = self.client.post(
      "/api/v1/files",
      files={
        "file": (filename, BytesIO(b"hello world"), "text/plain"),
      },
      headers=self._auth_headers(self.token),
    )
    return resp.json()["id"]

  def test_upload_file(self):
    """POST /api/v1/files should upload a file."""
    resp = self.client.post(
      "/api/v1/files",
      files={
        "file": ("test.txt", BytesIO(b"hello world"), "text/plain"),
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 201, "file upload should return 201")
    data = resp.json()
    self.assertIn("id", data, "response should contain file id")
    self.assertEqual(data["original_name"], "test.txt", "original_name should match")

  def test_upload_file_with_folder(self):
    """POST /api/v1/files with folder_id should upload file into a folder."""
    folder_resp = self.client.post(
      "/api/v1/folders",
      json={
        "name": "UploadFolder",
      },
      headers=self._auth_headers(self.token),
    )
    folder_id = folder_resp.json()["id"]

    resp = self.client.post(
      "/api/v1/files",
      data={
        "folder_id": folder_id,
      },
      files={
        "file": ("infolder.txt", BytesIO(b"inside folder"), "text/plain"),
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 201, "upload with folder should return 201")
    self.assertEqual(resp.json()["folder_id"], folder_id, "folder_id should match")

  def test_list_files_by_folder(self):
    """GET /api/v1/files?by_folder=true should return folder-structured data."""
    resp = self.client.get(
      "/api/v1/files?by_folder=true", headers=self._auth_headers(self.token)
    )
    self.assertEqual(resp.status_code, 200, "by_folder listing should return 200")
    data = resp.json()
    self.assertIn("folders", data, "response should contain folders key")

  def test_update_file(self):
    """PUT /api/v1/files/{id} should update an existing file."""
    upload_resp = self.client.post(
      "/api/v1/files",
      files={
        "file": ("update-me.txt", BytesIO(b"content"), "text/plain"),
      },
      headers=self._auth_headers(self.token),
    )
    file_id = upload_resp.json()["id"]

    resp = self.client.put(
      f"/api/v1/files/{file_id}",
      json={
        "original_name": "renamed.txt",
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 200, "update file should return 200")
    self.assertEqual(
      resp.json()["original_name"], "renamed.txt", "original_name should be updated"
    )

  def test_update_file_not_found(self):
    """PUT /api/v1/files/{id} should return 404 for nonexistent file."""
    from uuid import uuid4

    resp = self.client.put(
      f"/api/v1/files/{uuid4()}",
      json={
        "original_name": "new",
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 404, "nonexistent file should return 404")

  def test_delete_file(self):
    """DELETE /api/v1/files/{id} should soft-delete a file."""
    upload_resp = self.client.post(
      "/api/v1/files",
      files={
        "file": ("delete-me.txt", BytesIO(b"bye"), "text/plain"),
      },
      headers=self._auth_headers(self.token),
    )
    file_id = upload_resp.json()["id"]

    resp = self.client.delete(
      f"/api/v1/files/{file_id}", headers=self._auth_headers(self.token)
    )
    self.assertEqual(resp.status_code, 204, "delete file should return 204")

  def test_delete_file_not_found(self):
    """DELETE /api/v1/files/{id} should return 404 for nonexistent file."""
    from uuid import uuid4

    resp = self.client.delete(
      f"/api/v1/files/{uuid4()}", headers=self._auth_headers(self.token)
    )
    self.assertEqual(resp.status_code, 404, "nonexistent file should return 404")

  def test_restore_file_not_found(self):
    """POST /api/v1/files/{id}/restore should return 404."""
    from uuid import uuid4

    resp = self.client.post(
      f"/api/v1/files/{uuid4()}/restore", headers=self._auth_headers(self.token)
    )
    self.assertEqual(
      resp.status_code, 404, "nonexistent file restore should return 404"
    )

  def test_download_file(self):
    """GET /api/v1/files/{id} should return file download."""
    file_id = self._upload_text_file("download.txt")
    resp = self.client.get(
      f"/api/v1/files/{file_id}",
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 200, "download file should return 200")

  def test_download_file_not_found(self):
    """GET /api/v1/files/{id} should return 404 for nonexistent file."""
    from uuid import uuid4

    resp = self.client.get(
      f"/api/v1/files/{uuid4()}",
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(
      resp.status_code, 404, "nonexistent file download should return 404"
    )

  def test_preview_file_no_preview(self):
    """GET /api/v1/files/{id}/preview should return 404 when no preview exists."""
    file_id = self._upload_text_file("nopreview.txt")
    resp = self.client.get(
      f"/api/v1/files/{file_id}/preview",
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 404, "no preview should return 404")

  def test_delete_file_permanent(self):
    """DELETE /api/v1/files/{id}?permanent=true should hard-delete."""
    file_id = self._upload_text_file("permdelete.txt")
    resp = self.client.delete(
      f"/api/v1/files/{file_id}?permanent=true",
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 204, "permanent delete should return 204")

  def _upload_jpeg_file(self, filename="photo.jpg"):
    """Upload a real JPEG image and return its file_id."""
    from io import BytesIO

    from PIL import Image

    img = Image.new("RGB", (50, 50), color="red")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    resp = self.client.post(
      "/api/v1/files",
      files={
        "file": (filename, buf, "image/jpeg"),
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 201, "JPEG upload should return 201")
    return resp.json()["id"]

  def test_preview_file_with_image(self):
    """GET /api/v1/files/{id}/preview should return preview for image."""
    file_id = self._upload_jpeg_file("preview-me.jpg")
    resp = self.client.get(
      f"/api/v1/files/{file_id}/preview",
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 200, "image preview should return 200")
    self.assertIn("content-type", resp.headers)
    self.assertEqual(resp.headers["content-type"], "image/jpeg")


class TestFolderEndpoints(ApiTestCase):
  def setUp(self):
    super().setUp()
    self.token = self._register_and_login(email="foldertest@test.com")

  def _create_test_folder(self, name="TestFolder"):
    resp = self.client.post(
      "/api/v1/folders",
      json={"name": name},
      headers=self._auth_headers(self.token),
    )
    return resp.json()["id"]

  def test_create_folder(self):
    """POST /api/v1/folders should create a folder."""
    resp = self.client.post(
      "/api/v1/folders",
      json={
        "name": "My Folder",
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 201, "folder creation should return 201")
    data = resp.json()
    self.assertEqual(data["name"], "My Folder", "folder name should match")

  def test_create_folder_with_parent(self):
    """POST /api/v1/folders with parent_id should create a child folder."""
    parent_resp = self.client.post(
      "/api/v1/folders",
      json={
        "name": "ParentFolder",
      },
      headers=self._auth_headers(self.token),
    )
    parent_id = parent_resp.json()["id"]

    resp = self.client.post(
      "/api/v1/folders",
      json={
        "name": "ChildFolder",
        "parent_id": parent_id,
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 201, "child folder creation should return 201")
    self.assertEqual(resp.json()["parent_id"], parent_id, "parent_id should match")

  def test_create_folder_without_auth(self):
    """POST /api/v1/folders should reject without auth."""
    resp = self.client.post("/api/v1/folders", json={"name": "Folder"})
    self.assertEqual(resp.status_code, 401, "missing auth should return 401")

  def test_list_folders(self):
    """GET /api/v1/folders should list user's folders."""
    resp = self.client.get("/api/v1/folders", headers=self._auth_headers(self.token))
    self.assertEqual(resp.status_code, 200, "list folders should return 200")

  def test_update_folder(self):
    """PUT /api/v1/folders/{id} should update a folder."""
    create_resp = self.client.post(
      "/api/v1/folders",
      json={
        "name": "OldName",
      },
      headers=self._auth_headers(self.token),
    )
    folder_id = create_resp.json()["id"]

    resp = self.client.put(
      f"/api/v1/folders/{folder_id}",
      json={
        "name": "NewName",
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 200, "update folder should return 200")
    self.assertEqual(resp.json()["name"], "NewName", "folder name should be updated")

  def test_update_folder_not_found(self):
    """PUT /api/v1/folders/{id} should return 404."""
    from uuid import uuid4

    resp = self.client.put(
      f"/api/v1/folders/{uuid4()}",
      json={
        "name": "New",
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 404, "nonexistent folder should return 404")

  def test_delete_folder(self):
    """DELETE /api/v1/folders/{id} should soft-delete a folder."""
    create_resp = self.client.post(
      "/api/v1/folders",
      json={
        "name": "ToDelete",
      },
      headers=self._auth_headers(self.token),
    )
    folder_id = create_resp.json()["id"]

    resp = self.client.delete(
      f"/api/v1/folders/{folder_id}", headers=self._auth_headers(self.token)
    )
    self.assertEqual(resp.status_code, 204, "delete folder should return 204")

  def test_delete_folder_not_found(self):
    """DELETE /api/v1/folders/{id} should return 404."""
    from uuid import uuid4

    resp = self.client.delete(
      f"/api/v1/folders/{uuid4()}", headers=self._auth_headers(self.token)
    )
    self.assertEqual(resp.status_code, 404, "nonexistent folder should return 404")

  def test_list_folders_with_deleted(self):
    """GET /api/v1/folders?deleted=true should list deleted folders."""
    resp = self.client.get(
      "/api/v1/folders?deleted=true", headers=self._auth_headers(self.token)
    )
    self.assertEqual(resp.status_code, 200, "list deleted folders should return 200")

  def test_restore_folder(self):
    """POST /api/v1/folders/{id}/restore should restore a deleted folder."""
    folder_id = self._create_test_folder("RestoreMe")

    self.client.delete(
      f"/api/v1/folders/{folder_id}",
      headers=self._auth_headers(self.token),
    )

    resp = self.client.post(
      f"/api/v1/folders/{folder_id}/restore",
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 200, "restore folder should return 200")


class TestLinkEndpoints(ApiTestCase):
  def setUp(self):
    super().setUp()
    self.token = self._register_and_login(email="linktest@test.com")
    self._create_test_file()

  def _create_test_file(self):
    self.client.post(
      "/api/v1/files",
      files={
        "file": ("test.txt", BytesIO(b"hello"), "text/plain"),
      },
      headers=self._auth_headers(self.token),
    )
    files_resp = self.client.get(
      "/api/v1/files", headers=self._auth_headers(self.token)
    )
    files = files_resp.json()
    if files:
      self.file_id = files[0]["id"]
    else:
      self.file_id = None

  def _create_test_link(self, token_name=None):
    if not self.file_id:
      self.skipTest("no file available")
    resp = self.client.post(
      "/api/v1/share",
      json={"files": [self.file_id]},
      headers=self._auth_headers(self.token),
    )
    return resp.json()["access_token"]

  def test_create_share_link(self):
    """POST /api/v1/share should create a share link."""
    if not self.file_id:
      self.skipTest("no file available")
    resp = self.client.post(
      "/api/v1/share",
      json={
        "files": [self.file_id],
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 200, "share link creation should return 200")
    data = resp.json()
    self.assertIn("access_token", data, "response should contain access_token")

  def test_create_share_link_no_files_or_folders(self):
    """POST /api/v1/share should reject empty link with 422."""
    resp = self.client.post(
      "/api/v1/share", json={}, headers=self._auth_headers(self.token)
    )
    self.assertEqual(resp.status_code, 422, "empty share link should return 422")

  def test_get_share_link_info(self):
    """GET /api/v1/share/{token} should return link info."""
    if not self.file_id:
      self.skipTest("no file available")
    create_resp = self.client.post(
      "/api/v1/share",
      json={
        "files": [self.file_id],
      },
      headers=self._auth_headers(self.token),
    )
    token = create_resp.json()["access_token"]

    resp = self.client.get(f"/api/v1/share/{token}")
    self.assertEqual(resp.status_code, 200, "get share link should return 200")
    self.assertEqual(resp.json()["token"], token, "token should match")

  def test_get_share_link_nonexistent(self):
    """GET /api/v1/share/{token} should return 404 for unknown token."""
    resp = self.client.get("/api/v1/share/nonexistent")
    self.assertEqual(resp.status_code, 404, "unknown token should return 404")

  def test_list_user_links(self):
    """GET /api/v1/share/user/{user_id} should reject listing other user's links."""
    from uuid import uuid4

    resp = self.client.get(
      f"/api/v1/share/user/{uuid4()}", headers=self._auth_headers(self.token)
    )
    self.assertEqual(
      resp.status_code, 403, "listing other user's links should return 403"
    )

  def test_update_link_name_not_found(self):
    """PUT /api/v1/share/{token} should return 404 for unknown token."""
    resp = self.client.put(
      "/api/v1/share/nonexistent",
      json={
        "custom_name": "new-name",
      },
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 404, "unknown token should return 404")

  def test_update_link_name(self):
    """PUT /api/v1/share/{token} should update link custom_name."""
    if not self.file_id:
      self.skipTest("no file available")
    share_token = self._create_test_link()
    resp = self.client.put(
      f"/api/v1/share/{share_token}",
      json={"custom_name": "my-link"},
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 200, "update link should return 200")

  def test_delete_link_not_found(self):
    """DELETE /api/v1/share/{token} should return 404."""
    resp = self.client.delete(
      "/api/v1/share/nonexistent", headers=self._auth_headers(self.token)
    )
    self.assertEqual(resp.status_code, 404, "unknown token should return 404")

  def test_download_shared_file(self):
    """GET /api/v1/share/{token}/{file_id} should stream the shared file."""
    if not self.file_id:
      self.skipTest("no file available")
    share_token = self._create_test_link()
    resp = self.client.get(f"/api/v1/share/{share_token}/{self.file_id}")
    self.assertEqual(resp.status_code, 200, "download shared file should return 200")

  def test_preview_shared_file_no_preview(self):
    """GET /api/v1/share/{token}/preview/{file_id} should return 404 when no preview."""
    if not self.file_id:
      self.skipTest("no file available")
    share_token = self._create_test_link()
    resp = self.client.get(f"/api/v1/share/{share_token}/preview/{self.file_id}")
    self.assertEqual(resp.status_code, 404, "no preview should return 404")

  def test_preview_shared_file_with_image(self):
    """GET /api/v1/share/{token}/preview/{file_id} should return preview for image."""
    from io import BytesIO

    from PIL import Image

    img = Image.new("RGB", (50, 50), color="green")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    upload_resp = self.client.post(
      "/api/v1/files",
      files={"file": ("sharepreview.jpg", buf, "image/jpeg")},
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(upload_resp.status_code, 201, "image upload should succeed")
    img_file_id = upload_resp.json()["id"]

    share_token = self._create_test_link_for_file(img_file_id)

    resp = self.client.get(f"/api/v1/share/{share_token}/preview/{img_file_id}")
    self.assertEqual(resp.status_code, 200, "shared image preview should return 200")

  def _create_test_link_for_file(self, file_id):
    resp = self.client.post(
      "/api/v1/share",
      json={"files": [file_id]},
      headers=self._auth_headers(self.token),
    )
    return resp.json()["access_token"]

  def test_clone_shared_objects(self):
    """POST /api/v1/share/{token}/files/clone should clone shared objects."""
    if not self.file_id:
      self.skipTest("no file available")
    share_token = self._create_test_link()
    resp = self.client.post(
      f"/api/v1/share/{share_token}/files/clone",
      json={"files": [self.file_id]},
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 201, "clone should return 201")

  def test_restore_link(self):
    """POST /api/v1/share/{token}/restore should restore/reset a link."""
    if not self.file_id:
      self.skipTest("no file available")
    share_token = self._create_test_link()

    resp = self.client.post(
      f"/api/v1/share/{share_token}/restore",
      headers=self._auth_headers(self.token),
    )
    self.assertEqual(resp.status_code, 200, "restore link should return 200")


if __name__ == "__main__":
  unittest.main()
