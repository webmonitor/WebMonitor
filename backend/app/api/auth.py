"""
认证相关API路由。

公开入口只有 `/auth/register`（只接受自助注册字段）与 `/auth/login`；
带角色/额度的创建走管理员专用的 `POST /auth/users`。
"""
from typing import List

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.crud import get_user, get_users
from app.db.database import get_db
from app.db.models import User
from app.schemas.schemas import (
    LoginResponse,
    UserCreate,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from app.services import user_service
from app.services.auth_service import AuthService, get_current_active_user, get_current_admin_user
from app.services.errors import ServiceError

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> User:
    """公开注册：角色与额度固定为普通用户/默认额度。"""
    return user_service.create_user(
        db,
        UserCreate(
            username=payload.username,
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
            is_admin=False,
            is_active=True,
        ),
    )


@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> dict:
    """用户登录"""
    return AuthService().login(db, form_data.username, form_data.password)


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)) -> User:
    """获取当前用户信息"""
    return current_user


@router.get("/users", response_model=List[UserResponse])
def get_user_list(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> List[User]:
    """获取用户列表 (仅管理员)"""
    return get_users(db, skip=skip, limit=limit)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_as_admin(
    payload: UserCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> User:
    """管理员创建用户：可指定角色与订阅额度。"""
    return user_service.create_user(db, payload)


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_info(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> User:
    """获取用户信息 (仅管理员)"""
    user = get_user(db, user_id)
    if user is None:
        raise ServiceError(404, "用户不存在")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_info(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> User:
    """更新用户信息 (仅管理员)"""
    return user_service.update_user(db, user_id, payload)


@router.delete("/users/{user_id}")
def delete_user_account(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    """删除用户 (仅管理员)"""
    if user_id == current_user.id:
        raise ServiceError(400, "不能删除自己的账户")

    user_service.delete_user(db, user_id)
    return {"message": "用户删除成功"}
