"""
WebSocket manager for real-time room updates
"""

from typing import Dict, Set
from fastapi import WebSocket
import json
import asyncio


class ConnectionManager:
    def __init__(self):
        # room_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, room_id: str):
        """Connect a client to a room"""
        await websocket.accept()
        async with self._lock:
            if room_id not in self.active_connections:
                self.active_connections[room_id] = set()
            self.active_connections[room_id].add(websocket)
    
    async def disconnect(self, websocket: WebSocket, room_id: str):
        """Disconnect a client from a room"""
        async with self._lock:
            if room_id in self.active_connections:
                self.active_connections[room_id].discard(websocket)
                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]
    
    async def broadcast_to_room(self, room_id: str, message: dict):
        """Broadcast a message to all clients in a room"""
        if room_id not in self.active_connections:
            return
        
        disconnected = set()
        message_text = json.dumps(message)
        
        for connection in self.active_connections[room_id].copy():
            try:
                await connection.send_text(message_text)
            except Exception:
                disconnected.add(connection)
        
        # Clean up disconnected clients
        if disconnected:
            async with self._lock:
                if room_id in self.active_connections:
                    self.active_connections[room_id] -= disconnected
                    if not self.active_connections[room_id]:
                        del self.active_connections[room_id]


# Global connection manager instance
manager = ConnectionManager()
