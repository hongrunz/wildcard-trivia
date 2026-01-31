'use client';

import { useState, useEffect } from 'react';
import { RoomResponse } from './api';

const REVIEW_TIME_SECONDS = 8;

interface UseGameTimerDisplayOptions {
  room: RoomResponse | null;
  gameState: 'question' | 'submitted' | 'roundFinished' | 'newRound' | 'finished';
  /** When the current question was shown; used so the question timer resets per question and uses timePerQuestion. */
  questionStartedAt: Date | null;
  /** When answer revelation started; used for review-phase countdown. */
  reviewStartedAt?: Date | null;
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
  questionStartedAt,
  reviewStartedAt = null,
  currentQuestionIndex,
}: UseGameTimerDisplayOptions) {
  const [timer, setTimer] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (gameState === 'submitted') {
      // Answer revelation: timer starts when we enter this state (all answered or question time expired)
      if (reviewStartedAt) {
        const updateTimer = () => {
          const now = new Date();
          const elapsedMs = now.getTime() - reviewStartedAt.getTime();
          const remainingSeconds = REVIEW_TIME_SECONDS - elapsedMs / 1000;
          setTimer(remainingSeconds <= 0 ? 0 : Math.ceil(remainingSeconds));
        };
        setTimeout(updateTimer, 0);
        const interval = setInterval(updateTimer, 100);
        return () => clearInterval(interval);
      }
      const timeout = setTimeout(() => setTimer(undefined), 0);
      return () => clearTimeout(timeout);
    }

    if (gameState === 'question' && questionStartedAt && room?.timePerQuestion) {
      // Question phase: show remaining time from when this question started (always uses timePerQuestion)
      let interval: ReturnType<typeof setInterval> | null = null;
      const updateTimer = () => {
        const now = new Date();
        const elapsedMs = now.getTime() - questionStartedAt.getTime();
        const elapsedSeconds = elapsedMs / 1000;
        const remaining = room!.timePerQuestion - elapsedSeconds;
        if (remaining <= 0) {
          setTimer(0);
        } else {
          setTimer(Math.ceil(remaining));
        }
      };
      setTimeout(updateTimer, 0);
      interval = setInterval(updateTimer, 100);
      return () => {
        if (interval) clearInterval(interval);
      };
    }

    if (gameState === 'question' && (!questionStartedAt || !room?.timePerQuestion)) {
      const timeout = setTimeout(() => setTimer(undefined), 0);
      return () => clearTimeout(timeout);
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    if (gameState === 'roundFinished') {
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
    }, [gameState, room?.timePerQuestion, questionStartedAt, reviewStartedAt, currentQuestionIndex]);

  return {
    timer,
  };
}
