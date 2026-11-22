from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def create_database_engine(database_url: str, *, debug: bool) -> Engine:
    """创建同步引擎；DEBUG 可以记录 SQL，但绑定参数永远不进入日志。"""
    return create_engine(
        database_url,
        connect_args={"check_same_thread": False},
        echo=debug,
        hide_parameters=True,
    )


# 创建数据库引擎
engine = create_database_engine(settings.DATABASE_URL, debug=settings.DEBUG)

# 创建SessionLocal类
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建Base类
Base = declarative_base()

# 依赖项：获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()