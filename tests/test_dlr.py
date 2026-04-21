import asyncio
import logging
import sys
import os

# Add parent directory to path to allow importing app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock settings before importing anything that uses them
from unittest.mock import MagicMock
import sys

# Create a mock settings object
mock_settings = MagicMock()
mock_settings.SQLALCHEMY_DATABASE_URI = "sqlite+aiosqlite:///:memory:"
mock_settings.PROJECT_NAME = "Test"
mock_settings.VERSION = "1.0.0"

# Inject it into sys.modules
sys.modules['app.core.config'] = MagicMock(settings=mock_settings)

from app.workers.dlr_worker import _async_process_dlr
from app.db.session import SessionLocal, engine
from app.db.models import Base, SMSMessage, MessageStatus, DeliveryReportLog
from sqlalchemy import delete

logging.basicConfig(level=logging.INFO)

async def test_dlr_processing():
    """
    Manually test the DLR processing logic.
    1. Create a dummy SMSMessage.
    2. Simulate a DLR payload.
    3. Call _async_process_dlr.
    4. Verify DB changes.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        # Cleanup previous tests
        await db.execute(delete(DeliveryReportLog))
        await db.execute(delete(SMSMessage))
        await db.commit()

        # 1. Setup dummy message
        msg = SMSMessage(
            sender="TEST",
            recipient="233240000000",
            content="Verification Test",
            status=MessageStatus.SENT,
            provider_name="MTN Ghana",
            provider_msg_id="prov_12345",
            user_id=1,
            organization_id=1
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        print(f"Created SMSMessage with id: {msg.id}")

        # 2. Simulate DLR data
        dlr_payload = {
            "id": "prov_12345",
            "stat": "DELIVRD",
            "err": "000",
            "sub": "001",
            "dlvrd": "001",
            "raw": "id:prov_12345 sub:001 dlvrd:001 submit date:2302072045 done date:2302072045 stat:DELIVRD err:000 text:Test message"
        }

        # 3. Process DLR
        print("Processing simulated DLR...")
        await _async_process_dlr(dlr_payload)

        # 4. Verify
        await db.refresh(msg)
        print(f"Message Status: {msg.status}")
        print(f"Delivered At: {msg.delivered_at}")

        # Check Logs
        from sqlalchemy import select
        stmt = select(DeliveryReportLog).where(DeliveryReportLog.provider_msg_id == "prov_12345")
        result = await db.execute(stmt)
        log = result.scalar_one_or_none()
        
        if log:
            print(f"DeliveryReportLog created successfully: ID={log.id}")
            print(f"Raw Content: {log.raw_content}")
        else:
            print("FAILED: DeliveryReportLog not created.")

        if msg.status == MessageStatus.DELIVERED and msg.delivered_at is not None:
            print("SUCCESS: Message status updated to DELIVERED.")
        else:
            print("FAILED: Message status not updated correctly.")

if __name__ == "__main__":
    asyncio.run(test_dlr_processing())
