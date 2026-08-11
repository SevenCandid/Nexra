import asyncio
import io
import csv
from app.db.database import get_db
from app.api.v1.endpoints.contacts import upload_contacts
from fastapi import UploadFile
from app.db.models import User
from sqlalchemy.ext.asyncio import AsyncSession

class MockUser:
    id = 1
    organization_id = 1

async def test():
    # Setup mock file
    content = b"name,phone\nKofi,0241234567\nAma,233501234567\n"
    file = UploadFile(filename="test.csv", file=io.BytesIO(content))
    
    # Setup mock DB session generator
    async for db in get_db():
        try:
            res = await upload_contacts(file=file, group_id=None, db=db, current_user=MockUser())
            print(res)
        except Exception as e:
            import traceback
            traceback.print_exc()
        break

if __name__ == "__main__":
    asyncio.run(test())
