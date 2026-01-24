'use client';

import { useState, useEffect } from 'react';
import { RoomResponse } from './api';

interface UseGameTimerOptions {
  room: RoomResponse | null;
  gameStartedAt: Date | null;
  gameState: 'question' | 'submitted' | 'finished';
  onGameFinished: () => void;
  onTimerExpired: () => void;
  onQuestionChanged: () => void;
}

export function useGameTimer({
  room,
  gameStartedAt,
  gameState,
  onGameFinished,
  onTimerExpired,
  onQuestionChanged,
}: UseGameTimerOptions) {
  const [timer, setTimer] = useState<number | undefined>(undefined);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Game timer synchronized with server timestamp
  useEffect(() => {
    const shouldRunTimer = 
      (gameState === 'question' || gameState === 'submitted') && 
      room?.timePerQuestion && 
      gameStartedAt && 
      room.questions;

    if (!shouldRunTimer) return;

    const updateTimer = () => {
      if (!room.questions) return;
      
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - gameStartedAt.getTime()) / 1000);
      
      // Handle clock skew by treating negative values as 0
      const validElapsedSeconds = Math.max(0, elapsedSeconds);
      
      const calculatedQuestionIndex = Math.floor(validElapsedSeconds / room.timePerQuestion);
      const timeInCurrentRound = validElapsedSeconds % room.timePerQuestion;
      
      // Sync question index if needed
      if (calculatedQuestionIndex !== currentQuestionIndex && calculatedQuestionIndex < room.questions.length) {
        setCurrentQuestionIndex(calculatedQuestionIndex);
        onQuestionChanged();
      }
      
      // Check if game finished
      if (calculatedQuestionIndex >= room.questions.length) {
        onGameFinished();
        return;
      }
      
      // Update timer
      const remainingTime = room.timePerQuestion - timeInCurrentRound;
      setTimer(Math.max(0, remainingTime));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [gameState, currentQuestionIndex, room?.timePerQuestion, room?.questions, gameStartedAt, onGameFinished, onQuestionChanged]);

  // Auto-submit when timer reaches 0 if user hasn't submitted yet
  useEffect(() => {
    if (timer === 0 && gameState === 'question') {
      onTimerExpired();
    }
  }, [timer, gameState, onTimerExpired]);

  return {
    timer,
    currentQuestionIndex,
  };
}
