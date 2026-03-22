from pydantic import BaseModel

class NodeRequest(BaseModel):
    title: str


class NodeContent(BaseModel):
    definition: str
    explanation: str
    example: str
    application: str
    mistake: str