import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")


def extract_json(text: str):
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group()
    return text


def generate_node_content(title: str):

    prompt = f"""
You are an academic knowledge generator.

Generate structured knowledge for the topic:

{title}

Return ONLY valid JSON in this format:

{{
 "definition": "",
 "explanation": "",
 "example": "",
 "application": "",
 "mistake": ""
}}
"""

    try:

        response = model.generate_content(prompt)

        text = response.text.strip()

        text = text.replace("```json", "").replace("```", "")

        text = extract_json(text)

        data = json.loads(text)

        return data

    except Exception as e:

        return {
            "definition": "Error generating definition",
            "explanation": str(e),
            "example": "",
            "application": "",
            "mistake": ""
        }