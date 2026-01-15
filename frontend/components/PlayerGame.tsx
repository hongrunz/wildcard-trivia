'use client';

import { useState, useEffect } from 'react';
import QuestionScreen from './QuestionScreen';
import SubmittedScreen from './SubmittedScreen';
import GameFinished from './GameFinished';
import { api, tokenStorage, RoomResponse, LeaderboardResponse } from '../lib/api';

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
  const [isCorrect, setIsCorrect] = useState(false);
  const [timer, setTimer] = useState<number | undefined>(undefined);
  const [score, setScore] = useState(0); // Track player's score: 1 point per correct answer
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const playerToken = tokenStorage.getPlayerToken(roomId);

  useEffect(() => {
    fetchRoom();
    // Poll for room updates
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Poll for leaderboard updates when game is active
  useEffect(() => {
    if (room && (room.status === 'started' || room.status === 'finished')) {
      fetchLeaderboard();
      // Poll leaderboard every 2 seconds
      const interval = setInterval(fetchLeaderboard, 2000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, roomId]);

  const fetchRoom = async () => {
    try {
      const roomData = await api.getRoom(roomId);
      setRoom(roomData);

      // Check if game has started
      if (roomData.status === 'started' && roomData.questions) {
        setIsLoading(false);
        
        // Fetch leaderboard from API
        fetchLeaderboard();
      } else if (roomData.status === 'finished') {
        setGameState('finished');
        setIsLoading(false);
        // Fetch leaderboard for finished game
        fetchLeaderboard();
      }
    } catch (err) {
      console.error('Error fetching room:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game');
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const leaderboardData: LeaderboardResponse = await api.getLeaderboard(roomId);
      
      // Get current room data to map player IDs to names
      const currentRoom = room;
      if (!currentRoom) {
        // If room not loaded yet, fetch it
        const roomData = await api.getRoom(roomId);
        setRoom(roomData);
        
        // Create a map of playerId to playerName
        const playerMap = new Map<string, string>();
        roomData.players.forEach(player => {
          playerMap.set(player.playerId, player.playerName);
        });
        
        // Map API leaderboard to UI format with player names and ranks
        const formattedLeaderboard: LeaderboardEntry[] = leaderboardData.leaderboard.map((entry, index) => ({
          rank: index + 1,
          playerName: playerMap.get(entry.playerId) || `Player ${entry.playerId.slice(0, 8)}`,
          points: entry.score,
        }));
        
        setLeaderboard(formattedLeaderboard);
      } else {
        // Create a map of playerId to playerName from current room data
        const playerMap = new Map<string, string>();
        currentRoom.players.forEach(player => {
          playerMap.set(player.playerId, player.playerName);
        });
        
        // Map API leaderboard to UI format with player names and ranks
        const formattedLeaderboard: LeaderboardEntry[] = leaderboardData.leaderboard.map((entry, index) => ({
          rank: index + 1,
          playerName: playerMap.get(entry.playerId) || `Player ${entry.playerId.slice(0, 8)}`,
          points: entry.score,
        }));
        
        setLeaderboard(formattedLeaderboard);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      // Fallback to empty leaderboard on error
      setLeaderboard([]);
    }
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!room || !room.questions || !playerToken) return;

    const currentQuestion = room.questions[currentQuestionIndex];
    
    try {
      // Submit answer to API
      const response = await api.submitAnswer(roomId, playerToken, currentQuestion.id, answer);
      
      // Update local score state
      if (response.isCorrect) {
        setScore(response.currentScore);
      }
      
      setIsCorrect(response.isCorrect);
      setGameState('submitted');
      
      // Refresh leaderboard after submitting answer
      fetchLeaderboard();
      
      // Auto-advance to next question after 7 seconds (or wait for all players)
      setTimeout(() => {
        if (!room || !room.questions) return;
        if (currentQuestionIndex < room.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setGameState('question');
          // Refresh leaderboard when moving to next question
          fetchLeaderboard();
        } else {
          // Game finished - fetch final leaderboard
          fetchLeaderboard();
          setGameState('finished');
        }
      }, 7000);
    } catch (err) {
      console.error('Error submitting answer:', err);
      // Fallback to local check if API fails
      const correct = answer.toLowerCase().trim() === currentQuestion.options[currentQuestion.correctAnswer].toLowerCase().trim();
      if (correct) {
        setScore((prevScore) => prevScore + 1);
      }
      setIsCorrect(correct);
      setGameState('submitted');
      
      setTimeout(() => {
        if (!room || !room.questions) return;
        if (currentQuestionIndex < room.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setGameState('question');
        } else {
          fetchLeaderboard();
          setGameState('finished');
        }
      }, 7000);
    }
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
      const correct = false; // Timeout means wrong
      setIsCorrect(correct);
      setGameState('submitted');
      
      setTimeout(() => {
        if (!room || !room.questions) return;
        if (currentQuestionIndex < room.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setGameState('question');
        } else {
          // Game finished - fetch final leaderboard
          fetchLeaderboard();
          setGameState('finished');
        }
      }, 7000);
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
        finalScore={score}
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
        correctAnswer={currentQuestion?.options?.[currentQuestion.correctAnswer] || ''}
        explanation={currentQuestion?.explanation || ''}
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
      options={currentQuestion.options || []}
      onSubmit={handleSubmitAnswer}
    />
  );
}
