from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import User, Token
from app.utils.auth import create_access_token, get_current_user
from app.utils.logger import logger
from pymongo import MongoClient
from passlib.context import CryptContext
import os

from dotenv import load_dotenv
load_dotenv()

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["interview_ai"]

@router.post("/register")
async def register(user: User):
    try:
        existing_user = db.users.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        hashed_password = pwd_context.hash(user.password)
        db.users.insert_one({"email": user.email, "password": hashed_password})
        logger.info(f"User registered: {user.email}")
        return {"message": "User registered successfully"}
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = db.users.find_one({"email": form_data.username})
        if not user or not pwd_context.verify(form_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        access_token = create_access_token(data={"sub": user["email"]})
        logger.info(f"User logged in: {user['email']}")
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

@router.get("/me")
async def get_user(current_user: str = Depends(get_current_user)):
    return {"email": current_user}