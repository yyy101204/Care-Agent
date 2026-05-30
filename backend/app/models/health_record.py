"""
健康指标记录模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime
from app.db.session import Base

class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default_user")
    record_type = Column(String)      # blood_pressure / blood_sugar / heart_rate / weight / medication
    value1 = Column(Float, nullable=True)   # 收缩压 / 血糖 / 心率 / 体重
    value2 = Column(Float, nullable=True)   # 舒张压（血压专用）
    unit = Column(String, nullable=True)    # mmHg / mmol/L / bpm / kg
    note = Column(String, nullable=True)    # 备注（用药记录用）
    recorded_at = Column(DateTime, default=datetime.utcnow)