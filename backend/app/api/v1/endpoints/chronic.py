"""
慢病管理 API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.health_record import HealthRecord
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class HealthRecordCreate(BaseModel):
    record_type: str
    value1: float
    value2: Optional[float] = None
    unit: Optional[str] = None
    note: Optional[str] = None
    user_id: Optional[str] = "default_user"

@router.post("/chronic/record") #（记录指标）用户在前端输入今天的血压 120/80，前端把这个数据发给这个接口，接口把数据存进数据库。
def add_record(data: HealthRecordCreate, db: Session = Depends(get_db)):
    record = HealthRecord(**data.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"success": True, "id": record.id}

@router.get("/chronic/records/{record_type}")# （查历史）前端想画血压趋势图，就调用这个接口，接口从数据库取出最近30条血压记录返回给前端。
def get_records(record_type: str, user_id: str = "default_user", db: Session = Depends(get_db)):
    records = db.query(HealthRecord)\
        .filter(HealthRecord.user_id == user_id)\
        .filter(HealthRecord.record_type == record_type)\
        .order_by(HealthRecord.recorded_at.desc())\
        .limit(30).all()
    return [
        {
            "id": r.id,
            "value1": r.value1,
            "value2": r.value2,
            "unit": r.unit,
            "note": r.note,
            "recorded_at": r.recorded_at.isoformat()
        }
        for r in records
    ]

@router.get("/chronic/summary/{user_id}")#（获取最新指标）Agent 回答问题时，调用这个接口获取用户最新的血压、血糖等数据，结合实际数值给出建议。比如用户问"我最近血压控制得怎么样"，Agent 先查这个接口拿到真实数据，再分析回答。
def get_summary(user_id: str = "default_user", db: Session = Depends(get_db)):
    """获取各指标最新一条记录，供Agent使用"""
    types = ["blood_pressure", "blood_sugar", "heart_rate", "weight", "medication"]
    summary = {}
    for t in types:
        record = db.query(HealthRecord)\
            .filter(HealthRecord.user_id == user_id)\
            .filter(HealthRecord.record_type == t)\
            .order_by(HealthRecord.recorded_at.desc())\
            .first()
        if record:
            summary[t] = {
                "value1": record.value1,
                "value2": record.value2,
                "unit": record.unit,
                "note": record.note,
                "recorded_at": record.recorded_at.isoformat()
            }
    return summary