from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from db import models
from db.session import get_db
from schemas.cycle import CycleCreate, CycleResponse, CycleUpdate, CycleSummary
from services.prediction import calculate_average_cycle_length, predict_next_period_start, predict_fertile_window
from services.auth import verify_patient_token

router = APIRouter()

@router.post("/", response_model=CycleResponse)
def create_cycle(
    cycle: CycleCreate, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if cycle.user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify another user's cycle logs")
        
    db_cycle = models.Cycle(**cycle.dict())
    db.add(db_cycle)
    db.commit()
    db.refresh(db_cycle)
    return db_cycle

@router.put("/{cycle_id}", response_model=CycleResponse)
def update_cycle(
    cycle_id: int, 
    cycle: CycleUpdate, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    db_cycle = db.query(models.Cycle).filter(models.Cycle.id == cycle_id).first()
    if db_cycle is None:
        raise HTTPException(status_code=404, detail="Cycle not found")
        
    if db_cycle.user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify another user's cycle logs")
        
    for key, value in cycle.dict(exclude_unset=True).items():
        setattr(db_cycle, key, value)
    db.commit()
    db.refresh(db_cycle)
    return db_cycle

@router.get("/summary/{user_id}", response_model=CycleSummary)
def get_cycle_summary(
    user_id: int, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's cycle logs")
        
    cycles = db.query(models.Cycle).filter(models.Cycle.user_id == user_id).order_by(models.Cycle.start_date).all()

    if not cycles:
        return CycleSummary(average_cycle_length=None, predicted_next_period_start=None, predicted_fertile_window_start=None, predicted_fertile_window_end=None)

    cycle_dates = [(cycle.start_date, cycle.end_date) for cycle in cycles if cycle.end_date]
    
    average_cycle_length = calculate_average_cycle_length(cycle_dates)

    predicted_next_period_start: Optional[date] = None
    predicted_fertile_window_start: Optional[date] = None
    predicted_fertile_window_end: Optional[date] = None

    if average_cycle_length and cycles:
        last_period_start = cycles[-1].start_date
        predicted_next_period_start = predict_next_period_start(last_period_start, average_cycle_length)
        predicted_fertile_window_start, predicted_fertile_window_end = predict_fertile_window(predicted_next_period_start, average_cycle_length)

    return CycleSummary(
        average_cycle_length=average_cycle_length,
        predicted_next_period_start=predicted_next_period_start,
        predicted_fertile_window_start=predicted_fertile_window_start,
        predicted_fertile_window_end=predicted_fertile_window_end
    )

@router.get("/{user_id}", response_model=List[CycleResponse])
def get_cycles(
    user_id: int, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's cycle logs")
        
    cycles = db.query(models.Cycle).filter(models.Cycle.user_id == user_id).order_by(models.Cycle.start_date).all()
    return cycles
