'use client';

import { useState, useEffect } from 'react';
import QuestionScreen from './QuestionScreen';
import SubmittedScreen from './SubmittedScreen';
import GameFinished from './GameFinished';
import { api, tokenStorage, RoomResponse, Question } from '../lib/api';

interface PlayerGameProps {
  roomId: string;
}

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  points: number;
}

type GameState = 'question' | 'submitted' | 'finished';

export default function PlayerGame({ roomId }: PlayerGameProps) {
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('question');
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [timer, setTimer] = useState<number | undefined>(undefined);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const playerToken = tokenStorage.getPlayerToken(roomId);

  useEffect(() => {
    fetchRoom();
    // Poll for room updates
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [roomId]);

  const fetchRoom = async () => {
    try {
      const roomData = await api.getRoom(roomId);
      setRoom(roomData);

      // Check if game has started
      if (roomData.status === 'started' && roomData.questions) {
        setIsLoading(false);
        
        // Update leaderboard (mock for now - will need API endpoint)
        updateLeaderboard(roomData);
      } else if (roomData.status === 'finished') {
        setGameState('finished');
        setIsLoading(false);
        // Update leaderboard for finished game
        updateLeaderboard(roomData);
      }
    } catch (err) {
      console.error('Error fetching room:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game');
      setIsLoading(false);
    }
  };

  const updateLeaderboard = (roomData: RoomResponse) => {
    // Mock leaderboard - in real implementation, this would come from API
    const mockLeaderboard: LeaderboardEntry[] = roomData.players
      .map((player, index) => ({
        rank: index + 1,
        playerName: player.playerName,
        points: Math.floor(Math.random() * 100), // Mock points
      }))
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
      .slice(0, 3); // Top 3

    setLeaderboard(mockLeaderboard);
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!room || !room.questions) return;

    const currentQuestion = room.questions[currentQuestionIndex];
    const correct = answer.toLowerCase().trim() === currentQuestion.options[currentQuestion.correctAnswer].toLowerCase().trim();

    setSubmittedAnswer(answer);
    setIsCorrect(correct);
    setGameState('submitted');

    // TODO: Submit answer to API when endpoint is available
    // await api.submitAnswer(roomId, playerToken, currentQuestion.id, answer);

    // Auto-advance to next question after 3 seconds (or wait for all players)
    setTimeout(() => {
      if (currentQuestionIndex < room.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setGameState('question');
        setSubmittedAnswer('');
      } else {
        // Game finished
        setGameState('finished');
      }
    }, 3000);
  };

  // Start timer when question is shown
  useEffect(() => {
    if (gameState === 'question' && room?.timePerQuestion) {
      setTimer(room.timePerQuestion);
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev === undefined || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameState, currentQuestionIndex, room?.timePerQuestion]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timer === 0 && gameState === 'question' && room && room.questions && currentQuestionIndex < room.questions.length) {
      const currentQuestion = room.questions[currentQuestionIndex];
      const correct = false; // Timeout means wrong
      setSubmittedAnswer('');
      setIsCorrect(correct);
      setGameState('submitted');
      
      setTimeout(() => {
        if (currentQuestionIndex < room.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setGameState('question');
          setSubmittedAnswer('');
        } else {
          setGameState('finished');
        }
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer]);

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#4b5563', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        Loading game...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#4b5563', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        Error: {error}
      </div>
    );
  }

  if (!room || !room.questions || room.questions.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#4b5563', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        Waiting for game to start...
      </div>
    );
  }

  const currentQuestion = room.questions[currentQuestionIndex];
  const questionText = currentQuestion.question;

  if (gameState === 'finished') {
    return (
      <GameFinished
        totalQuestions={room.questionsPerRound}
        finalScore={timer}
        leaderboard={leaderboard}
      />
    );
  }

  if (gameState === 'submitted') {
    return (
      <SubmittedScreen
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={room.questionsPerRound}
        isCorrect={isCorrect}
        submittedAnswer={submittedAnswer}
        leaderboard={leaderboard}
      />
    );
  }

  return (
    <QuestionScreen
      currentQuestion={currentQuestionIndex + 1}
      totalQuestions={room.questionsPerRound}
      timer={timer}
      question={questionText}
      onSubmit={handleSubmitAnswer}
    />
  );
}
