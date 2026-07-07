from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from db import models
from db.session import get_db
from schemas.symptom import SymptomLogCreate, SymptomLogResponse
from services.auth import verify_patient_token

router = APIRouter()

@router.post("/log", response_model=SymptomLogResponse)
def log_symptom(
    symptom: SymptomLogCreate, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if symptom.user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify another user's symptom logs")
        
    db_symptom = models.SymptomLog(**symptom.dict())
    db.add(db_symptom)
    db.commit()
    db.refresh(db_symptom)
    return db_symptom

@router.get("/log/{user_id}", response_model=List[SymptomLogResponse])
def get_symptoms_by_date(
    user_id: int, 
    log_date: date, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's symptom logs")
        
    symptoms = db.query(models.SymptomLog).filter(
        models.SymptomLog.user_id == user_id,
        models.SymptomLog.log_date == log_date
    ).all()
    return symptoms

@router.get("/logs/{user_id}", response_model=List[SymptomLogResponse])
def get_all_symptoms(
    user_id: int, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's symptom logs")
        
    symptoms = db.query(models.SymptomLog).filter(models.SymptomLog.user_id == user_id).order_by(models.SymptomLog.log_date).all()
    return symptoms
