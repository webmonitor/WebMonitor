from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def create_database_engine(database_url: str, *, debug: bool) -> Engine:
    """创建同步引擎；SQLite 每个连接都显式启用外键约束。"""
    is_sqlite = make_url(database_url).get_backend_name() == "sqlite"
    database_engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if is_sqlite else {},
        echo=debug,
        hide_parameters=True,
    )
    if is_sqlite:
        @event.listens_for(database_engine, "connect")
        def _enable_foreign_keys(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA foreign_keys=ON")
            finally:
                cursor.close()
    return database_engine


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