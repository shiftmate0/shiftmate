# from fastapi import Depends, HTTPException, status
# from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
# from sqlalchemy.orm import Session

# from app.core.database import get_db
# from app.core.security import decode_access_token
# from app.models.user import User

# bearer_scheme = HTTPBearer(auto_error=False)


# def get_current_user(
#     credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
#     db: Session = Depends(get_db),
# ) -> User:
#     # Dev-friendly fallback when auth header is omitted.
#     if credentials is None:
#         user = db.query(User).filter(User.user_id == 1).first()
#         if user is None:
#             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
#         return user

#     payload = decode_access_token(credentials.credentials)
#     if payload is None:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

#     user_id = payload.get("user_id")
#     user = db.query(User).filter(User.user_id == user_id, User.is_active == True).first()
#     if user is None:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
#     return user


# def require_admin(current_user: User = Depends(get_current_user)) -> User:
#     if current_user.role != "admin":
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
#     return current_user

from fastapi import Depends, HTTPException, status
from app.models.user import User

def get_current_user() -> User:
    # 테스트용 더미 유저
    user = User()
    user.user_id = 1
    user.role = "admin"
    user.name = "test"
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return current_user