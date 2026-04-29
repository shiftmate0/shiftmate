from pydantic import BaseModel

class LoginRequest(BaseModel):
    employee_no: str
    password: str

class UserLoginInfo(BaseModel):
    user_id: int
    name: str
    employee_no: str
    role: str
    years_of_experience: int
    is_initial_password: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserLoginInfo