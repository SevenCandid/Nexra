from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.core.websocket import manager
from app.api import deps
from app.db.models import User
from app.core.security import get_user_from_token
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    Real-time update stream.
    Requires a valid JWT token in the URL for authentication.
    """
    try:
        # 1. Authenticate user from token
        user = await get_user_from_token(token)
        if not user:
            await websocket.close(code=1008) # Policy Violation
            return

        org_id = user.organization_id
        
        # 2. Connect
        await manager.connect(websocket, org_id)
        
        try:
            # 3. Keep connection alive and wait for client messages (if any)
            while True:
                data = await websocket.receive_text()
                # We don't expect messages from client, but keeping it open
                pass
        except WebSocketDisconnect:
            manager.disconnect(websocket, org_id)
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
            manager.disconnect(websocket, org_id)
            
    except Exception as e:
        logger.error(f"WebSocket auth error: {str(e)}")
        await websocket.close(code=1011) # Internal Error
