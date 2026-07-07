import os

# Set testing environment variables on startup (MUST run before importing project modules!)
os.environ["AUTH_SECRET_KEY"] = "test-secret-key-for-jwt-signing"
os.environ["CLINICIAN_API_KEY"] = "test-clinician-secret-key"

from fastapi.testclient import TestClient
from services.auth import generate_token

# Store the original request method of FastAPI TestClient
original_request = TestClient.request

def patched_request(self, method, url, *args, **kwargs):
    headers = kwargs.get("headers", {})
    if headers is None:
        headers = {}
    else:
        headers = dict(headers)

    # Auto-inject a real clinician Bearer token for clinician routes
    # (except /login, which is the public token-issuing endpoint)
    if "/api/clinician" in url and "/api/clinician/login" not in url:
        if "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {generate_token(0, 'clinician')}"

    # Auto-inject patient Bearer token for patient routes
    elif "/users/" in url or "/api/medications" in url or "/symptoms/" in url or "/cycles/" in url:
        is_public = any(path in url for path in ["/request-otp", "/verify-otp"])
        # Exclude POST /users/ (patient creation) as it is public
        if not is_public and not (method.upper() == "POST" and url.endswith("/users/")) and "Authorization" not in headers:
            token = generate_token(1, "patient")
            headers["Authorization"] = f"Bearer {token}"

    kwargs["headers"] = headers
    return original_request(self, method, url, *args, **kwargs)

# Monkey-patch TestClient globally for tests
TestClient.request = patched_request
