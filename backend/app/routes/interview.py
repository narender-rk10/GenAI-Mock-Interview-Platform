from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.models.interview import InterviewRequest, InterviewSession
from app.utils.auth import get_current_user
from app.services.gemini_service import generate_questions
from app.services.s3_service import upload_video
from app.services.vertex_service import analyze_video
from app.utils.logger import logger
from pymongo import MongoClient
import os

from dotenv import load_dotenv
load_dotenv()

router = APIRouter()
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["interview_ai"]


@router.post("/generate-questions")
async def generate_questions_endpoint(
    request: InterviewRequest, current_user: str = Depends(get_current_user)
):
    try:
        questions = await generate_questions(
            request.job_description, request.difficulty, request.num_questions
        )
        session = InterviewSession(
            user_id=current_user,
            job_description=request.job_description,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            questions=questions,
        )
        result = db.sessions.insert_one(session.dict())
        session_id = str(result.inserted_id)
        logger.info(
            f"Interview session created for user: {current_user}, session_id: {session_id}"
        )
        return {"questions": questions, "session_id": session_id}
    except Exception as e:
        logger.error(f"Generate questions error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate questions")


@router.post("/upload-video")
async def upload_video_endpoint(
    file: UploadFile = File(...), current_user: str = Depends(get_current_user)
):
    try:
        video_url = await upload_video(file.file, current_user)
        session = db.sessions.find_one(
            {"user_id": current_user, "video_url": None}, sort=[("_id", -1)]
        )
        if not session:
            raise HTTPException(
                status_code=400, detail="No pending interview session found"
            )

        questions = session.get("questions", [])
        job_description = session.get("job_description", "Unknown Role")

        if not questions:
            raise HTTPException(status_code=400, detail="No questions found in session")

        analytics = await analyze_video(
            video_url=video_url,
            job_description=job_description,
            questions=questions,
        )

        db.sessions.update_one(
            {"_id": session["_id"]},
            {"$set": {"video_url": video_url, "analytics": analytics}},
        )

        logger.info(
            f"Video uploaded and analyzed for user: {current_user}, session_id: {str(session['_id'])}"
        )
        return {"video_url": video_url, "analytics": analytics}
    except HTTPException as e:
        logger.error(f"Upload video error: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Upload video error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload video")


@router.get("/dashboard")
async def get_dashboard(current_user: str = Depends(get_current_user)):
    try:
        sessions = list(db.sessions.find({"user_id": current_user}))
        if not sessions:
            logger.info(f"No sessions found for user: {current_user}")
            return {"sessions": [], "message": "No interview sessions found"}

        formatted_sessions = []
        for session in sessions:
            formatted_session = {
                "session_id": str(session["_id"]),
                "job_description": session.get("job_description", "Unknown Role"),
                "difficulty": session.get("difficulty", "Unknown"),
                "num_questions": session.get("num_questions", 0),
                "questions": session.get("questions", []),
                "video_url": session.get("video_url"),
                "analytics": session.get("analytics"),
                "created_at": session.get(
                    "_id"
                ).generation_time.isoformat(),  # MongoDB timestamp
            }
            formatted_sessions.append(formatted_session)

        logger.info(
            f"Dashboard data retrieved for user: {current_user}, sessions: {len(formatted_sessions)}"
        )
        return {"sessions": formatted_sessions}
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard data")
