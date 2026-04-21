"""
Groq AI Service for content generation.
Handles all Groq API interactions with proper error handling and retry logic.
"""

import os
import json
import re
import time
from groq import Groq
from dotenv import load_dotenv

# Configure Groq
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "openai/gpt-oss-120b")

client = Groq(api_key=GROQ_API_KEY)

# Model configuration
GENERATION_CONFIG = {
    "temperature": 0.7,
    "max_tokens": 2048,
}


def extract_json(text: str):
    """
    Extract JSON safely from AI response.
    Supports dict, list, or raw string.
    """

    # 1. Try code block JSON
    json_patterns = [
        r'```json\s*([\s\S]*?)\s*```',
        r'```\s*([\s\S]*?)\s*```',
    ]

    for pattern in json_patterns:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except:
                continue

    # 2. Try full text JSON
    try:
        return json.loads(text.strip())
    except:
        pass

    # 3. Try extracting object or array
    patterns = [r'\{[\s\S]*\}', r'\[[\s\S]*\]']
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group())
            except:
                continue

    # 🔥 FINAL FALLBACK (IMPORTANT FIX)
    # Return RAW TEXT instead of forcing dict
    return text.strip()


def safe_generate(prompt: str, max_retries: int = 3, retry_delay: float = 1.0) -> str:
    """
    Generate content with retry logic and error handling.
    """

    last_error = None

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise academic AI that ALWAYS returns clean JSON output."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=GENERATION_CONFIG["temperature"],
                max_tokens=GENERATION_CONFIG["max_tokens"],
            )

            text = response.choices[0].message.content

            if text:
                return text.strip()

            raise ValueError("Empty response from Groq")

        except Exception as e:
            last_error = e

            if attempt < max_retries - 1:
                time.sleep(retry_delay * (2 ** attempt))  # exponential backoff
                continue

    raise last_error or ValueError("Failed to generate content")


def generate_content(prompt: str):
    """
    Generate content and parse as JSON.
    Supports flexible AI output formats (dict, list, string).
    """

    text = safe_generate(prompt)
    result = extract_json(text)

    # ✅ PRESERVE LISTS (CRITICAL FIX)
    if isinstance(result, list):
        return result

    # ✅ HANDLE DICT (normal case)
    if isinstance(result, dict):
        return result

    # 🔥 FALLBACK ONLY IF STRING / UNKNOWN
    return {
        "definition": str(result),
        "explanation": str(result),
        "example": str(result),
        "application": str(result),
        "mistake": str(result)
    }