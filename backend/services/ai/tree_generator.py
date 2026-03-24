"""
Tree Generator Service for AI Learning Module.
Generates topic trees, subtopics, and detailed content using Gemini AI.
"""

from .gemini_service import generate_content, safe_generate, extract_json


def generate_topic_tree(topic: str) -> dict:
    """
    Generate a complete topic tree with initial content and subtopics.
    
    Args:
        topic: The main topic to generate content for
        
    Returns:
        Dictionary containing title, content sections, and subtopics
    """
    prompt = f"""You are an expert educator creating structured learning content.

Generate comprehensive learning content for the topic: "{topic}"

Provide the response in this exact JSON format:
{{
    "title": "{topic}",
    "definition": "A clear, concise definition (2-3 sentences)",
    "explanation": "A detailed explanation of the concept (3-5 sentences)",
    "example": "A practical, real-world example that illustrates the concept",
    "application": "How this concept is applied in practice or industry",
    "mistake": "A common mistake or misconception learners have about this topic",
    "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3", "Subtopic 4", "Subtopic 5"]
}}

Requirements:
- Definition should be beginner-friendly but accurate
- Explanation should build on the definition with more depth
- Example should be specific and relatable
- Application should show practical relevance
- Mistake should help learners avoid common pitfalls
- Subtopics should be 5 logical sub-areas to explore next
- All content should be educational and factually accurate

Return ONLY valid JSON, no additional text."""

    result = generate_content(prompt)
    
    # Ensure required fields exist with defaults
    return {
        "title": result.get("title", topic),
        "definition": result.get("definition", ""),
        "explanation": result.get("explanation", ""),
        "example": result.get("example", ""),
        "application": result.get("application", ""),
        "mistake": result.get("mistake", ""),
        "subtopics": result.get("subtopics", [])
    }


def generate_subtopics(topic: str, context: str = None) -> list:
    """
    Generate subtopics for a given topic.
    
    Args:
        topic: The topic to expand
        context: Optional parent context for better subtopic generation
        
    Returns:
        List of subtopic strings
    """
    context_hint = f" (in the context of {context})" if context else ""
    
    prompt = f"""Generate 5 subtopics for learning about "{topic}"{context_hint}.

These subtopics should:
- Be logical next steps in learning about {topic}
- Progress from fundamental to more advanced concepts
- Be specific and actionable learning areas
- Not overlap significantly with each other

Return ONLY a JSON array of strings, like:
["Subtopic 1", "Subtopic 2", "Subtopic 3", "Subtopic 4", "Subtopic 5"]

No additional text, just the JSON array."""

    result = generate_content(prompt)
    
    if isinstance(result, list):
        return result
    elif isinstance(result, dict) and "subtopics" in result:
        return result["subtopics"]
    
    return []


def generate_node_content(topic: str, parent_topic: str = None) -> dict:
    """
    Generate detailed content for a specific node/topic.
    
    Args:
        topic: The topic to generate content for
        parent_topic: Optional parent topic for context
        
    Returns:
        Dictionary with content sections
    """
    context = f" as a subtopic of '{parent_topic}'" if parent_topic else ""
    
    prompt = f"""You are an expert educator creating detailed learning content.

Generate comprehensive learning content for: "{topic}"{context}

Provide the response in this exact JSON format:
{{
    "definition": "A clear, concise definition (2-3 sentences)",
    "explanation": "A detailed explanation of the concept (4-6 sentences with depth)",
    "example": "A practical, specific example that illustrates the concept clearly",
    "application": "Real-world applications and how professionals use this concept",
    "mistake": "Common mistakes, misconceptions, or pitfalls to avoid"
}}

Requirements:
- Content should be accurate and educational
- Use clear, accessible language
- Examples should be specific and memorable
- Applications should demonstrate practical value

Return ONLY valid JSON, no additional text."""

    result = generate_content(prompt)
    
    return {
        "definition": result.get("definition", ""),
        "explanation": result.get("explanation", ""),
        "example": result.get("example", ""),
        "application": result.get("application", ""),
        "mistake": result.get("mistake", "")
    }


def edit_content_with_ai(topic: str, instruction: str, current_content: dict) -> dict:
    """
    Edit existing content based on user instruction using AI.
    
    Args:
        topic: The topic being edited
        instruction: User's instruction for editing (e.g., "make it simpler")
        current_content: Current content dictionary
        
    Returns:
        Updated content dictionary
    """
    prompt = f"""You are an expert educator helping to improve learning content.

Topic: "{topic}"

Current content:
- Definition: {current_content.get('definition', 'N/A')}
- Explanation: {current_content.get('explanation', 'N/A')}
- Example: {current_content.get('example', 'N/A')}
- Application: {current_content.get('application', 'N/A')}
- Common Mistake: {current_content.get('mistake', 'N/A')}

User instruction: "{instruction}"

Please modify the content according to the instruction. Return the updated content in this JSON format:
{{
    "definition": "Updated definition",
    "explanation": "Updated explanation",
    "example": "Updated example",
    "application": "Updated application",
    "mistake": "Updated common mistake"
}}

Keep any sections that don't need changes similar to the original.
Return ONLY valid JSON, no additional text."""

    result = generate_content(prompt)
    
    # Merge with original content for any missing fields
    return {
        "definition": result.get("definition", current_content.get("definition", "")),
        "explanation": result.get("explanation", current_content.get("explanation", "")),
        "example": result.get("example", current_content.get("example", "")),
        "application": result.get("application", current_content.get("application", "")),
        "mistake": result.get("mistake", current_content.get("mistake", ""))
    }
