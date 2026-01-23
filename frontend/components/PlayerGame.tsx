'use client';

import { useState, useEffect, useCallback } from 'react';
import QuestionScreen from './QuestionScreen';
import SubmittedScreen from './SubmittedScreen';
import GameFinished from './GameFinished';
import { api, tokenStorage, RoomResponse, LeaderboardResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import MusicControl from './MusicControl';

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
  const [gameStartedAt, setGameStartedAt] = useState<Date | null>(null);

  const playerToken = tokenStorage.getPlayerToken(roomId);

  const fetchRoom = useCallback(async () => {
    try {
      const roomData = await api.getRoom(roomId);
      setRoom(roomData);

      // Check if game has started
      if (roomData.status === 'started' && roomData.questions) {
        setIsLoading(false);
        
        // Set game started timestamp if available
        if (roomData.startedAt) {
          setGameStartedAt(new Date(roomData.startedAt));
        }
        
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
  }, [roomId]);

  const fetchLeaderboard = useCallback(async () => {
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
  }, [roomId, room]);

  // Initial room fetch
  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('WebSocket message received:', message);
    
    switch (message.type) {
      case 'game_started':
        // Game started - set timestamp for timer sync
        if (message.startedAt) {
          setGameStartedAt(new Date(message.startedAt));
        }
        // Refresh room data to get questions
        fetchRoom();
        break;
      
      case 'answer_submitted':
        // Another player submitted an answer - refresh leaderboard
        fetchLeaderboard();
        break;
      
      case 'player_joined':
        // Update player list
        setRoom((prevRoom) => {
          if (!prevRoom) return null;
          const playerExists = prevRoom.players.some(
            (p) => p.playerId === message.player.playerId
          );
          if (playerExists) return prevRoom;
          
          return {
            ...prevRoom,
            players: [...prevRoom.players, message.player],
          };
        });
        break;
    }
  }, [fetchRoom, fetchLeaderboard]);

  // WebSocket connection
  useWebSocket(roomId, {
    onMessage: handleWebSocketMessage,
  });

  // Background music
  const { isMuted, toggleMute, isLoaded } = useBackgroundMusic('/background-music.mp3', {
    autoPlay: true,
    loop: true,
    volume: 0.3,
  });

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
      
      // Don't auto-advance - let timer expire naturally
    } catch (err) {
      console.error('Error submitting answer:', err);
      // Fallback to local check if API fails
      const correct = answer.toLowerCase().trim() === currentQuestion.options[currentQuestion.correctAnswer].toLowerCase().trim();
      if (correct) {
        setScore((prevScore) => prevScore + 1);
      }
      setIsCorrect(correct);
      setGameState('submitted');
    }
  };

  // Synchronized timer based on game start timestamp
  useEffect(() => {
    if ((gameState === 'question' || gameState === 'submitted') && room?.timePerQuestion && gameStartedAt && room.questions) {
      const updateTimer = () => {
        // Calculate elapsed time since game started
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - gameStartedAt.getTime()) / 1000);
        
        // Each question takes timePerQuestion seconds
        const totalTimePerRound = room.timePerQuestion;
        
        // Calculate which round we're in based on elapsed time
        const calculatedQuestionIndex = Math.floor(elapsedSeconds / totalTimePerRound);
        const timeInCurrentRound = elapsedSeconds % totalTimePerRound;
        
        // Sync question index if we're out of sync
        if (calculatedQuestionIndex !== currentQuestionIndex && calculatedQuestionIndex < room.questions.length) {
          setCurrentQuestionIndex(calculatedQuestionIndex);
          setGameState('question');
        }
        
        // Check if game should be finished
        if (calculatedQuestionIndex >= room.questions.length && gameState !== 'finished') {
          setGameState('finished');
          fetchLeaderboard();
          return;
        }
        
        // Calculate remaining time for current question
        const remainingTime = room.timePerQuestion - timeInCurrentRound;
        setTimer(Math.max(0, remainingTime));
      };

      // Update immediately
      updateTimer();
      
      // Update every 100ms for smooth countdown
      const interval = setInterval(updateTimer, 100);

      return () => clearInterval(interval);
    } else if ((gameState === 'question' || gameState === 'submitted') && room?.timePerQuestion && !gameStartedAt) {
      // Fallback to local timer if no sync timestamp
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
  }, [gameState, currentQuestionIndex, room?.timePerQuestion, room?.questions, gameStartedAt, fetchLeaderboard]);

  // Auto-submit when timer reaches 0 if user hasn't submitted yet
  useEffect(() => {
    if (timer === 0 && gameState === 'question') {
      // Auto-submit as wrong when time runs out
      setIsCorrect(false);
      setGameState('submitted');
    }
  }, [timer, gameState]);

  if (isLoading) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
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
      </>
    );
  }

  if (error) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
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
      </>
    );
  }

  if (!room || !room.questions || room.questions.length === 0) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
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
      </>
    );
  }

  const currentQuestion = room.questions[currentQuestionIndex];
  const questionText = currentQuestion.question;

  if (gameState === 'finished') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameFinished
          totalQuestions={room.questionsPerRound}
          finalScore={score}
          leaderboard={leaderboard}
        />
      </>
    );
  }

  if (gameState === 'submitted') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <SubmittedScreen
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={room.questionsPerRound}
          isCorrect={isCorrect}
          correctAnswer={currentQuestion?.options?.[currentQuestion.correctAnswer] || ''}
          explanation={currentQuestion?.explanation || ''}
          leaderboard={leaderboard}
          timer={timer}
        />
      </>
    );
  }

  return (
    <>
      <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
      <QuestionScreen
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={room.questionsPerRound}
        timer={timer}
        question={questionText}
        options={currentQuestion.options || []}
        onSubmit={handleSubmitAnswer}
      />
    </>
  );
}