"""
Gemini AI Service for content generation.
Handles all Gemini API interactions with proper error handling and retry logic.
"""

import json
import re
import time
import google.generativeai as genai
from config import GEMINI_API_KEY

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Model configuration
GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
}

# Initialize the model
model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=GENERATION_CONFIG,
)


def extract_json(text: str) -> dict:
    """
    Extract JSON from text that may contain markdown code blocks.
    Handles various formats like ```json...```, ```...```, or raw JSON.
    """
    # Try to find JSON in code blocks first
    json_patterns = [
        r'```json\s*([\s\S]*?)\s*```',
        r'```\s*([\s\S]*?)\s*```',
    ]
    
    for pattern in json_patterns:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                continue
    
    # Try parsing the entire text as JSON
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON object or array pattern
    json_object_pattern = r'\{[\s\S]*\}'
    json_array_pattern = r'\[[\s\S]*\]'
    
    for pattern in [json_object_pattern, json_array_pattern]:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                continue
    
    return {}


def safe_generate(prompt: str, max_retries: int = 3, retry_delay: float = 1.0) -> str:
    """
    Generate content with retry logic and error handling.
    
    Args:
        prompt: The prompt to send to Gemini
        max_retries: Maximum number of retry attempts
        retry_delay: Delay between retries in seconds (exponential backoff)
    
    Returns:
        Generated text response
    """
    last_error = None
    
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            
            if response.text:
                return response.text
            
            # Check for safety issues
            if response.prompt_feedback:
                raise ValueError(f"Content blocked: {response.prompt_feedback}")
                
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                time.sleep(retry_delay * (2 ** attempt))  # Exponential backoff
                continue
            
    raise last_error or ValueError("Failed to generate content")


def generate_content(prompt: str) -> dict:
    """
    Generate content and parse as JSON.
    
    Args:
        prompt: The prompt to send to Gemini
        
    Returns:
        Parsed JSON response
    """
    text = safe_generate(prompt)
    return extract_json(text)
