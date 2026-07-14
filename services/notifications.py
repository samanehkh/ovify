from sqlalchemy.orm import Session
from db import models

def send_web_push(user_id: int, message: str, db: Session) -> bool:
    """
    Simulates sending a PWA Web Push notification via the Push API.
    Returns True if a push subscription is found and notification is dispatched, otherwise False.
    """
    sub = db.query(models.PushSubscription).filter(models.PushSubscription.user_id == user_id).first()
    if sub:
        print(f"[WEB PUSH DISPATCH] Sent to user {user_id} endpoint {sub.endpoint}: {message}")
        return True
    print(f"[WEB PUSH FAIL] User {user_id} has no active Web Push subscription.")
    return False

def send_whatsapp_partner(partner_name: str, patient_name: str, scheduled_time: str, medication_name: str, partner_phone: str) -> bool:
    """
    Simulates sending a Twilio WhatsApp message to the support partner.
    """
    msg = f"{partner_name}, {patient_name}'s {scheduled_time} {medication_name} injection has not been confirmed yet. Please verify if she needs support."
    print(f"[TWILIO WHATSAPP DISPATCH] Sent to {partner_phone}: {msg}")
    return True

def send_sms_partner(partner_name: str, patient_name: str, scheduled_time: str, medication_name: str, partner_phone: str) -> bool:
    """
    Simulates sending a Twilio SMS backup message to the support partner.
    """
    msg = f"{partner_name}, {patient_name}'s {scheduled_time} {medication_name} injection has not been confirmed yet. Please verify if she needs support."
    print(f"[TWILIO SMS DISPATCH] Sent to {partner_phone}: {msg}")
    return True

def send_sms_clinician(patient_name: str, medication_name: str, scheduled_time: str, nurse_phone: str) -> bool:
    """
    Simulates sending an urgent Twilio SMS message directly to the on-call Nurse phone.
    """
    msg = f"Urgent: {patient_name} missed {medication_name} injection scheduled for {scheduled_time}. 2 hours overdue."
    print(f"[TWILIO SMS CLINICIAN DISPATCH] Sent to {nurse_phone}: {msg}")
    return True
