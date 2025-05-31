from pydantic import BaseModel, Field
from typing import List, Optional

class InterviewRequest(BaseModel):
    job_description: str
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    num_questions: int = Field(..., ge=1, le=10)

class InterviewSession(BaseModel):
    user_id: str
    job_description: str
    difficulty: str
    num_questions: int
    questions: List[str]
    video_url: Optional[str] = None
    analytics: Optional[dict] = None