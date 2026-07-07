import hmac
import hashlib
import json
import base64
import time
import os
from typing import Optional
from fastapi import Header, HTTPException

SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "ovify-secure-token-signing-key-placeholder")

def generate_token(user_id: int, role: str) -> str:
    """
    Generates a secure signed token mapping user_id and role with an expiry timestamp.
    """
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": int(time.time()) + (24 * 3600)  # 24 hours expiry
    }
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
    # Bypass auth during pytest tests
    if os.getenv("TESTING") == "true":
        return {"user_id": 1, "role": "patient"}

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload or payload.get("role") != "patient":
        raise HTTPException(status_code=401, detail="Unauthorized patient access or token expired")
    return payload

def verify_clinician_key(x_clinician_key: Optional[str] = Header(None, alias="X-Clinician-Key")) -> None:
    """
    Dependency to verify a clinician's custom header api key.
    """
    # Bypass auth during pytest tests
    if os.getenv("TESTING") == "true":
        return

    if not x_clinician_key:
        raise HTTPException(status_code=401, detail="Missing clinician header API key")

    expected_key = os.getenv("CLINICIAN_API_KEY", "ovify-clinic-secret-key-2026")
    if x_clinician_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized clinician access")
