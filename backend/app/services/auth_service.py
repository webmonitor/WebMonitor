"""
认证与授权：密码哈希、JWT 签发与依赖注入。

职责边界：
- 密码/令牌相关的纯函数在这里；
- 用户 CRUD 在 `db/crud.py`；
- 权限判定只依据数据库里的用户记录，令牌里的声明不参与授权。
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.passwords import validate_password
from ..db.database import get_db
from ..db.models import User
from ..schemas.schemas import UserResponse

# 同源发布：tokenUrl 必须带 /api 前缀，Swagger 的 Authorize 才能直接登录。
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码；任何异常（含超长密码、损坏哈希）都视为验证失败。"""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError, UnicodeEncodeError):
        return False


def get_password_hash(password: str) -> str:
    """生成密码哈希。

    不做截断：超过 bcrypt 的 72 字节上限时 `validate_password` 会直接报错，
    由调用方转成 422 或启动失败，而不是悄悄改掉用户的密码。
    """
    validate_password(password)
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """按用户名+密码取用户；停用账户同样按凭据错误处理。"""
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY.get_secret_value(),
        algorithm=settings.ALGORITHM,
    )


def _unauthorized(detail: str = "无法验证凭据") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """解析令牌并加载用户；令牌里的 is_admin 不可信。"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM],
        )
    except JWTError as exc:
        raise _unauthorized() from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.isdigit():
        raise _unauthorized()

    user_id = int(subject)
    if user_id <= 0:
        raise _unauthorized()

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise _unauthorized()
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """获取当前活跃用户；停用账户的既有令牌返回 403。"""
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="用户已停用")
    return current_user


def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """获取当前管理员用户"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return current_user


class AuthService:
    """认证服务：只负责登录。"""

    def login(self, db: Session, username: str, password: str) -> dict:
        """用户登录；用户名不存在、密码错误、账户停用都返回同一个 401。"""
        user = authenticate_user(db, username, password)
        if not user:
            raise _unauthorized("用户名或密码错误")

        access_token = create_access_token(
            data={"sub": str(user.id), "username": user.username},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        }
