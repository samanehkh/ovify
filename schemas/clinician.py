from datetime import date
from typing import List, Optional
from pydantic import BaseModel

class ProtocolParseRequest(BaseModel):
    protocol_text: str

class ParsedMedication(BaseModel):
    name: str
    dosage: str
    route: str
    scheduled_time: str
    start_date: date
    end_date: date
    flagged: bool

class UnrecognizedMedication(BaseModel):
    text: str
    message: str

class ProtocolParseResponse(BaseModel):
    parsed_medications: List[ParsedMedication]
    unrecognized_medications: List[UnrecognizedMedication]

class RegisterPatientRequest(BaseModel):
    name: str
    phone: str
    email: str
    dob: date
    cycle_type: str
    prescriptions: List[ParsedMedication]

class CycleOutcomeUpdate(BaseModel):
    cycle_outcome: Optional[str] = None

