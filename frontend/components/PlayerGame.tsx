'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuestionScreen from './QuestionScreen';
import SubmittedScreen from './SubmittedScreen';
import GameFinished from './GameFinished';
import RoundFinished from './RoundFinished';
import { api, tokenStorage, RoomResponse, LeaderboardResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useGameTimer } from '../lib/useGameTimer';
import { 
  PageContainer, 
  FormCard, 
  Title, 
  ButtonPrimary,
  ButtonContainerCenter 
} from './styled/FormComponents';
import { ErrorBox, ErrorIcon, ErrorHeading, ErrorMessage } from './styled/ErrorComponents';
import { CenteredMessage } from './styled/StatusComponents';
import { GameTitleImage } from './styled/GameComponents';
import { colors } from './styled/theme';

interface PlayerGameProps {
  roomId: string;
}

interface LeaderboardEntry {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
  topicScore?: { [topic: string]: number };
}

type GameState = 'question' | 'waiting' | 'submitted' | 'round_finished' | 'finished';

export default function PlayerGame({ roomId }: PlayerGameProps) {
  const router = useRouter();
  const playerToken = tokenStorage.getPlayerToken(roomId);
  
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [gameState, setGameState] = useState<GameState>('question');
  
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameStartedAt, setGameStartedAt] = useState<Date | null>(null);

  // Check if player has a valid token - if not, show error immediately
  const hasNoToken = !playerToken;

  // Helper function to map leaderboard data to UI format
  const mapLeaderboardData = useCallback((
    leaderboardData: LeaderboardResponse,
    players: RoomResponse['players']
  ): LeaderboardEntry[] => {
    const playerMap = new Map(
      players.map(p => [p.playerId, p.playerName])
    );
    
    // Calculate ranks with proper tie handling
    let currentRank = 1;
    return leaderboardData.leaderboard.map((entry, index) => {
      // If this player has a different score than the previous one, update rank
      if (index > 0 && entry.score !== leaderboardData.leaderboard[index - 1].score) {
        currentRank = index + 1;
      }
      
      const playerName = playerMap.get(entry.playerId);
      if (!playerName) {
        console.warn(`Player name not found for ID: ${entry.playerId}`);
        console.warn('Available players:', players.map(p => ({ id: p.playerId, name: p.playerName })));
      }
      
      return {
        playerId: entry.playerId,
        rank: currentRank,
        playerName: playerName || `Player ${entry.playerId.slice(0, 8)}`,
        points: entry.score,
        topicScore: entry.topicScore,
      };
    });
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const leaderboardData = await api.getLeaderboard(roomId);
      
      // Always fetch fresh room data to ensure player names are up to date
      const currentRoom = await api.getRoom(roomId);
      setRoom(currentRoom);
      
      const formattedLeaderboard = mapLeaderboardData(leaderboardData, currentRoom.players);
      setLeaderboard(formattedLeaderboard);
    } catch {
      setLeaderboard([]);
    }
  }, [roomId, mapLeaderboardData]);

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
    console.log('🏁 GAME FINISHED');
    setGameState('finished');
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRoundFinished = useCallback(() => {
    console.log('🎊 ROUND FINISHED');
    setGameState('round_finished');
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleTimerExpired = useCallback(() => {
    // If in 'question' state and timer expires, auto-submit as incorrect
    if (gameState === 'question') {
      setIsCorrect(false);
      setGameState('waiting');
    }
    // If in 'waiting' state and timer expires, move to submitted (show answer)
    if (gameState === 'waiting') {
      setGameState('submitted');
    }
  }, [gameState]);

  const handleQuestionChanged = useCallback(() => {
    setGameState('question');
  }, []);

  // Game timer hook
  const { timer, currentQuestionIndex } = useGameTimer({
    room,
    gameStartedAt,
    gameState,
    onGameFinished: handleGameFinished,
    onRoundFinished: handleRoundFinished,
    onTimerExpired: handleTimerExpired,
    onQuestionChanged: handleQuestionChanged,
  });

  // Initial room fetch
  useEffect(() => {
    if (hasNoToken) return; // Don't fetch if no token
    fetchRoom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: {
    type: string;
    startedAt?: string;
    currentRound?: number;
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
    
    if (message.type === 'round_changed') {
      // New round has started - fetch updated room data and reset to question state
      setGameState('question');
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

  const handleSubmitAnswer = async (answer: string) => {
    if (!room?.questions || !playerToken) return;

    const currentQuestion = room.questions[currentQuestionIndex];
    
    try {
      const response = await api.submitAnswer(roomId, playerToken, currentQuestion.id, answer);
      
      if (response.isCorrect) {
        setScore(response.currentScore);
      }
      
      setIsCorrect(response.isCorrect);
      setGameState('waiting'); // Change to waiting state instead of submitted
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
      setGameState('waiting'); // Change to waiting state instead of submitted
    }
  };

  const centeredScreenStyle = {
    minHeight: '100vh',
    backgroundColor: colors.bgContrast,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.surface
  };

  const handleJoinRedirect = () => {
    router.push(`/join?roomId=${roomId}`);
  };

  // No player token error - must join first
  if (hasNoToken) {
    return (
      <PageContainer>
        <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
        <FormCard>
          <Title>Access Denied</Title>
          <ErrorBox>
            <ErrorIcon>🚫</ErrorIcon>
            <ErrorHeading>You must join the game first!</ErrorHeading>
            <ErrorMessage>
              You don&apos;t have permission to access this game. 
              Please join the game using your name.
            </ErrorMessage>
          </ErrorBox>
          <ButtonContainerCenter>
            <ButtonPrimary onClick={handleJoinRedirect}>
              Join Game
            </ButtonPrimary>
          </ButtonContainerCenter>
        </FormCard>
      </PageContainer>
    );
  }

  // Loading state
  if (isLoading) {
    return <div style={centeredScreenStyle}>Loading game...</div>;
  }

  // Error state
  if (error) {
    return <div style={centeredScreenStyle}>Error: {error}</div>;
  }

  // Waiting for game to start
  if (!room?.questions?.length) {
    return <div style={centeredScreenStyle}>Waiting for game to start...</div>;
  }

  // Check for server sync during active gameplay
  if ((gameState === 'question' || gameState === 'waiting' || gameState === 'submitted') && !gameStartedAt) {
    return <div style={centeredScreenStyle}>Synchronizing with server...</div>;
  }

  // Round finished state (show between rounds)
  if (gameState === 'round_finished') {
    return (
      <RoundFinished
        currentRound={room.currentRound}
        totalRounds={room.numRounds}
        leaderboard={leaderboard}
        timer={timer}
      />
    );
  }

  // Game finished state
  if (gameState === 'finished') {
    return (
      <GameFinished
        totalQuestions={room.questionsPerRound}
        finalScore={score}
        leaderboard={leaderboard}
      />
    );
  }

  const currentQuestion = room.questions[currentQuestionIndex];
  
  // Question loading state
  if (!currentQuestion) {
    return (
      <CenteredMessage>
        <p>Loading question {currentQuestionIndex + 1}...</p>
      </CenteredMessage>
    );
  }

  // Waiting state (answer submitted, waiting for others)
  if (gameState === 'waiting') {
    console.log('⏳ RENDERING WAITING SCREEN', { timer });
    return (
      <PageContainer>
        <FormCard style={{ textAlign: 'center' }}>
          <Title>⏳ Waiting for other players...</Title>
          <CenteredMessage>
            <p style={{ fontSize: '1.5rem', margin: '2rem 0' }}>
              Your answer has been submitted!
            </p>
            <p style={{ fontSize: '1rem', color: colors.typeSecondary }}>
              Time remaining: {timer}s
            </p>
          </CenteredMessage>
        </FormCard>
      </PageContainer>
    );
  }

  // Answer submitted state (show results for 8 seconds)
  if (gameState === 'submitted') {
    return (
      <SubmittedScreen
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={room.questionsPerRound}
        isCorrect={isCorrect}
        correctAnswer={currentQuestion.options[currentQuestion.correctAnswer]}
        explanation={currentQuestion.explanation || ''}
        leaderboard={leaderboard}
        timer={timer}
      />
    );
  }

  // Active question state
  return (
    <QuestionScreen
      currentQuestion={currentQuestionIndex + 1}
      totalQuestions={room.questionsPerRound}
      timer={timer}
      question={currentQuestion.question}
      topics={currentQuestion.topics}
      options={currentQuestion.options}
      onSubmit={handleSubmitAnswer}
    />
  );
}