"""
应用配置设置。

所有环境变量只在这里读取；业务代码一律 `from .config import settings`。
SECRET_KEY 必填且必须有足够长度：没有开发默认值，避免默认密钥被带到线上。
"""
from typing import Optional

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# 旧版本随代码发布的示例密钥，明确拒绝。
FORBIDDEN_SECRET_KEYS = frozenset(
    {
        "your-secret-key-here-change-in-production",
        "your_very_secure_secret_key_change_in_production",
        "your-secret-key-change-in-production",
    }
)

SECRET_KEY_MIN_LENGTH = 32


class Settings(BaseSettings):
    """应用设置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
        hide_input_in_errors=True,
    )

    # 应用基础设置
    APP_NAME: str = "WebMonitor"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # 数据库设置
    DATABASE_URL: str = "sqlite:///./data/webmonitor.db"

    # 日志设置
    LOG_LEVEL: str = "INFO"

    # JWT设置
    SECRET_KEY: SecretStr
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # 首次启动引导管理员；库里已有管理员时这些值不会被使用
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: Optional[SecretStr] = None

    # 前端构建产物目录（镜像里把 CRA 的 build/ 拷到这里）
    FRONTEND_DIST: str = "web"

    @field_validator("SECRET_KEY")
    @classmethod
    def _validate_secret_key(cls, value: SecretStr) -> SecretStr:
        raw = value.get_secret_value()
        if raw in FORBIDDEN_SECRET_KEYS:
            raise ValueError("SECRET_KEY 不能使用示例值，请生成新的随机密钥")
        if len(raw) < SECRET_KEY_MIN_LENGTH:
            raise ValueError(f"SECRET_KEY 至少需要 {SECRET_KEY_MIN_LENGTH} 个字符")
        return value


# 创建全局设置实例
settings = Settings()
