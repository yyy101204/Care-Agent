"""
从 Huatuo-26M 下载老年人相关问答，生成中文医疗 PDF
"""
from datasets import load_dataset
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
import os

# 老年人强相关关键词（出现任意一个直接保留）
STRONG_KEYWORDS = [
    "高血压", "糖尿病", "冠心病", "心绞痛", "骨质疏松",
    "老年痴呆", "帕金森", "脑梗", "脑卒中", "前列腺",
    "胰岛素", "降压药", "他汀", "阿司匹林", "血脂异常",
    "心房颤动", "心衰", "老年", "老人", "中老年",
    "慢性病", "长期用药", "褥疮", "吞咽困难", "防跌倒"
]

# 普通关键词（需要出现2个以上才保留）
GENERAL_KEYWORDS = [
    "血糖", "血压", "血脂", "胆固醇", "尿酸",
    "痛风", "关节炎", "失眠", "便秘", "头晕",
    "胸闷", "气短", "心慌", "水肿", "记忆力",
    "护理", "照料", "家属", "饮食控制", "康复训练"
]

print("正在下载 Huatuo-26M 子集（前5000条）...")
dataset = load_dataset(
    "FreedomIntelligence/huatuo26M-lite",
    split="train[:5000]",
    trust_remote_code=True
)

print(f"下载完成，共 {len(dataset)} 条，开始筛选...")
filtered = []
for item in dataset:
    question = item.get("question", "") or ""
    answer = item.get("answer", "") or ""
    diseases = item.get("related_diseases", "") or ""
    text = question + answer + diseases

    # 强关键词命中一个就保留
    if any(kw in text for kw in STRONG_KEYWORDS):
        filtered.append({"q": question, "a": answer})
        continue

    # 普通关键词命中2个以上才保留
    general_hits = sum(1 for kw in GENERAL_KEYWORDS if kw in text)
    if general_hits >= 2:
        filtered.append({"q": question, "a": answer})
print(f"筛选出 {len(filtered)} 条老年人相关问答，开始生成 PDF...")

# 注册中文字体
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))

output_path = os.path.join(os.path.dirname(__file__), "chinese_medical.pdf")
c = canvas.Canvas(output_path, pagesize=A4)
width, height = A4

c.setFont('STSong-Light', 12)
y = height - 50
line_height = 18
max_chars = 38  # 每行最多字符数

def draw_wrapped_text(c, text, x, y, max_chars, line_height):
    """自动换行绘制文字"""
    while len(text) > max_chars:
        c.drawString(x, y, text[:max_chars])
        text = text[max_chars:]
        y -= line_height
        if y < 60:
            c.showPage()
            c.setFont('STSong-Light', 12)
            y = height - 50
    c.drawString(x, y, text)
    y -= line_height
    return y

for i, item in enumerate(filtered):
    q = item["q"].strip()
    a = item["a"].strip()
    if not q or not a:
        continue

    # 检查是否需要新页
    if y < 100:
        c.showPage()
        c.setFont('STSong-Light', 12)
        y = height - 50

    y = draw_wrapped_text(c, f"问：{q}", 50, y, max_chars, line_height)
    y = draw_wrapped_text(c, f"答：{a}", 50, y, max_chars, line_height)
    y -= 10  # 间距

    if i % 50 == 0:
        print(f"已处理 {i}/{len(filtered)} 条...")

c.save()
print(f"PDF 生成完成：{output_path}")
print(f"共写入 {len(filtered)} 条问答")