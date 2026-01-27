'use client';

import { useState, useEffect } from 'react';
import { RoomResponse } from './api';

interface UseGameTimerDisplayOptions {
  room: RoomResponse | null;
  gameState: 'question' | 'submitted' | 'roundFinished' | 'newRound' | 'finished';
  gameStartedAt: Date | null;
  currentQuestionIndex: number; // Current question index (0-indexed)
}

const ROUND_BREAK_TIME_SECONDS = 10;

/**
 * Simple hook to provide timer display values
 * Note: This is a display-only hook. The actual timer logic is handled by the state machine.
 */
export function useGameTimerDisplay({
  room,
  gameState,
  gameStartedAt,
  currentQuestionIndex,
}: UseGameTimerDisplayOptions) {
  const [timer, setTimer] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!room?.timePerQuestion) {
      // Use setTimeout to avoid synchronous setState
      const timeout = setTimeout(() => setTimer(undefined), 0);
      return () => clearTimeout(timeout);
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    if (gameState === 'question' && gameStartedAt) {
      // Calculate remaining time based on server time for synchronization
      const updateTimer = () => {
        const now = new Date();
        const elapsedMs = now.getTime() - gameStartedAt.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        // Handle clock skew - if elapsed time is negative, don't show timer
        if (elapsedSeconds < 0) {
          setTimer(undefined);
          return;
        }
        
        // Calculate time for current question cycle using currentQuestionIndex
        const REVIEW_TIME_SECONDS = 8;
        const totalTimePerCycle = room.timePerQuestion + REVIEW_TIME_SECONDS;
        
        // Calculate when the current question cycle started
        const cycleStartTime = currentQuestionIndex * totalTimePerCycle;
        const timeInCurrentCycle = elapsedSeconds - cycleStartTime;
        
        if (timeInCurrentCycle >= 0 && timeInCurrentCycle < room.timePerQuestion) {
          // We're in the question phase
          const remaining = room.timePerQuestion - timeInCurrentCycle;
          setTimer(Math.max(0, Math.ceil(remaining)));
        } else if (timeInCurrentCycle < 0) {
          // We haven't reached this question cycle yet (clock skew or timing issue)
          setTimer(undefined);
        } else {
          // We're past the question phase
          setTimer(undefined);
        }
      };
      
      // Initial calculation with setTimeout to avoid synchronous setState
      setTimeout(updateTimer, 0);
      interval = setInterval(updateTimer, 100); // Update every 100ms
    } else if (gameState === 'submitted' && gameStartedAt) {
      // Calculate remaining review time based on server time
      const updateTimer = () => {
        const now = new Date();
        const elapsedMs = now.getTime() - gameStartedAt.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        // Handle clock skew - if elapsed time is negative, don't show timer
        if (elapsedSeconds < 0) {
          setTimer(undefined);
          return;
        }
        
        const REVIEW_TIME_SECONDS = 8;
        const totalTimePerCycle = room.timePerQuestion + REVIEW_TIME_SECONDS;
        
        // Calculate when the current question cycle started
        const cycleStartTime = currentQuestionIndex * totalTimePerCycle;
        const timeInCurrentCycle = elapsedSeconds - cycleStartTime;
        const timeInReview = timeInCurrentCycle - room.timePerQuestion;
        
        if (timeInReview >= 0 && timeInReview < REVIEW_TIME_SECONDS) {
          const remaining = REVIEW_TIME_SECONDS - timeInReview;
          setTimer(Math.max(0, Math.ceil(remaining)));
        } else {
          setTimer(undefined); // Don't show timer if calculation is invalid
        }
      };
      
      setTimeout(updateTimer, 0);
      interval = setInterval(updateTimer, 100);
    } else if (gameState === 'roundFinished') {
      // Countdown from round break time
      let remaining = ROUND_BREAK_TIME_SECONDS;
      setTimeout(() => setTimer(remaining), 0);
      
      interval = setInterval(() => {
        remaining -= 0.1;
        if (remaining <= 0) {
          setTimer(0);
          if (interval) clearInterval(interval);
        } else {
          setTimer(Math.ceil(remaining));
        }
      }, 100);
    } else {
      setTimeout(() => setTimer(undefined), 0);
    }

      return () => {
        if (interval) clearInterval(interval);
      };
    }, [gameState, room?.timePerQuestion, gameStartedAt, currentQuestionIndex]);

  return {
    timer,
  };
}
