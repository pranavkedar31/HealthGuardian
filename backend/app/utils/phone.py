"""
Phone number normalization utility for HealthGuardian.
Normalizes Indian and international phone numbers safely.
"""
import re
from typing import Tuple


def normalize_phone_number(raw_phone: str) -> Tuple[bool, str, str, str]:
    """
    Normalizes a given phone number.
    
    Returns:
        (is_valid, stored_format, api_format, error_message)
        
    Examples:
        '9922248081'      -> (True, '+919922248081', '919922248081', '')
        '+919922248081'   -> (True, '+919922248081', '919922248081', '')
        '919922248081'    -> (True, '+919922248081', '919922248081', '')
        '+91 99222 48081' -> (True, '+919922248081', '919922248081', '')
        '91 99222 48081'  -> (True, '+919922248081', '919922248081', '')
    """
    if not raw_phone or not isinstance(raw_phone, str):
        return False, "", "", "Phone number cannot be empty."

    # Strip spaces, dashes, parentheses
    cleaned = re.sub(r"[\s\-\(\)]", "", raw_phone.strip())
    if not cleaned:
        return False, "", "", "Phone number cannot be empty."

    # If it starts with '+', keep track
    has_plus = cleaned.startswith("+")
    digits_only = re.sub(r"\D", "", cleaned)

    if not digits_only:
        return False, "", "", "Phone number must contain digits."

    # Case 1: 10-digit Indian mobile number
    if len(digits_only) == 10:
        if digits_only[0] not in "6789":
            return False, "", "", "Invalid Indian mobile number: Must start with 6, 7, 8, or 9."
        stored_format = f"+91{digits_only}"
        api_format = f"91{digits_only}"
        return True, stored_format, api_format, ""

    # Case 2: 11-digit starting with 0 (e.g. 09922248081)
    if len(digits_only) == 11 and digits_only.startswith("0"):
        core_10 = digits_only[1:]
        if core_10[0] not in "6789":
            return False, "", "", "Invalid Indian mobile number: Must start with 6, 7, 8, or 9."
        stored_format = f"+91{core_10}"
        api_format = f"91{core_10}"
        return True, stored_format, api_format, ""

    # Case 3: 12-digit Indian number starting with 91 (e.g. 919922248081 or +919922248081)
    if len(digits_only) == 12 and digits_only.startswith("91"):
        core_10 = digits_only[2:]
        if core_10[0] not in "6789":
            return False, "", "", "Invalid Indian mobile number: Must start with 6, 7, 8, or 9."
        stored_format = f"+91{core_10}"
        api_format = f"91{core_10}"
        return True, stored_format, api_format, ""

    # Case 4: Other international numbers (between 10 and 15 digits)
    if 10 <= len(digits_only) <= 15:
        stored_format = f"+{digits_only}"
        api_format = digits_only
        return True, stored_format, api_format, ""

    return False, "", "", f"Invalid phone number length ({len(digits_only)} digits). Expected 10-digit mobile number."
