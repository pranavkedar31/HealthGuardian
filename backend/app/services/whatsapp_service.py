"""
WhatsApp Cloud API Service for HealthGuardian.
Handles normalized messaging, detailed API logging, credential health checks, and error diagnostics.
"""
import logging
from typing import Any, Dict, Optional
import httpx

from app.core.config import settings
from app.utils.phone import normalize_phone_number

logger = logging.getLogger("healthguardian.whatsapp")


class WhatsAppResult(dict):
    """Dict subclass that also behaves as a boolean (True if success, False if failed)."""
    def __bool__(self):
        return bool(self.get("success", False))


def mask_recipient(number: str) -> str:
    """Mask phone number for safe logging (e.g. +91*****48081)."""
    if len(number) > 6:
        return number[:3] + "*" * (len(number) - 6) + number[-3:]
    return "******"


def check_whatsapp_health() -> Dict[str, Any]:
    """
    Checks WhatsApp Cloud API configuration and reachability.
    Never returns secrets or access tokens.
    """
    token_present = bool(settings.WHATSAPP_ACCESS_TOKEN and len(settings.WHATSAPP_ACCESS_TOKEN.strip()) > 10)
    phone_id_present = bool(settings.WHATSAPP_PHONE_NUMBER_ID and len(settings.WHATSAPP_PHONE_NUMBER_ID.strip()) > 3)

    if not token_present or not phone_id_present:
        return {
            "configured": False,
            "credentials_present": token_present,
            "phone_number_id_configured": phone_id_present,
            "api_reachable": False,
            "status": "unconfigured",
            "message": "WhatsApp Cloud API credentials are not fully configured in backend environment."
        }

    # Verify Meta Graph API reachability and token validity
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}"
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                verified_name = data.get("verified_name", "Verified")
                return {
                    "configured": True,
                    "credentials_present": True,
                    "phone_number_id_configured": True,
                    "api_reachable": True,
                    "status": "connected",
                    "verified_name": verified_name,
                    "message": "WhatsApp Cloud API is active, authenticated, and reachable."
                }
            elif resp.status_code == 401:
                return {
                    "configured": False,
                    "credentials_present": True,
                    "phone_number_id_configured": True,
                    "api_reachable": False,
                    "status": "token_expired",
                    "message": "WhatsApp access token is invalid or expired. Refresh WHATSAPP_ACCESS_TOKEN in Meta App Dashboard."
                }
            else:
                err_data = resp.json().get("error", {})
                return {
                    "configured": False,
                    "credentials_present": True,
                    "phone_number_id_configured": True,
                    "api_reachable": False,
                    "status": "api_error",
                    "error_code": err_data.get("code", resp.status_code),
                    "message": f"WhatsApp API responded with status {resp.status_code}: {err_data.get('message', 'Unknown error')}"
                }
    except Exception as exc:
        return {
            "configured": False,
            "credentials_present": True,
            "phone_number_id_configured": True,
            "api_reachable": False,
            "status": "unreachable",
            "message": f"Unable to reach Meta Graph API: {str(exc)}"
        }


