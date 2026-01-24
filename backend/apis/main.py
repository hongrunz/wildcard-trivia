"""
FastAPI application main file
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from uuid import UUID
import os

from apis.rooms import router as rooms_router
from apis.websocket import manager
from storage.client import get_redis_client

app = FastAPI(
    title="Ultimate Trivia API",
    description="Backend API for Ultimate Trivia Game",
    version="1.0.0"
)

# Configure CORS - allow both local and production origins
allowed_origins = [
    "http://localhost:3000",  # Next.js dev server
    os.getenv("FRONTEND_URL", ""),  # Production frontend URL from Railway
]
# Filter out empty strings
allowed_origins = [origin for origin in allowed_origins if origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(rooms_router)


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """WebSocket endpoint for real-time room updates"""
    try:
        await manager.connect(websocket, room_id)
        
        # Keep connection alive and listen for messages
        while True:
            # Receive messages from client (if any)
            data = await websocket.receive_text()
            # Echo back or handle client messages if needed
            # For now, we just keep the connection alive
    except WebSocketDisconnect as e:
        await manager.disconnect(websocket, room_id)
    except Exception as e:
        try:
            await manager.disconnect(websocket, room_id)
        except:
            pass


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Ultimate Trivia API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}
