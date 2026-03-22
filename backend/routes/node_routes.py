from fastapi import APIRouter
from models.node_models import NodeRequest
from ai.gemini_service import generate_node_content

router = APIRouter()

@router.post("/expand-node")
def expand_node(data: NodeRequest):
    result = generate_node_content(data.title)
    return result