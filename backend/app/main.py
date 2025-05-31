from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, interview
from app.utils.logger import logger
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="AI Mock Interview Platform", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update to your production frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
try:
    client = MongoClient(
        os.getenv("MONGODB_URI"),
        serverSelectionTimeoutMS=5000,
        maxPoolSize=50,
        minPoolSize=10,
    )
    print(os.getenv("MONGODB_URI"))
    client.admin.command('ping')  # Health check
    db = client["interview_ai"]  # Automatically uses the database specified in MONGODB_URI
    logger.info("Connected to MongoDB Atlas")
except ConnectionFailure as e:
    logger.error(f"Failed to connect to MongoDB Atlas: {str(e)}")
    raise Exception("MongoDB connection failed")

# Include Routes
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    # Ensure MongoDB indexes
    db.users.create_index("email", unique=True)
    db.sessions.create_index("user_id")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown")
    client.close()

@app.get("/")
async def root():
    return {"message": "AI Mock Interview Platform"}