"""
Pydantic schemas for AI Learning module.
"""

from pydantic import BaseModel
from typing import List, Optional


class TopicRequest(BaseModel):
    """Request model for generating a topic tree."""
    topic: str


class ExpandRequest(BaseModel):
    """Request model for expanding a node or getting content."""
    topic: str
    parent_topic: Optional[str] = None


class EditCardRequest(BaseModel):
    """Request model for AI-assisted content editing."""
    topic: str
    instruction: str
    content: dict


class NodeContent(BaseModel):
    """Content structure for a knowledge node."""
    definition: str = ""
    explanation: str = ""
    example: str = ""
    application: str = ""
    mistake: str = ""


class TopicResponse(BaseModel):
    """Response model for generated topic."""
    title: str
    definition: str
    explanation: str
    example: str
    application: str
    mistake: str
    subtopics: List[str]


class ExpandResponse(BaseModel):
    """Response model for expanded subtopics."""
    subtopics: List[str]


class ContentResponse(BaseModel):
    """Response model for node content."""
    definition: str
    explanation: str
    example: str
    application: str
    mistake: str
