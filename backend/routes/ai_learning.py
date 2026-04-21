"""
AI Learning Routes - API endpoints for the AI Learning Path Generator module.
"""

from fastapi import APIRouter, HTTPException
from schemas.ai_schemas import (
    TopicRequest,
    ExpandRequest,
    EditCardRequest,
    TopicResponse,
    ExpandResponse,
    ContentResponse
)
from services.ai.tree_generator import (
    generate_topic_tree,
    generate_subtopics,
    generate_node_content,
    edit_content_with_ai
)

router = APIRouter(prefix="/ai-learning", tags=["AI Learning"])


@router.post("/generate-topic", response_model=TopicResponse)
async def generate_topic(request: TopicRequest):
    """
    Generate a complete topic tree with initial content and subtopics.
    
    This is the entry point for starting a new learning session.
    Returns the root topic with definition, explanation, example, 
    application, common mistakes, and suggested subtopics.
    """
    try:
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic cannot be empty")
        
        result = generate_topic_tree(request.topic.strip())
        return TopicResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate topic: {str(e)}"
        )


@router.post("/expand-node", response_model=ExpandResponse)
async def expand_node(request: ExpandRequest):
    """
    Get subtopics for a specific node to expand the knowledge tree.
    
    Use this when a user clicks to expand a node and see its children.
    """
    try:
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic cannot be empty")
        
        subtopics = generate_subtopics(
            request.topic.strip(),
            context=request.parent_topic
        )
        return ExpandResponse(subtopics=subtopics)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to expand node: {str(e)}"
        )


@router.post("/generate-node-content", response_model=ContentResponse)
async def generate_content_endpoint(request: ExpandRequest):
    """
    Generate detailed content for a specific node.
    
    Use this when a user selects a node to view its full content.
    Returns definition, explanation, example, application, and common mistakes.
    """
    try:
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic cannot be empty")
        
        content = generate_node_content(
            request.topic.strip(),
            parent_topic=request.parent_topic
        )
        return ContentResponse(**content)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate content: {str(e)}"
        )


@router.post("/edit-card", response_model=ContentResponse)
async def edit_card(request: EditCardRequest):
    """
    Edit node content using AI assistance.
    
    User provides an instruction (e.g., "make it simpler", "add more examples")
    and the AI modifies the content accordingly.
    """
    try:
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic cannot be empty")
        if not request.instruction.strip():
            raise HTTPException(status_code=400, detail="Instruction cannot be empty")
        
        updated_content = edit_content_with_ai(
            request.topic.strip(),
            request.instruction.strip(),
            request.content
        )
        return ContentResponse(**updated_content)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to edit content: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for AI Learning module."""
    return {"status": "healthy", "module": "ai-learning"}
