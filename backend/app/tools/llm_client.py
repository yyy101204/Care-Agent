"""
MediGenius — tools/llm_client.py
Alibaba DashScope (Qwen) LLM client singleton.
"""
from app.core.config import DASHSCOPE_API_KEY
from app.core.logging_config import logger

_llm_instance = None

def get_llm():
    """Return a cached Qwen LLM instance, or None if API key is missing."""
    global _llm_instance
    if _llm_instance is None:
        if not DASHSCOPE_API_KEY:
            logger.warning("DASHSCOPE_API_KEY not found in environment variables")
            return None
        from langchain_community.chat_models.tongyi import ChatTongyi
        _llm_instance = ChatTongyi(
            dashscope_api_key=DASHSCOPE_API_KEY,
            model_name="qwen-max",
            temperature=0.3,
            max_tokens=2048,
        )
        logger.info("LLM client initialized (Alibaba / qwen-max)")
    return _llm_instance