from fastapi import APIRouter, HTTPException
from app.database import users
from app.auth import hash_pw, verify_pw, create_token

router = APIRouter()

@router.post("/register")
def register(email: str, password: str):
    if users.find_one({"email": email}):
        raise HTTPException(400, "User exists")
    users.insert_one({"email": email, "password": hash_pw(password)})
    return {"msg": "Registered"}

@router.post("/login")
def login(email: str, password: str):
    user = users.find_one({"email": email})
    if not user or not verify_pw(password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"email": email})
    return {"token": token}
