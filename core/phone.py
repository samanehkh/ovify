"""Single source of truth for phone number normalization.

Every surface that accepts a phone number (patient OTP, partner login,
clinic registration) must normalize identically, or lookups silently fail
across surfaces.
"""

def normalize_phone(phone: str) -> str:
    """Strips a phone string to digits and a leading '+' (e.g. "+971 50-123 4567" -> "+971501234567")."""
    return "".join(c for c in phone if c.isdigit() or c == "+")