def send_whatsapp_message(
    phone_number: str,
    message: str,
) -> WhatsAppResult:
    """
    Sends a WhatsApp message via Meta Cloud API.
    Returns WhatsAppResult (behaves as dict and boolean for backwards compatibility).
    """
    print("[WhatsApp] Request started")

    # 1. Phone number normalization
    is_valid, stored_num, api_recipient, err_msg = normalize_phone_number(phone_number)
    if not is_valid:
        print(f"[WhatsApp] Phone normalization failed: {err_msg}")
        return WhatsAppResult({
            "success": False,
            "status_code": 400,
            "error_code": "INVALID_PHONE_NUMBER",
            "error_message": err_msg,
            "detail": err_msg,
        })

    print(f"[WhatsApp] Recipient normalized: {mask_recipient(api_recipient)}")
    print(f"[WhatsApp] Phone Number ID configured: {'YES' if bool(settings.WHATSAPP_PHONE_NUMBER_ID) else 'NO'}")

    if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        err = "WhatsApp Cloud API credentials (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID) are missing from backend settings."
        print(f"[WhatsApp] Configuration error: {err}")
        return WhatsAppResult({
            "success": False,
            "status_code": 500,
            "error_code": "CREDENTIALS_MISSING",
            "error_message": err,
            "detail": err,
        })

    url = (
        f"https://graph.facebook.com/"
        f"{settings.WHATSAPP_API_VERSION}/"
        f"{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    )

    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": api_recipient,
        "type": "text",
        "text": {
            "body": message
        },
    }

    try:
        print("[WhatsApp] API request: SENT")
        response = httpx.post(
            url,
            headers=headers,
            json=payload,
            timeout=20,
        )

        status_code = response.status_code
        print(f"[WhatsApp] API response status: {status_code}")

        if response.is_success:
            data = response.json()
            msg_id = ""
            if "messages" in data and len(data["messages"]) > 0:
                msg_id = data["messages"][0].get("id", "")
            print(f"[WhatsApp] API response error code: NONE")
            print(f"[WhatsApp] API response message: SUCCESS (Message ID: {msg_id})")
            return WhatsAppResult({
                "success": True,
                "status_code": status_code,
                "message_id": msg_id,
                "phone": stored_num,
                "error": None,
                "detail": "WhatsApp message sent successfully."
            })

        # Parse Meta error response
        error_code = "UNKNOWN"
        error_msg = response.text
        human_detail = f"WhatsApp API error ({status_code})."

        try:
            err_json = response.json().get("error", {})
            error_code = str(err_json.get("code", status_code))
            error_subcode = str(err_json.get("error_subcode", ""))
            error_msg = err_json.get("message", response.text)
            err_data = err_json.get("error_data", {})
            err_details = str(err_data.get("details", ""))

            if status_code == 401 or error_code == "190":
                human_detail = "WhatsApp Cloud API access token is invalid or expired. Please update WHATSAPP_ACCESS_TOKEN in Meta App Dashboard."
            elif error_code == "131030":
                if "allowed list" in err_details.lower() or "allowed list" in error_msg.lower():
                    human_detail = f"Recipient phone number ({stored_num}) is not in Meta's allowed test list. In the Meta App Dashboard under WhatsApp > API Setup > 'To' phone number, add {stored_num} to the test recipient list and verify via OTP."
                else:
                    human_detail = "WhatsApp Cloud API requires an approved message template to initiate messaging outside the 24-hour customer service window."
            elif error_code == "131026":
                human_detail = f"Message undeliverable: The recipient number ({stored_num}) is not registered or not permitted to receive messages in development mode. Add it to your Meta App Dashboard test recipient list."
            elif error_code in ("100", "33"):
                human_detail = f"WhatsApp configuration error ({error_code}): {error_msg}. Please verify WHATSAPP_PHONE_NUMBER_ID in backend/.env."
            elif err_details:
                human_detail = f"WhatsApp API ({error_code}): {err_details}"
            else:
                human_detail = f"WhatsApp Cloud API rejected request ({error_code}): {error_msg}"
        except Exception:
            pass

        print(f"[WhatsApp] API response error code: {error_code}")
        print(f"[WhatsApp] API response message: {error_msg}")

        return WhatsAppResult({
            "success": False,
            "status_code": status_code,
            "error_code": error_code,
            "error_message": error_msg,
            "detail": human_detail,
        })

    except Exception as exc:
        print(f"[WhatsApp] API response error code: EXCEPTION")
        print(f"[WhatsApp] API response message: {str(exc)}")
        return WhatsAppResult({
            "success": False,
            "status_code": 500,
            "error_code": "NETWORK_EXCEPTION",
            "error_message": str(exc),
            "detail": f"Network error connecting to WhatsApp Cloud API: {str(exc)}",
        })