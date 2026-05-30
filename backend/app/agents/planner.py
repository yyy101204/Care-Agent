"""
MediGenius — agents/planner.py
PlannerAgent: decides whether to use RAG retriever or direct LLM.
"""

from app.core.state import AgentState

# ── Medical Keywords ───────────────────────────────────────────────────────────
MEDICAL_KEYWORDS = [
    "发烧", "疼痛", "头痛", "恶心", "呕吐", "腹泻", "咳嗽", "头晕", "胸闷",
    "气短", "心慌", "水肿", "麻木", "失眠", "便秘", "乏力", "出血", "皮疹",
    # 慢病
    "高血压", "糖尿病", "冠心病", "心绞痛", "心脏病", "脑梗", "脑卒中",
    "骨质疏松", "关节炎", "老年痴呆", "帕金森", "甲状腺", "痛风", "血脂",
    # 用药
    "用药", "药物", "副作用", "剂量", "处方", "降压药", "胰岛素", "阿司匹林",
    # 检查
    "血糖", "血压", "血脂", "胆固醇", "尿酸", "心电图", "CT", "血常规",
    # 治疗
    "治疗", "手术", "康复", "预防", "诊断", "医院", "门诊", "住院",
    # 护理
    "护理", "照料", "饮食", "运动", "复查", "随访",
    # Symptoms
    "fever", "pain", "headache", "nausea", "vomiting", "diarrhea", "cough",
    "acne", "pimple", "skin", "rash", "itch", "cold", "flu",
    "shortness of breath", "chest pain", "abdominal pain", "back pain",
    "joint pain", "muscle pain", "fatigue", "weakness", "dizziness",
    "confusion", "memory loss", "seizure", "numbness", "tingling", "swelling",
    "bleeding", "bruising", "weight loss", "weight gain",
    "appetite loss", "sleep problems", "insomnia",
    # Conditions
    "cancer", "diabetes", "hypertension", "heart disease", "stroke", "asthma",
    "copd", "pneumonia", "bronchitis", "covid", "coronavirus",
    "infection", "virus", "bacteria", "fungal", "arthritis", "osteoporosis",
    "thyroid", "kidney disease", "liver disease", "hepatitis", "depression",
    "anxiety", "bipolar", "schizophrenia", "alzheimer", "parkinson", "epilepsy",
    # Medical terms
    "treatment", "therapy", "medication", "medicine", "prescription", "dosage",
    "side effects", "diagnosis", "prognosis", "surgery", "operation",
    "procedure", "test", "lab results", "blood test", "x-ray", "mri",
    "ct scan", "ultrasound", "biopsy", "screening", "prevention", "vaccine",
    "immunization", "rehabilitation", "recovery", "chronic", "acute",
    "syndrome", "disorder", "symptom", "cure", "remedy", "doctor", "hospital",
    # Body parts
    "heart", "lung", "kidney", "liver", "brain", "stomach", "intestine",
    "blood", "bone", "muscle", "nerve", "eye", "ear", "throat",
    "neck", "spine", "joint", "head", "chest", "abdomen", "leg", "arm",
]


def PlannerAgent(state: AgentState) -> AgentState:
    """Decide whether to use RAG retriever or direct LLM based on question content."""
    question = state["question"].lower()
    contains_medical = any(kw in question for kw in MEDICAL_KEYWORDS)
    state["current_tool"] = "retriever" if contains_medical else "llm_agent"
    state["retry_count"] = 0
    return state
