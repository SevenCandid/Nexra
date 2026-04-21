import re
from enum import Enum
from typing import Optional, Tuple

class Network(str, Enum):
    MTN = "MTN Ghana"
    VODAFONE = "Vodafone Ghana"
    AIRTELTIGO = "AirtelTigo Ghana"
    UNKNOWN = "Unknown"

# Mapping of prefix to Network
# Reference: NCA Ghana Numbering Plan
NETWORK_PREFIXES = {
    # MTN Ghana
    "24": Network.MTN,
    "54": Network.MTN,
    "55": Network.MTN,
    "59": Network.MTN,
    "25": Network.MTN,
    "53": Network.MTN,
    
    # Vodafone Ghana (Telecel)
    "20": Network.VODAFONE,
    "50": Network.VODAFONE,
    
    # AirtelTigo (AT)
    "26": Network.AIRTELTIGO,
    "27": Network.AIRTELTIGO,
    "56": Network.AIRTELTIGO,
    "57": Network.AIRTELTIGO,
}

def normalize_phone_number(phone: str) -> str:
    """
    Normalizes a Ghana phone number to E.164 format (+233XXXXXXXXX).
    Handles:
    - 0244123456 -> +233244123456
    - 244123456 -> +233244123456
    - +233244123456 -> +233244123456
    - 00233244123456 -> +233244123456
    - Parentheses, dashes, and spaces
    """
    # Remove all non-numeric characters except +
    clean = re.sub(r'[^\d+]', '', phone)
    
    # Handle 00 prefix
    if clean.startswith('00'):
        clean = '+' + clean[2:]
        
    # If it already starts with +233, just return it (assuming lengths are correct)
    if clean.startswith('+233'):
        return clean
    
    # If it starts with 233 but no +, add it
    if clean.startswith('233') and len(clean) >= 12:
        return '+' + clean
        
    # If it starts with 0, replace with +233
    if clean.startswith('0'):
        # Ensure it's not just a country code elsewhere
        if len(clean) == 10:
            return '+233' + clean[1:]
            
    # If it's 9 digits (244123456), add +233
    if len(clean) == 9:
        return '+233' + clean

    return clean

def detect_network(phone: str) -> Tuple[Network, str]:
    """
    Detects the network provider and returns the normalized number.
    Returns (Network, normalized_number)
    """
    normalized = normalize_phone_number(phone)
    
    # For Ghana numbers starting with +233
    if normalized.startswith('+233') and len(normalized) == 13:
        prefix = normalized[4:6] # Get the 24, 20, etc.
        network = NETWORK_PREFIXES.get(prefix, Network.UNKNOWN)
        return network, normalized
        
    return Network.UNKNOWN, normalized

def validate_ghana_number(phone: str) -> bool:
    """Basic validation for Ghana MSISDNs."""
    normalized = normalize_phone_number(phone)
    # Ghana numbers in E.164 are exactly 13 characters: +233 followed by 9 digits
    return bool(re.match(r'^\+233\d{9}$', normalized))
