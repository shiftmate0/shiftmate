from fastapi import FastAPI
from app.api import schedules

app = FastAPI()

app.include_router(schedules.router)

@app.get("/")
def root():
    return {"message": "server ok"}