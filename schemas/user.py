from datetime import date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class UserCreate(BaseModel):
    pass # No input needed for user creation, ID is generated

class UserResponse(BaseModel):
    id: UUID
    created_at: date

    class Config:
        from_attributes = True
