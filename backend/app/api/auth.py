from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse

from app.core.security import (
    verify_password, 
    create_access_token,
)
from app.dependencies.database import get_db

router = APIRouter(tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.employee_no == request.employee_no).first()

    if not user or not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사번 또는 비밀번호가 일치하지 않습니다.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비활성화된 계정입니다. 관리자에게 문의하세요.",
        )

    access_token = create_access_token(
        data={"sub": str(user.user_id), "role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "employee_no": user.employee_no,
            "role": user.role,
            "years_of_experience": user.years_of_experience,
            "is_initial_password": user.is_initial_password
        }
    }

# TODO: POST /api/auth/logout
# TODO: GET  /api/auth/me
# TODO: PUT  /api/auth/password
