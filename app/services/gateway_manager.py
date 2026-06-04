import asyncio
import logging
from typing import Dict, List, Optional, Type, Any
from app.services.adapters.base import BaseMNOAdapter
from app.services.adapters.mtn import MTNAdapter
from app.services.adapters.vodafone import VodafoneAdapter
from app.services.adapters.airteltigo import AirtelTigoAdapter
from app.services.sms.factory import get_sms_provider
from app.db.models import MessageStatus, SMPPAccount
from app.core.phone_utils import detect_network, Network
from app.core.config import settings
from sqlalchemy.future import select
from app.db.database import SessionLocal

logger = logging.getLogger(__name__)

class GatewayManager:
    """
    Manages multiple MNO connections using the Adapter Pattern.
    """

    def __init__(self):
        self.adapters: Dict[str, BaseMNOAdapter] = {}
        self._is_initialized = False

    def _get_adapter_class(self, provider_name: str) -> Optional[Type[BaseMNOAdapter]]:
        """Map provider strings to adapter classes."""
        mapping = {
            "MTN Ghana": MTNAdapter,
            "Vodafone Ghana": VodafoneAdapter,
            "AirtelTigo Ghana": AirtelTigoAdapter
        }
        return mapping.get(provider_name)

    async def initialize_from_db(self):
        """Fetch active SMPP accounts and initialize their respective adapters."""
        if settings.SMS_PROVIDER.lower() == "arkesel":
            self._is_initialized = True
            logger.info("SMS_PROVIDER is Arkesel; skipping SMPP adapter initialization.")
            return

        async with SessionLocal() as session:
            result = await session.execute(select(SMPPAccount).where(SMPPAccount.is_active == True))
            accounts = result.scalars().all()
            
            for acc in accounts:
                adapter_cls = self._get_adapter_class(acc.provider_name)
                if not adapter_cls:
                    logger.warning(f"No adapter implementation found for provider: {acc.provider_name}")
                    continue

                adapter = adapter_cls(
                    provider_id=acc.provider_name,
                    host=acc.host,
                    port=acc.port,
                    system_id=acc.system_id,
                    password=acc.password,
                    system_type=acc.system_type
                )
                self.adapters[acc.provider_name] = adapter
                
                # Set up Delivery Report (DLR) callback
                from app.core.queue import enqueue_dlr
                adapter.on_dlr_received = lambda data: asyncio.create_task(enqueue_dlr(data))

                # Maintain connection
                asyncio.create_task(self._maintain_connection(adapter))
        
        self._is_initialized = True
        logger.info(f"Initialized {len(self.adapters)} MNO adapters.")

    async def _maintain_connection(self, adapter: BaseMNOAdapter):
        """Persistent connection management for an adapter."""
        while True:
            try:
                await adapter.connect()
                # Wait until it disconnects
                while adapter.is_connected():
                    await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Adapter {adapter.provider_id} crashed, restarting in 10s: {e}")
                await asyncio.sleep(10)

    async def route_message(self, recipient: str) -> str:
        """
        Routing logic to determine which MNO gateway to use.
        Uses the phone_utils to detect the network based on prefix.
        """
        if settings.SMS_PROVIDER.lower() == "arkesel":
            return "Arkesel"

        network, _ = detect_network(recipient)
        
        if network == Network.UNKNOWN:
            return "MTN Ghana" # Default fallback
            
        return network.value

    async def send_sms(self, recipient: str, sender: str, content: str, provider_name: str = None) -> Dict:
        """
        Send SMS using the active provider or a specific routed adapter.
        """
        if settings.SMS_PROVIDER.lower() == "arkesel":
            provider = get_sms_provider()
            return await provider.send(recipient, sender, content)

        # 1. Try to use a routed adapter if provider_name is specified
        if provider_name and provider_name in self.adapters:
            adapter = self.adapters[provider_name]
            if adapter.is_connected():
                logger.info(f"Using routed adapter for {provider_name}")
                try:
                    provider_msg_id = await adapter.send_sms(recipient, sender, content)
                    if provider_msg_id:
                        return {
                            "status": "success",
                            "provider_msg_id": provider_msg_id,
                            "raw_response": {"provider": provider_name},
                        }
                    return {"status": "error", "message": f"{provider_name} adapter returned no message id"}
                except Exception as e:
                    logger.error(f"Adapter send failed for {provider_name}: {e}")
                    return {"status": "error", "message": str(e)}
            else:
                logger.warning(f"Routed adapter for {provider_name} is offline, falling back to default.")

        # 2. Fallback to default provider (e.g. Arkesel/Hubtel via API)
        provider = get_sms_provider()
        return await provider.send(recipient, sender, content)

    def is_provider_ready(self, provider_name: Optional[str] = None) -> bool:
        """
        Check if the routed provider is available.
        """
        if settings.SMS_PROVIDER.lower() == "arkesel":
            provider = get_sms_provider()
            return bool(getattr(provider, "api_key", None))

        if provider_name in self.adapters:
            adapter = self.adapters[provider_name]
            if adapter.is_connected():
                return True
            logger.warning(f"Routed adapter for {provider_name} is not connected; checking fallback provider.")

        provider = get_sms_provider()
        # For Arkesel, check API Key
        if hasattr(provider, 'api_key'):
            return bool(provider.api_key)

        # Hubtel and MTN SMPP providers are still placeholders in this codebase.
        if provider.__class__.__name__ in {"HubtelProvider", "MTNSMPPProvider"}:
            return False

        return True

# Global Manager Instance
gateway_manager = GatewayManager()
