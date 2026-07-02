from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db, Base, engine
from db import models
from schemas.user import UserCreate, UserResponse
from uuid import UUID

# Create tables
Base.metadata.create_all(bind=engine)

router = APIRouter()

@router.post("/users/", response_model=UserResponse)
def create_user(db: Session = Depends(get_db)):
    db_user = models.User()
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
