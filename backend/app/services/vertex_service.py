import json
import os
from google.cloud import aiplatform
from google.cloud.aiplatform.gapic import PredictionServiceClient
from fastapi import HTTPException
from app.utils.logger import logger
import vertexai
from google.oauth2 import service_account
from vertexai.generative_models import GenerativeModel, Part
import time
from dotenv import load_dotenv

load_dotenv()

gcp_project_id_str = os.getenv("GOOGLE_CLOUD_PROJECT")

current_path = os.path.dirname(os.path.abspath(__file__))
credentials_path = os.path.join(
    current_path, "credentials", "ai-interview-poc-2b5cf8540f16.json"
)

# Load credentials
credentials = service_account.Credentials.from_service_account_file(credentials_path)

vertexai.init(
    project=gcp_project_id_str, credentials=credentials, location="us-central1"
)
model = GenerativeModel("gemini-2.0-flash")


async def analyze_video(
    video_url: str, job_description: str, questions: list[str]
) -> dict:
    # Validate questions
    if not questions or not isinstance(questions, list):
        logger.error("No valid questions provided")
        raise HTTPException(
            status_code=400, detail="Questions must be a non-empty list of strings"
        )

    questions_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(questions)])

    print(questions_text)

    # Determine MIME type
    mime_type = "video/mp4"

    # Construct prompt
    prompt = f"""
You are an expert AI interviewer analyzing a candidate's video response for a {job_description} role. 
The video is hosted at an S3 URL: {video_url}.

The candidate is responding to the following interview questions:
{questions_text}

Make sure to:
Fetch the every questions and answers from the video. Question Number is on the left top corner of the video (region: x=10, y=10, width=200, height=40).
Detect question numbers (e.g., "Question 1", "Question 2", etc) and extract their timestamps to segment the video.
Map each detected "Question X" to the corresponding question in the provided list (e.g., "Question 1" to the first question).
Fetch each answer from the video segment starting at the question numbers timestamp until the next question number or video end.

For each question:
1. Transcribe the candidate's answer from the video.
2. Assign a score (0-100) based on accuracy, relevance, and clarity.
3. Analyze body language (e.g., posture, gestures, eye contact).
4. Analyze communication (e.g., tone, fluency, confidence).
5. Estimate time consumed (in seconds) for the response.

If a question is not answered, return an empty answer with a score of 0.

Additionally:
- Generate 3 insights (25 words or less each) highlighting user feedback from the responses, focusing on strengths or areas for improvement.
- Analyze communication skills across the transcript, providing:
  - A communication score (0-10).
  - A 2-3 sentence overall feedback summary.
  - Supporting quotes with analysis (strengths and improvement areas).
  - Lists of strengths and improvement areas.

Return a JSON object with:
- A 'questions' array containing, for each question:
  - 'question': The question text.
  - 'answer': The transcribed answer (or empty string if unanswered).
  - 'score': The score (0-100).
  - 'body_language': Description of body language (or empty string if unanswered).
  - 'communication': Description of communication (or empty string if unanswered).
  - 'time_consumed_seconds': Time taken to answer (or 0 if unanswered).
- An 'overall_score' (0-100) based on all responses, weighted by answered questions.
- An 'insights' array with 3 feedback insights.
- A 'communication' object with:
  - 'score': Communication score (0-10).
  - 'overallFeedback': Summary feedback.
  - 'supportingQuotes': Array of quotes with analysis and type (strength/improvement_area).
  - 'strengths': List of strengths.
  - 'improvementAreas': List of improvement areas.

Example output:
{{
  "questions": [
    {{
      "question": "Tell me about yourself.",
      "answer": "I'm a software engineer with 5 years of experience in Python and React.",
      "score": 85,
      "body_language": "Maintains good eye contact, upright posture.",
      "communication": "Clear and confident tone, minimal filler words.",
      "time_consumed_seconds": 45.2
    }},
    {{
      "question": "What is your experience with Python?",
      "answer": "Answer from User",
      "score": 95,
      "body_language": "Maintains good eye contact, upright posture.",
      "communication": "Clear and confident tone, minimal filler words.",
      "time_consumed_seconds": 90
    }}
  ],
  "overall_score": 85,
  "insights": [
    "Strong technical knowledge in Python demonstrated.",
    "Needs to reduce filler words for clarity.",
    "Confident delivery in behavioral questions."
  ],
  "communication": {{
    "score": 8,
    "overallFeedback": "The candidate communicates clearly with confidence. Minor filler words detected.",
    "supportingQuotes": [
      {{
        "quote": "I led a team to deliver a Python project.",
        "analysis": "Shows leadership and clarity.",
        "type": "strength"
      }},
      {{
        "quote": "Um, I think I can, uh, do that.",
        "analysis": "Filler words reduce fluency.",
        "type": "improvement_area"
      }}
    ],
    "strengths": ["Confident tone", "Clear articulation"],
    "improvementAreas": ["Reduce filler words", "Improve pacing"]
  }}
}}
"""

    print(prompt)

    # Analyze video
    try:
        start_time = time.time()
        response = model.generate_content(
            contents=[
                prompt,
                Part.from_uri(video_url, mime_type),
            ]
        )
        end_time = time.time()

        print(response.text)

        # Process response
        try:
            if response.text.strip().startswith("```json"):
                cleaned = response.text.strip("`").strip("json").strip()
            else:
                cleaned = response.text

            parsed_json = json.loads(cleaned)

            result = parsed_json

            if (
                not isinstance(result, dict)
                or "questions" not in result
                or "overall_score" not in result
            ):
                raise ValueError("Invalid response format")

            # Add time_consumed_seconds if not provided
            for q in result["questions"]:
                if "time_consumed_seconds" not in q:
                    q["time_consumed_seconds"] = (
                        0
                        if not q["answer"]
                        else (end_time - start_time) / len(questions)
                    )

            logger.info(f"Video analysis completed for {video_url}")
            return result
        except (ValueError, json.JSONDecodeError) as e:
            logger.error(f"Invalid Vertex AI response: {str(e)}")
            raise HTTPException(status_code=500, detail="Invalid analysis response")
    except Exception as e:
        logger.error(f"Vertex AI error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze video")
