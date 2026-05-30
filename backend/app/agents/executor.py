"""
MediGenius — agents/executor.py
ExecutorAgent: 四项优化版本
1. 置信度过滤
2. 患者画像记忆注入
3. 自动追问
4. 回答长度自适应
"""

from app.core.logging_config import logger
from app.core.state import AgentState
from app.tools.llm_client import get_llm


def ExecutorAgent(state: AgentState) -> AgentState:
    llm = get_llm()
    question = state["question"]
    source_info = state.get("source", "Unknown")

    # ── 对话历史上下文 ──────────────────────────────────────────
    history_context = ""
    for item in state.get("conversation_history", [])[-3:]:
        if item.get("role") == "user":
            history_context += f"患者: {item.get('content', '')}\n"
        elif item.get("role") == "assistant":
            history_context += f"医生: {item.get('content', '')}\n"

    # ── 患者画像注入 ────────────────────────────────────────────
    profile = state.get("patient_profile")
    profile_context = ""
    if profile:
        parts = []
        if profile.get("diseases"):
            parts.append(f"已知疾病：{', '.join(profile['diseases'])}")
        if profile.get("medications"):
            parts.append(f"正在用药：{', '.join(profile['medications'])}")
        if profile.get("allergies"):
            parts.append(f"过敏史：{', '.join(profile['allergies'])}")
        if profile.get("symptoms"):
            parts.append(f"近期症状：{', '.join(profile['symptoms'])}")
        if profile.get("age"):
            parts.append(f"年龄：{profile['age']}")
        if parts:
            profile_context = "【患者已知信息】\n" + "\n".join(parts) + "\n\n"

    # ── 回答长度自适应判断 ──────────────────────────────────────
    is_simple = len(question) < 15 or any(
        kw in question for kw in ["谢谢", "好的", "知道了", "再见", "你好", "您好"]
    )
    length_instruction = (
        "这是简单问候或简短问题，用1-2句话简洁回答即可，不需要分点。\n"
        if is_simple else
        "这是复杂问题，请按结构详细分析，分点说明。\n"
    )

    # ── LLM 不可用 ──────────────────────────────────────────────
    if not llm:
        state["generation"] = "医疗AI服务暂时不可用，请咨询专业医生。"
        state["source"] = "System Message"
        state["conversation_history"].append({"role": "user", "content": question})
        state["conversation_history"].append({"role": "assistant", "content": state["generation"], "source": "System Message"})
        return state

    # ── 优化1：置信度过滤 ───────────────────────────────────────
    confidence = state.get("rag_confidence", 1.0)
    if confidence < 0.4 and not state.get("llm_success"):
        answer = "我需要更多信息才能帮您。您能描述一下具体是哪里不舒服，或者症状是什么时候开始的吗？"
        state["generation"] = answer
        state["source"] = "追问"
        state["conversation_history"].append({"role": "user", "content": question})
        state["conversation_history"].append({"role": "assistant", "content": answer, "source": "追问"})
        logger.info("Executor: 置信度过低(%.2f)，转为追问", confidence)
        return state

    # ── 构建 prompt ─────────────────────────────────────────────
    base_prompt = (
        "你是一名专门服务老年人及其家属的AI健康助手，名叫「健康小助手」。\n\n"

        "## 核心原则\n"
        "- 永远先安抚情绪，再提供信息\n"
        "- 用口语化、简单易懂的语言，像家人一样交流\n"
        "- 不替代专业医生，不轻易下诊断\n"
        "- 信息不足时，主动追问，每次只问一个问题\n\n"

        "## 风险快速判断（每次必做）\n"
        "如存在以下任何一种情况，立即回复：'🚨 这个情况比较紧急，请马上联系家人，或拨打120急救电话，不要等待。'\n"
        "- 持续胸痛、胸闷超过5分钟\n"
        "- 呼吸困难、喘不过气\n"
        "- 大汗淋漓、面色苍白\n"
        "- 左臂、下巴、后背放射性疼痛\n"
        "- 意识模糊、说话含糊、突然无力\n"
        "- 突然剧烈头痛\n"
        "- 视力突然模糊或一侧肢体无力\n\n"

        "## 优化3：自动追问规则\n"
        "如果用户描述模糊（只说'不舒服'、'难受'、'有点问题'），不要猜测，先追问：\n"
        "- 每次只问一个问题\n"
        "-只问最关键的那一个问题\n"
        "- 用猜测+确认方式：'您说的是...还是...呢？'\n"
        "- 头晕→'是站起来才晕，还是一直都晕呢？'\n"
        "- 胸口不适→'是闷闷的感觉，还是有点疼呢？'\n"
        "- 腿脚不好→'是酸痛，还是麻木没有感觉呢？'\n\n"
        "- 严禁在一条回复里出现两个以上问号\n\n"

        "## 信息足够时的回答结构\n"
        "【可能的原因】\n"
        "  - 常见情况：通俗解释为什么会出现这种症状\n"
        "  - 需要注意：哪些情况下可能是更严重的问题\n"
        "【建议做法】\n"
        "  - 可以先在家做什么\n"
        "  - 需要去医院时挂哪个科\n"
        "【何时立即就医】\n"
        "  - 🚨 出现【关键危险症状】时立即拨打120\n\n"

        "## 专业术语处理\n"
        "所有专业术语必须加括号解释：\n"
        "- 心肌梗死（心脏血管堵住了）\n"
        "- 高血压（血管压力太大）\n"
        "- β受体阻滞剂（减慢心跳保护心脏的药）\n\n"

        "## 绝对禁止\n"
        "- 不给具体药物剂量\n"
        "- 不说'您得了XX病'\n"
        "- 不在信息不足时给结论\n"
        "- 不制造恐慌\n\n"

        f"{profile_context}"
        f"## 优化4：回答长度要求\n{length_instruction}\n"
        "严格限制：追问时最多三句话。\n\n"
        f"对话历史：\n{history_context}\n"
        f"患者问题：\n{question}\n\n"
    )

    # ── RAG 路线（有检索文档）──────────────────────────────────
    if state.get("documents") and len(state["documents"]) > 0:
        content = "\n\n".join(
            [doc.page_content[:1000] for doc in state["documents"][:3]]
        )
        prompt = base_prompt + f"参考医疗资料：\n{content}\n\n请根据以上规则回答，如信息不足请追问："
        try:
            response = llm.invoke(prompt)
            answer = response.content.strip() if hasattr(response, "content") else str(response).strip()
            logger.info("Executor: 基于文档生成回答")
        except Exception as e:
            logger.error("Executor: LLM生成失败 %s", str(e))
            answer = "我理解您的担忧。为了获得准确的医疗建议，请咨询专业医生进行详细评估。"
            source_info = "System Message"

    # ── LLM 直接回答路线 ────────────────────────────────────────
    elif state.get("llm_success") and state.get("generation"):
        answer = state["generation"]
        logger.info("Executor: 使用LLM直接回答")

    # ── 兜底 ────────────────────────────────────────────────────
    else:
        answer = "我理解您的担忧。为了获得准确的医疗建议，请咨询专业医生进行详细评估。"
        source_info = "System Message"

    state["generation"] = answer
    state["source"] = source_info
    state["conversation_history"].append({"role": "user", "content": question})
    state["conversation_history"].append({"role": "assistant", "content": answer, "source": source_info})
    return state