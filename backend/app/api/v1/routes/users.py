from fastapi import APIRouter, Depends, Response
from app.schemas.params import UserParams as Params
from app.api.dependencies import get_user_service
from app.services.user_service import UserService as Service

router = APIRouter(prefix="/users", tags=["users"])

@router.post("")
def create_user(params: Params = Depends(Params), service:  Service = Depends(get_user_service)):
  service.create_user(params)
