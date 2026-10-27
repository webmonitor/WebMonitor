"""
应用配置设置
"""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用设置"""

    # 应用基础设置
    APP_NAME: str = "WebMonitor"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # 数据库设置
    DATABASE_URL: str = "sqlite:///./webmonitor.db"

    # 邮件设置
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: int = 465
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    RECEIVER_EMAIL: Optional[str] = None

    # 监控设置
    DEFAULT_CHECK_INTERVAL: int = 300  # 5分钟
    MAX_CHECK_INTERVAL: int = 86400  # 24小时
    MIN_CHECK_INTERVAL: int = 10  # 10秒

    # Selenium设置
    SELENIUM_HEADLESS: bool = True
    SELENIUM_TIMEOUT: int = 30

    # 日志设置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    # JWT设置
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


# 创建全局设置实例
settings = Settings()

def get_settings():
    """获取设置实例"""
    return settings