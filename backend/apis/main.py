"""
FastAPI application main file
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from uuid import UUID

from apis.rooms import router as rooms_router
from db.store import RoomStore, PlayerStore

app = FastAPI(
    title="Ultimate Trivia API",
    description="Backend API for Ultimate Trivia Game",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(rooms_router)


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
