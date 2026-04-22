import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps organization_id to a set of active WebSockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, org_id: int):
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = set()
        self.active_connections[org_id].add(websocket)
        logger.info(f"WebSocket connected for Organization {org_id}. Total connections: {len(self.active_connections[org_id])}")

    def disconnect(self, websocket: WebSocket, org_id: int):
        if org_id in self.active_connections:
            self.active_connections[org_id].discard(websocket)
            if not self.active_connections[org_id]:
                del self.active_connections[org_id]
        logger.info(f"WebSocket disconnected for Organization {org_id}.")

    async def broadcast_to_org(self, org_id: int, message: dict):
        if org_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[org_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    disconnected.add(connection)
            
            for conn in disconnected:
                self.disconnect(conn, org_id)

# Global Manager
manager = ConnectionManager()
