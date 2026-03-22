from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json
import re
import time

load_dotenv()

app = FastAPI()

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Gemini ----------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")


# ---------- Request Models ----------

class TopicRequest(BaseModel):
    topic: str


class ExpandRequest(BaseModel):
    topic: str


class EditCardRequest(BaseModel):
    topic: str
    instruction: str
    content: dict


# ---------- Utility Functions ----------

def extract_json(text: str):
    """
    Extract JSON safely even if Gemini adds extra text
    """

    try:

        text = re.sub(r"```json|```", "", text)

        start = text.find("{")
        end = text.rfind("}")

        if start != -1 and end != -1:
            json_str = text[start:end+1]
            return json.loads(json_str)

    except Exception as e:
        print("JSON PARSE ERROR:", e)

    return None


def safe_generate(prompt: str):
    """
    Retry Gemini if network or quota errors occur
    """

    for attempt in range(3):

        try:

            response = model.generate_content(
                prompt,
                request_options={"timeout": 30}
            )

            return response.text.strip()

        except Exception as e:

            print("Gemini error:", e)
            time.sleep(5)

    return None


# ---------- Generate Root Topic ----------

@app.post("/generate-topic")
async def generate_topic(data: TopicRequest):

    topic = data.topic

    prompt = f"""
Generate structured learning content for the topic: {topic}

Return ONLY valid JSON.

{{
"title": "",
"definition": "",
"explanation": "",
"example": "",
"application": "",
"mistake": "",
"subtopics": []
}}
"""

    text = safe_generate(prompt)

 

    if not text:

        return {
            "title": topic,
            "definition": "",
            "explanation": "",
            "example": "",
            "application": "",
            "mistake": "",
            "subtopics": []
        }

    result = extract_json(text)
    

    if not result:

        return {
            "title": topic,
            "definition": text,
            "explanation": "",
            "example": "",
            "application": "",
            "mistake": "",
            "subtopics": []
        }

    return result


# ---------- Expand Knowledge Node ----------

@app.post("/expand-node")
async def expand_node(data: ExpandRequest):

    topic = data.topic

    prompt = f"""
You are generating subtopics for a learning knowledge tree.

Topic: {topic}

Return ONLY valid JSON.

Do NOT include explanations.
Do NOT include text outside JSON.

Format:

{{
"subtopics":[
"topic1",
"topic2",
"topic3",
"topic4",
"topic5"
]
}}
"""

    text = safe_generate(prompt)

    print("RAW GEMINI RESPONSE (expand-node):", text)

    if not text:

        return {
            "subtopics": [
                f"{topic} Basics",
                f"{topic} Concepts",
                f"{topic} Implementation",
                f"{topic} Applications",
                f"{topic} Optimization"
            ]
        }

    result = extract_json(text)
    print(result)

    if not result:

        print("Gemini JSON parsing failed")

        return {
            "subtopics": [
                f"{topic} Basics",
                f"{topic} Concepts",
                f"{topic} Implementation",
                f"{topic} Applications",
                f"{topic} Optimization"
            ]
        }

    subtopics = result.get("subtopics", [])
    print(subtopics)

    cleaned = []

    for s in subtopics:

        if isinstance(s, dict):
            cleaned.append(str(s.get("title", "")))

        elif isinstance(s, str):
            cleaned.append(s)

        else:
            cleaned.append(str(s))

    return {"subtopics": cleaned}


# ---------- Generate Node Content ----------

@app.post("/generate-node-content")
async def generate_node_content(data: ExpandRequest):

    topic = data.topic

    prompt = f"""
Generate detailed learning content for the topic: {topic}

Return ONLY JSON.

{{
"definition": "",
"explanation": "",
"example": "",
"application": "",
"mistake": ""
}}
"""

    text = safe_generate(prompt)

    print("RAW GEMINI RESPONSE (node-content):", text)

    if not text:

        return {
            "definition": "",
            "explanation": "",
            "example": "",
            "application": "",
            "mistake": ""
        }

    result = extract_json(text)

    if not result:

        return {
            "definition": text,
            "explanation": "",
            "example": "",
            "application": "",
            "mistake": ""
        }

    return result


# ---------- AI Edit Card ----------

@app.post("/edit-card")
async def edit_card(data: EditCardRequest):

    topic = data.topic
    instruction = data.instruction
    content = data.content

    prompt = f"""
You are editing a learning card.

Topic: {topic}

Current card content:
{json.dumps(content)}

User instruction:
{instruction}

Rewrite the card according to the instruction.

Return ONLY JSON:

{{
"definition": "",
"explanation": "",
"example": "",
"application": "",
"mistake": ""
}}
"""

    text = safe_generate(prompt)



    if not text:
        return content

    result = extract_json(text)


    if not result:
        print("lalalalaall")
        return content
    print("meow")
    return result