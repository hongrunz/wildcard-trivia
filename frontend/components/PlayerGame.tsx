'use client';

import { useState, useEffect, useCallback } from 'react';
import QuestionScreen from './QuestionScreen';
import SubmittedScreen from './SubmittedScreen';
import GameFinished from './GameFinished';
import { api, tokenStorage, RoomResponse, LeaderboardResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import { useGameTimer } from '../lib/useGameTimer';
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
  const [gameState, setGameState] = useState<GameState>('question');
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameStartedAt, setGameStartedAt] = useState<Date | null>(null);

  const playerToken = tokenStorage.getPlayerToken(roomId);

  // Helper function to map leaderboard data to UI format
  const mapLeaderboardData = useCallback((
    leaderboardData: LeaderboardResponse,
    players: RoomResponse['players']
  ): LeaderboardEntry[] => {
    const playerMap = new Map(
      players.map(p => [p.playerId, p.playerName])
    );
    
    return leaderboardData.leaderboard.map((entry, index) => ({
      rank: index + 1,
      playerName: playerMap.get(entry.playerId) || `Player ${entry.playerId.slice(0, 8)}`,
      points: entry.score,
    }));
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const leaderboardData = await api.getLeaderboard(roomId);
      
      // Use current room data or fetch if not available
      let currentRoom = room;
      if (!currentRoom) {
        currentRoom = await api.getRoom(roomId);
        setRoom(currentRoom);
      }
      
      const formattedLeaderboard = mapLeaderboardData(leaderboardData, currentRoom.players);
      setLeaderboard(formattedLeaderboard);
    } catch {
      setLeaderboard([]);
    }
  }, [roomId, room, mapLeaderboardData]);

  const fetchRoom = useCallback(async () => {
    try {
      const roomData = await api.getRoom(roomId);
      setRoom(roomData);

      if (roomData.status === 'started' && roomData.questions) {
        setIsLoading(false);
        
        // Parse and set game start timestamp for timer synchronization
        if (roomData.startedAt) {
          const startTime = new Date(roomData.startedAt);
          if (!isNaN(startTime.getTime())) {
            setGameStartedAt(startTime);
          }
        }
        
        fetchLeaderboard();
      } else if (roomData.status === 'finished') {
        setGameState('finished');
        setIsLoading(false);
        fetchLeaderboard();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
      setIsLoading(false);
    }
  }, [roomId, fetchLeaderboard]);

  // Timer callbacks
  const handleGameFinished = useCallback(() => {
    setGameState('finished');
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleTimerExpired = useCallback(() => {
    setIsCorrect(false);
    setGameState('submitted');
  }, []);

  const handleQuestionChanged = useCallback(() => {
    setGameState('question');
  }, []);

  // Game timer hook
  const { timer, currentQuestionIndex } = useGameTimer({
    room,
    gameStartedAt,
    gameState,
    onGameFinished: handleGameFinished,
    onTimerExpired: handleTimerExpired,
    onQuestionChanged: handleQuestionChanged,
  });

  // Initial room fetch
  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: {
    type: string;
    startedAt?: string;
    player?: {
      playerId: string;
      playerName: string;
      joinedAt: string;
    };
  }) => {
    if (message.type === 'game_started') {
      if (message.startedAt) {
        const startTime = new Date(message.startedAt);
        if (!isNaN(startTime.getTime())) {
          setGameStartedAt(startTime);
        }
      }
      fetchRoom();
      return;
    }
    
    if (message.type === 'answer_submitted') {
      fetchLeaderboard();
      return;
    }
    
    if (message.type === 'player_joined' && message.player) {
      setRoom((prevRoom) => {
        if (!prevRoom) return null;
        
        const playerExists = prevRoom.players.some(
          (p) => p.playerId === message.player!.playerId
        );
        
        if (playerExists) return prevRoom;
        
        return {
          ...prevRoom,
          players: [
            ...prevRoom.players,
            {
              playerId: message.player!.playerId,
              playerName: message.player!.playerName,
              score: 0,
              joinedAt: message.player!.joinedAt,
            }
          ],
        };
      });
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
    if (!room?.questions || !playerToken) return;

    const currentQuestion = room.questions[currentQuestionIndex];
    
    try {
      const response = await api.submitAnswer(roomId, playerToken, currentQuestion.id, answer);
      
      if (response.isCorrect) {
        setScore(response.currentScore);
      }
      
      setIsCorrect(response.isCorrect);
      setGameState('submitted');
      fetchLeaderboard();
    } catch {
      // Fallback to local validation if API fails
      const isAnswerCorrect = 
        answer.toLowerCase().trim() === 
        currentQuestion.options[currentQuestion.correctAnswer].toLowerCase().trim();
      
      if (isAnswerCorrect) {
        setScore((prevScore) => prevScore + 1);
      }
      
      setIsCorrect(isAnswerCorrect);
      setGameState('submitted');
    }
  };

  const centeredScreenStyle = {
    minHeight: '100vh',
    backgroundColor: '#4b5563',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff'
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <div style={centeredScreenStyle}>Loading game...</div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <div style={centeredScreenStyle}>Error: {error}</div>
      </>
    );
  }

  // Waiting for game to start
  if (!room?.questions?.length) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <div style={centeredScreenStyle}>Waiting for game to start...</div>
      </>
    );
  }

  // Check for server sync during active gameplay
  if ((gameState === 'question' || gameState === 'submitted') && !gameStartedAt) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <div style={centeredScreenStyle}>Synchronizing with server...</div>
      </>
    );
  }

  const currentQuestion = room.questions[currentQuestionIndex];
  
  // Question loading state
  if (!currentQuestion) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <div style={{ textAlign: 'center', padding: '2rem', color: 'white', fontSize: '1.2rem' }}>
          <p>Loading question {currentQuestionIndex + 1}...</p>
        </div>
      </>
    );
  }

  // Game finished state
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

  // Answer submitted state
  if (gameState === 'submitted') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <SubmittedScreen
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={room.questionsPerRound}
          isCorrect={isCorrect}
          correctAnswer={currentQuestion.options[currentQuestion.correctAnswer]}
          explanation={currentQuestion.explanation || ''}
          leaderboard={leaderboard}
          timer={timer}
        />
      </>
    );
  }

  // Active question state
  return (
    <>
      <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
      <QuestionScreen
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={room.questionsPerRound}
        timer={timer}
        question={currentQuestion.question}
        options={currentQuestion.options}
        onSubmit={handleSubmitAnswer}
      />
    </>
  );
}