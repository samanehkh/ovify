import hmac
import hashlib
import json
import base64
import time
import os
from typing import Optional
from fastapi import Header, HTTPException

# Strict fail-closed policy on startup/import
SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Critical: AUTH_SECRET_KEY environment variable is not configured. Server must fail closed.")

CLINICIAN_API_KEY = os.getenv("CLINICIAN_API_KEY")
if not CLINICIAN_API_KEY:
    raise RuntimeError("Critical: CLINICIAN_API_KEY environment variable is not configured. Server must fail closed.")

def generate_token(user_id: int, role: str, name: Optional[str] = None) -> str:
    """
    Generates a secure signed token mapping user_id and role with an expiry timestamp.
    `name` carries the individual actor's identity (e.g. the nurse's name) so
    clinical actions are attributable in the audit log.
    """
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": int(time.time()) + (24 * 3600)  # 24 hours expiry
    }
    if name:
        payload["name"] = name
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_token(token: str) -> dict:
    """
    Verifies the signature of the token and checks expiry. Returns payload dict or None.
    """
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()).decode())
        if time.time() > payload["exp"]:
            return None  # Expired
        return payload
    except Exception:
        return None

def verify_patient_token(authorization: Optional[str] = Header(None, description="Bearer token")) -> dict:
    """
    Dependency to verify a patient's authorization bearer token.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload or payload.get("role") != "patient":
        raise HTTPException(status_code=401, detail="Unauthorized patient access or token expired")
    return payload

def check_clinic_access_key(access_key: str) -> bool:
    """
    Server-side check of the clinic access key. Used ONLY by the clinician
    login endpoint — the key itself must never be embedded in a client bundle.
    """
    return hmac.compare_digest(access_key.encode(), CLINICIAN_API_KEY.encode())

def verify_clinician_token(authorization: Optional[str] = Header(None, description="Bearer token")) -> dict:
    """
    Dependency to verify a clinician's authorization bearer token.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload or payload.get("role") != "clinician":
        raise HTTPException(status_code=401, detail="Unauthorized clinician access or token expired")
    return payload
