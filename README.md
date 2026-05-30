<div align="center">

# 🏥 CareAgent
### 面向慢病管理的多 Agent 医疗问诊系统

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-FF6B6B?style=for-the-badge&logo=graph&logoColor=white)
![通义千问](https://img.shields.io/badge/通义千问-FF6A00?style=for-the-badge&logo=alibaba-cloud&logoColor=white)

![HuggingFace](https://img.shields.io/badge/HuggingFace-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF4785?style=for-the-badge&logo=database&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

**CareAgent** 是一个面向老年人的中文医疗问诊系统，基于 **LangGraph 五节点多 Agent 编排**，结合 **RAG 检索增强生成**，支持症状咨询、风险分层、患者画像记忆与慢病指标管理。在原有开源框架基础上进行系统性中文化改造，RAG 检索命中率从 **0% 提升至 100%**，并新增慢病管理模块。

</div>

---

## 📊 核心指标

<div align="center">

| 指标 | 数值 | 说明 |
|:----:|:----:|:----:|
| 🗃️ 中文医疗知识库 | **2211 条** | 从 Huatuo-26M 5000 条筛选 |
| 🎯 RAG 检索命中率 | **100%** | 修复前为 0% |
| ⚡ 平均响应时间 | **4.79 秒** | qwen-max API |
| 📋 慢病指标类型 | **5 类** | 血压/血糖/心率/体重/用药 |

</div>

---

## 🏗️ 系统架构

```
用户输入
    │
    ▼
┌─────────────────┐
│  Memory Agent   │  ← 裁剪历史 + 提取患者画像（病史/用药/过敏）
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│  Planner Agent  │  ← 中文关键词路由决策（RAG 或直接回答）
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│RAG路线 │ │直接回答  │
│Retriever│ │LLM Agent │
└────┬───┘ └────┬─────┘
     └────┬─────┘
          ▼
┌─────────────────┐
│ Executor Agent  │  ← ⭐ 四项优化核心节点
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│Explanation Agent│  ← 后处理（可扩展）
└────────┬────────┘
         │
    ▼
   最终回答
```

---

## ⭐ 核心创新

### 1️⃣ 中文医疗知识库构建

```python
# 双层关键词过滤策略
STRONG_KEYWORDS = ["高血压", "糖尿病", "冠心病", "老年痴呆", ...]  # 命中即保留
GENERAL_KEYWORDS = ["血糖", "血压", "护理", ...]                   # 需命中 2 个以上

# 筛选结果：5000 条 → 2211 条老年人专项问答
# RAG 命中率：0%（修复前）→ 100%（修复后）
```

### 2️⃣ ExecutorAgent 四项优化

**① RAG 置信度过滤**
```python
# 置信度 = 有效文档数 / 期望文档数（3）
state["rag_confidence"] = len(valid_docs) / 3.0

# 低于阈值时拒绝生成，转为追问
if confidence < 0.4:
    return "我需要更多信息，您能描述一下具体症状吗？"
```

**② 患者画像跨轮记忆**
```python
# 每 6 条消息自动提取患者画像
merged_profile = {
    "diseases":    list(set(old + new)),  # 合并而非覆盖
    "medications": list(set(old + new)),
    "allergies":   list(set(old + new)),
    "symptoms":    list(set(old + new)),
    "age":         new_age or old_age,
}
# 画像注入每次回答的 prompt，实现个性化问诊
```

**③ 模糊输入自动追问**
```
用户："我不舒服"
  ↓
Agent 判断：信息不足，触发追问
  ↓
回复："您是哪里不舒服呢，是头痛、胸口，还是肚子？"
（每次只问一个问题，猜测+确认方式）
```

**④ 回答长度自适应**
```python
is_simple = len(question) < 15 or any(
    kw in question for kw in ["谢谢", "好的", "你好"]
)
# 简单问题 → 1-2 句
# 复杂病情 → 结构化分点分析
```

### 3️⃣ 老年人专项 Prompt 设计

```
回答结构：
【可能的原因】
  - 常见情况：通俗解释症状原因
  - 需要注意：更严重的可能性

【建议做法】
  - 居家处理方案
  - 就医建议（挂哪个科）

【何时立即就医】
  🚨 出现【关键危险症状】时立即拨打 120
```

### 4️⃣ 慢病管理模块（新增）

```python
# SQLAlchemy 数据模型 —— 单表统一存储五类指标
class HealthRecord(Base):
    record_type = Column(String)   # blood_pressure / blood_sugar / heart_rate / weight / medication
    value1      = Column(Float)    # 主要数值（收缩压/血糖/心率/体重）
    value2      = Column(Float)    # 次要数值（舒张压专用）
    unit        = Column(String)   # mmHg / mmol/L / bpm / kg
    note        = Column(String)   # 备注（用药记录用）
    recorded_at = Column(DateTime)

# RESTful API 接口
POST /api/v1/chronic/record          # 记录指标
GET  /api/v1/chronic/records/{type}  # 查询历史（最近30条）
GET  /api/v1/chronic/summary         # 获取汇总（供 Agent 读取）
```

---

## 🆚 与原项目对比

| 改进点 | 原项目（MediGenius）| CareAgent |
|--------|-------------------|-----------|
| 知识库语言 | 英文 PDF | 中文医疗问答（Huatuo-26M）|
| 路由关键词 | 全英文 | 中英文双语，覆盖五大类 |
| RAG 命中率 | 0%（中文问题）| **100%** |
| 置信度过滤 | ❌ | ✅ 阈值 < 0.4 转追问 |
| 患者画像记忆 | ❌ 仅裁剪历史 | ✅ 结构化提取与累积 |
| 自动追问 | ❌ | ✅ 单问题猜测+确认 |
| 回答长度控制 | ❌ 固定 2-4 句 | ✅ 自适应 |
| 慢病管理模块 | ❌ | ✅ 五类指标+趋势图 |
| 面向人群 | 通用 | 老年人专项优化 |

---

## 🚀 快速启动

### 环境要求
- Python 3.10+
- Node.js 18+

### 1. 克隆项目
```bash
git clone https://github.com/yyy101204/Care-Agent.git
cd Care-Agent
```

### 2. 配置环境变量
```bash
# 在项目根目录创建 .env 文件
DASHSCOPE_API_KEY=你的阿里云百炼API Key   # https://bailian.console.aliyun.com
TAVILY_API_KEY=你的Tavily API Key          # https://tavily.com（免费）
DATABASE_URL=sqlite:///./backend/database/medigenius.db
```

### 3. 启动后端
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
# 后端运行在 http://localhost:8000
# API 文档：http://localhost:8000/docs
```

### 4. 启动前端
```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:5173
```

---

## 📁 项目结构

```
Care-Agent/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── memory.py        # 患者画像记忆（升级版）
│   │   │   ├── planner.py       # 中文关键词路由
│   │   │   ├── retriever.py     # 置信度计算
│   │   │   ├── executor.py      # 四项优化核心节点
│   │   │   ├── llm_agent.py
│   │   │   └── explanation.py
│   │   ├── api/v1/endpoints/
│   │   │   ├── chat.py
│   │   │   ├── chronic.py       # 慢病管理 API（新增）
│   │   │   └── session.py
│   │   ├── core/
│   │   │   ├── langgraph_workflow.py
│   │   │   └── state.py         # 含 patient_profile / rag_confidence
│   │   ├── models/
│   │   │   └── health_record.py # 慢病数据模型（新增）
│   │   └── tools/
│   │       ├── llm_client.py    # 通义千问适配
│   │       └── vector_store.py
│   └── data/
│       ├── chinese_medical.pdf  # 中文医疗知识库
│       └── build_chinese_pdf.py # 知识库构建脚本
├── frontend/
│   └── src/
│       └── App.jsx              # 含慢病管理页面和趋势图
├── index.html                   # GitHub Pages 展示页
└── README.md
```

---

## 📄 License

MIT License — 基于 [MediGenius](https://github.com/Md-Emon-Hasan/MediGenius) 开源框架进行二次开发
