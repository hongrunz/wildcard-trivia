'use client';

import { useState, useEffect } from 'react';
import { RoomResponse } from './api';

interface UseGameTimerOptions {
  room: RoomResponse | null;
  gameStartedAt: Date | null;
  gameState: 'question' | 'waiting' | 'submitted' | 'round_finished' | 'finished';
  onGameFinished: () => void;
  onRoundFinished?: () => void;  // Called when a round completes (but more rounds remain)
  onTimerExpired: () => void;
  onQuestionChanged: () => void;
}

const REVIEW_TIME_SECONDS = 8; // Time to show answer and leaderboard
const ROUND_BREAK_TIME_SECONDS = 10; // Time between rounds

export function useGameTimer({
  room,
  gameStartedAt,
  gameState,
  onGameFinished,
  onRoundFinished,
  onTimerExpired,
  onQuestionChanged,
}: UseGameTimerOptions) {
  const [timer, setTimer] = useState<number | undefined>(undefined);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Game timer synchronized with server timestamp
  useEffect(() => {
    const shouldRunTimer = 
      (gameState === 'question' || gameState === 'waiting' || gameState === 'submitted' || gameState === 'round_finished') && 
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
      
      // Total time per question cycle = answer time + review time
      const totalTimePerCycle = room.timePerQuestion + REVIEW_TIME_SECONDS;
      const calculatedQuestionIndex = Math.floor(validElapsedSeconds / totalTimePerCycle);
      const timeInCurrentCycle = validElapsedSeconds % totalTimePerCycle;
      
      // Check if we're in the review phase (submitted screen showing)
      const isInReviewPhase = timeInCurrentCycle >= room.timePerQuestion;
      
      // Sync question index if needed (only for questions that exist)
      if (calculatedQuestionIndex !== currentQuestionIndex && calculatedQuestionIndex < room.questions.length) {
        setCurrentQuestionIndex(calculatedQuestionIndex);
        onQuestionChanged(); // Reset to 'question' state for the new question
      }
      
      // Force transition to submitted when entering review phase
      if (isInReviewPhase && gameState === 'waiting') {
        onTimerExpired();
      }
      
      // Handle the last question specially - ensure submitted screen shows
      if (calculatedQuestionIndex === room.questions.length - 1 && isInReviewPhase) {
        // We're in the review phase of the LAST question
        const timeInReview = timeInCurrentCycle - room.timePerQuestion;
        const remainingReviewTime = REVIEW_TIME_SECONDS - timeInReview;
        setTimer(Math.max(0, remainingReviewTime));
        
        // When review of last question is done, transition to next state
        if (remainingReviewTime === 0) {
          const hasMoreRounds = room.currentRound < room.numRounds;
          if (hasMoreRounds && onRoundFinished) {
            onRoundFinished();
          } else {
            onGameFinished();
          }
        }
        return;
      }
      
      // Check if we've completely exceeded all questions + review time
      if (calculatedQuestionIndex >= room.questions.length) {
        // All questions AND review time are done
        const hasMoreRounds = room.currentRound < room.numRounds;
        if (hasMoreRounds && onRoundFinished) {
          onRoundFinished();
        } else {
          onGameFinished();
        }
        return;
      }
      
      // Update timer based on current phase (for non-last questions)
      if (timeInCurrentCycle < room.timePerQuestion) {
        // Answer phase (question or waiting)
        const remainingTime = room.timePerQuestion - timeInCurrentCycle;
        setTimer(Math.max(0, remainingTime));
      } else {
        // We're now in review phase
        // First, ensure we've transitioned from 'question' to 'waiting'
        if (gameState === 'question') {
          onTimerExpired();
        }
        
        // Review phase (submitted)
        const timeInReview = timeInCurrentCycle - room.timePerQuestion;
        const remainingReviewTime = REVIEW_TIME_SECONDS - timeInReview;
        setTimer(Math.max(0, remainingReviewTime));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [gameState, currentQuestionIndex, room?.timePerQuestion, room?.questions, room?.currentRound, room?.numRounds, gameStartedAt, onGameFinished, onQuestionChanged, onTimerExpired, onRoundFinished]);

  // Handle timer expiration based on current state
  useEffect(() => {
    if (timer === 0) {
      if (gameState === 'question') {
        // Timer expired during question phase - auto-submit and move to waiting
        onTimerExpired();
      } else if (gameState === 'waiting') {
        // Timer expired during waiting phase - move to submitted (show answer)
        onTimerExpired();
      }
      // Note: When timer expires in 'submitted' state, onQuestionChanged is called
      // automatically by the main timer logic when calculatedQuestionIndex changes
    }
  }, [timer, gameState, onTimerExpired]);

  return {
    timer,
    currentQuestionIndex,
  };
}
