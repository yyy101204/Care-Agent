"""
MediGenius — agents/memory.py
MemoryAgent: 裁剪对话历史 + 提取患者画像
"""
import json
import re
from app.core.state import AgentState
from app.core.logging_config import logger
from app.tools.llm_client import get_llm


def MemoryAgent(state: AgentState) -> AgentState:
    """
    记忆管理 Agent，负责两件事：
    1. 裁剪对话历史，防止上下文过长
    2. 每隔6条消息提取并累积患者画像
    """

    # ─────────────────────────────────────────
    # 第一部分：裁剪对话历史（每次调用都执行）
    # ─────────────────────────────────────────

    history = state.get("conversation_history", [])

    if len(history) > 20:
        # 只保留最近20条，超出部分直接丢弃
        # 使用滑动窗口策略，避免 token 超限
        history = history[-20:]

    state["conversation_history"] = history

    # ─────────────────────────────────────────
    # 第二部分：患者画像提取（每6条消息触发一次）
    # ─────────────────────────────────────────

    # 使用独立的轮次计数器控制触发时机
    # 好处：不受历史裁剪影响，计数始终准确
    turn_count = state.get("turn_count", 0)
    turn_count += 1
    state["turn_count"] = turn_count  # 回写更新后的计数

    # 对话太短（不足2条）或不是第6/12/18...轮时，跳过画像提取
    logger.info("Memory: 当前历史长度 %d", len(history))
    if len(history) < 2:
        return state
    if len(history) % 6 != 0:
        logger.info("Memory: 跳过画像提取，等待第%d条", ((len(history) // 6) + 1) * 6)
        return state

    # 获取 LLM 实例，不可用时安全退出
    llm = get_llm()
    if not llm:
        logger.warning("Memory: LLM 不可用，跳过画像提取")
        return state

    # ── 构建提取用的对话文本 ──────────────────

    # role 映射表，避免未知 role 被错误标记
    role_map = {
        "user":      "患者",
        "assistant": "医生",
        "system":    "系统",
    }

    # 只取最近12条对话，控制 prompt 长度节省 token
    history_text = "\n".join([
        f"{role_map.get(h['role'], h['role'])}: {h.get('content', '')}"
        for h in history[-12:]
    ])

    # ── 构建 Prompt ───────────────────────────

    prompt = (
        "请从以下对话中提取患者健康信息，只输出JSON，不要其他任何内容：\n\n"
        f"{history_text}\n\n"
        "输出格式（没有提到的字段填空列表或null，不要编造信息）：\n"
        '{"diseases": [], "medications": [], "allergies": [], "symptoms": [], "age": null}'
    )

    # ── 调用 LLM 并解析结果 ───────────────────

    try:
        response = llm.invoke(prompt)

        # 兼容不同 LLM 返回格式
        content = (
            response.content.strip()
            if hasattr(response, "content")
            else str(response).strip()
        )

        # 用正则从输出中抠出 JSON 部分
        # re.DOTALL 让 . 能匹配换行符，应对多行 JSON
        match = re.search(r'\{.*\}', content, re.DOTALL)

        if not match:
            logger.warning("Memory: LLM 输出中未找到 JSON，原始内容: %s", content)
            return state

        new_profile = json.loads(match.group())

        # ── 合并而非覆盖旧画像 ────────────────
        # 防止本轮未提及的信息（如过敏史）被清空

        old_profile = state.get("patient_profile", {})

        merged_profile = {
            "diseases": list(set(
                x for x in (old_profile.get("diseases") or []) + (new_profile.get("diseases") or []) if x
            )),
            "medications": list(set(
                x for x in (old_profile.get("medications") or []) + (new_profile.get("medications") or []) if x
            )),
            "allergies": list(set(
                x for x in (old_profile.get("allergies") or []) + (new_profile.get("allergies") or []) if x
            )),
            "symptoms": list(set(
                x for x in (old_profile.get("symptoms") or []) + (new_profile.get("symptoms") or []) if x
            )),
            # 年龄字段：新值优先，无新值则保留旧值
            "age": new_profile.get("age") or old_profile.get("age"),
        }

        state["patient_profile"] = merged_profile
        logger.info("Memory: 患者画像已更新 %s", merged_profile)

    except json.JSONDecodeError as e:
        # JSON 解析失败，记录原始内容方便调试
        logger.warning("Memory: JSON 解析失败 %s，原始内容: %s", str(e), content)
    except Exception:
        pass

    return state