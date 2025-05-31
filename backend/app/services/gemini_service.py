import requests
import json
import os
from fastapi import HTTPException
from app.utils.logger import logger
from google import genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

async def generate_questions(job_description: str, difficulty: str, num_questions: int) -> list:
    try:
        prompt = f"""Generate {num_questions} interview questions for a {job_description} role at {difficulty} difficulty.
        Always include a mix of technical and behavioral questions.
        Each question should be clear and concise, suitable for a professional interview setting.
        The questions should be relevant to the job description provided.
        Format the output as a JSON array of questions and return valid json. Format is:
        [
            {"Question text"},
            {"Question text"}
        ]
        """

        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        print(response.text)
        if response.text.startswith("```json"):
            cleaned = response.text.strip("`").strip("json").strip()
        else:
            cleaned = response.text
        parsed_json = json.loads(cleaned)
        print(parsed_json)
        logger.info(f"Generated {len(parsed_json)} questions for {job_description}")
        return parsed_json
    except requests.RequestException as e:
        logger.error(f"Gemini API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate questions")