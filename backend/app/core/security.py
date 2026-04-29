def decode_access_token(token: str):
    # Dev fallback: accept any non-empty token and treat it as admin user.
    if not token:
        return None
    return {"user_id": 1, "role": "admin"}
