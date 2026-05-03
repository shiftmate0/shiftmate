from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
import re

from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password, create_access_token, hash_password
from app.core.database import get_db
from app.dependencies.auth import get_current_user

router = APIRouter()


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login", response_model=TokenResponse, summary="로그인")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.employee_no == request.employee_no).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사번 또는 비밀번호가 올바르지 않습니다",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비활성화된 계정입니다",
        )

    if not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사번 또는 비밀번호가 올바르지 않습니다",
        )

    access_token = create_access_token(
        data={"sub": str(user.user_id), "role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "name": user.name,
        "role": user.role,
        "is_initial_password": user.is_initial_password,
        "employee_no": user.employee_no,
        "years_of_experience": user.years_of_experience,
    }


@router.post("/logout", summary="로그아웃")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "로그아웃되었습니다"}


@router.get("/me", summary="내 정보 조회")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "role": current_user.role,
        "is_initial_password": current_user.is_initial_password,
        "employee_no": current_user.employee_no,
        "years_of_experience": current_user.years_of_experience,
        "is_active": current_user.is_active,
    }


@router.put("/password", summary="비밀번호 변경")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다")

    if not re.match(r'^(?=.*[a-zA-Z])(?=.*\d).{8,}$', request.new_password):
        raise HTTPException(
            status_code=400,
            detail="비밀번호는 최소 8자, 영문+숫자 조합이어야 합니다",
        )

    current_user.password = hash_password(request.new_password)
    current_user.is_initial_password = False
    db.commit()

    return {"message": "비밀번호가 변경되었습니다"}
