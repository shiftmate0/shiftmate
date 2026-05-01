from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# 1. 데이터베이스 엔진 생성
# settings.DATABASE_URL은 .env 또는 config.py에 정의된 mysql 접속 주소를 사용합니다.
engine = create_engine(settings.DATABASE_URL)

# 2. 세션 팩토리 생성
# autocommit=False: 명시적으로 db.commit()을 호출할 때만 저장되도록 설정
# autoflush=False: 쿼리 실행 전 자동 플러시 비활성화 (성능 및 제어 목적)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. 모델에서 상속받을 Base 클래스
# (참고: 보통 models/ 폴더 내 파일들이 이 Base를 상속받아 테이블을 정의합니다.)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입을 위한 데이터베이스 세션 생성 함수입니다.
    API 호출 시 세션을 열고, 작업이 완료되거나 에러가 발생하면 반드시 세션을 닫습니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()