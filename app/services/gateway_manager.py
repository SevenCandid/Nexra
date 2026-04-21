import asyncio
import logging
from typing import Dict, List, Optional, Type
from app.services.adapters.base import BaseMNOAdapter
from app.services.adapters.mtn import MTNAdapter
from app.services.adapters.vodafone import VodafoneAdapter
from app.services.adapters.airteltigo import AirtelTigoAdapter
from app.db.models import SMPPAccount
from app.core.phone_utils import detect_network, Network
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
        network, _ = detect_network(recipient)
        
        if network == Network.UNKNOWN:
            return "MTN Ghana" # Default fallback
            
        return network.value

    async def send_sms(self, recipient: str, sender: str, message: str) -> Optional[str]:
        """Route and send SMS via the appropriate adapter."""
        provider_name = await self.route_message(recipient)
        adapter = self.adapters.get(provider_name)
        
        if not adapter:
            logger.error(f"No active adapter found for provider: {provider_name}")
            return None
        
        if not adapter.is_connected():
            logger.warning(f"Adapter {provider_name} is not connected, attempting immediate send...")
        
        return await adapter.send_sms(recipient, sender, message)

    def is_provider_ready(self, provider_name: str) -> bool:
        """Check if a specific provider adapter is initialized and connected."""
        adapter = self.adapters.get(provider_name)
        return adapter is not None and adapter.is_connected()

# Global Manager Instance
gateway_manager = GatewayManager()
