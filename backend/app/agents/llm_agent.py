"""
MediGenius — agents/llm_agent.py
LLMAgent: generates a direct response from the LLM without RAG.
"""

from app.core.logging_config import logger
from app.core.state import AgentState
from app.tools.llm_client import get_llm


def LLMAgent(state: AgentState) -> AgentState:
    """Generate a response directly from the LLM (no retrieval)."""
    llm = get_llm()
    if not llm:
        state["llm_success"] = False
        state["llm_attempted"] = True
        state["generation"] = "Medical AI service is temporarily unavailable."
        return state

    # Build conversation context
    history_context = ""
    for item in state.get("conversation_history", [])[-5:]:
        if item.get("role") == "user":
            history_context += f"Patient: {item.get('content', '')}\n"
        elif item.get("role") == "assistant":
            history_context += f"Doctor: {item.get('content', '')}\n"

    prompt = (
    "你是一位专业、耐心的医疗AI助手，专门为老年患者提供医疗建议。\n\n"
    "回答要求：\n"
    "1. 用简单易懂的语言，避免过多专业术语\n"
    "2. 回答要具体详细，包括具体的治疗方法、用药建议、生活注意事项\n"
    "3. 如果是慢性病，说明日常管理方法\n"
    "4. 危险症状必须提示立即就医\n"
    "5. 语气温和亲切，像家庭医生一样\n\n"
    f"对话历史：\n{history_context}\n"
    f"患者问题：\n{state['question']}\n\n"
    "请提供详细、具体、实用的医疗建议："
)

    response = llm.invoke(prompt)
    answer = (
        response.content.strip()
        if hasattr(response, "content")
        else str(response).strip()
    )

    if answer and len(answer) > 10:
        state["generation"] = answer
        state["llm_success"] = True
        state["source"] = "AI Medical Knowledge"
        logger.info("LLM: Generated response successfully")
    else:
        state["llm_success"] = False
        logger.warning("LLM: Response too short or empty")

    state["llm_attempted"] = True
    return state
