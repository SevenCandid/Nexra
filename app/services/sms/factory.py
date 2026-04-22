from app.core.config import settings
from app.services.sms.base import SMSProvider
from app.services.sms.arkesel import ArkeselProvider
from app.services.sms.hubtel import HubtelProvider
from app.services.sms.mtn_smpp import MTNSMPPProvider

def get_sms_provider() -> SMSProvider:
    provider_name = settings.SMS_PROVIDER.lower()
    
    if provider_name == "arkesel":
        return ArkeselProvider()
    elif provider_name == "hubtel":
        return HubtelProvider()
    elif provider_name == "mtn_smpp":
        return MTNSMPPProvider()
    else:
        # Fallback to Arkesel
        return ArkeselProvider()
