# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password, create_access_token, hash_password
from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db

router = APIRouter(tags=["auth"])


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


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
            "is_initial_password": user.is_initial_password,
        },
    }


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "로그아웃 되었습니다. 클라이언트의 인증 정보를 삭제하세요."}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "employee_no": current_user.employee_no,
        "role": current_user.role,
        "years_of_experience": current_user.years_of_experience,
        "is_initial_password": current_user.is_initial_password,
    }


@router.put("/password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 일치하지 않습니다.")

    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="비밀번호는 최소 8자 이상이어야 합니다.")

    has_alpha = any(c.isalpha() for c in request.new_password)
    has_digit = any(c.isdigit() for c in request.new_password)
    if not (has_alpha and has_digit):
        raise HTTPException(status_code=400, detail="비밀번호는 영문자와 숫자를 포함해야 합니다.")

    current_user.password = hash_password(request.new_password)
    current_user.is_initial_password = False
    db.commit()

    return {"message": "비밀번호가 변경되었습니다."}
