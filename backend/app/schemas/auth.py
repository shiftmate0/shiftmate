from pydantic import BaseModel


class LoginRequest(BaseModel):
    employee_no: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
    role: str
    is_initial_password: bool
    employee_no: str
    years_of_experience: int
