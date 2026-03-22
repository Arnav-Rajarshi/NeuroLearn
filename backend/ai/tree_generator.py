import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")


async def generate_topic_tree(topic: str):

    prompt = f"""
Generate the main academic subtopics for:

{topic}

Return JSON in this format:

{{
 "nodes": [
   {{"title": "Overview"}},
   {{"title": "History"}},
   {{"title": "Core Concepts"}},
   {{"title": "Applications"}},
   {{"title": "Limitations"}}
 ]
}}
"""

    response = model.generate_content(prompt)

    text = response.text.strip()

    text = text.replace("```json", "").replace("```", "")

    return json.loads(text)