from fastapi import APIRouter
from ai.tree_generator import generate_topic_tree

router = APIRouter()

@router.post("/generate-topic")

async def generate_topic(data):

    topic = data["topic"]

    result = await generate_topic_tree(topic)
    
    return result
