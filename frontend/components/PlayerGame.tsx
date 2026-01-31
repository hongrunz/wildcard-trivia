'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useRouter } from 'next/navigation';
import QuestionScreen from './QuestionScreen';
import SubmittedScreen from './SubmittedScreen';
import GameFinished from './GameFinished';
import RoundFinished from './RoundFinished';
import NewRoundTopicSubmission from './NewRoundTopicSubmission';
import { api, tokenStorage, LeaderboardResponse, RoomResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useGameTimerDisplay } from '../lib/useGameTimerDisplay';
import { gameStateMachine, type LeaderboardEntry } from '../lib/gameStateMachine';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import MusicControl from './MusicControl';
import { 
  FormCard, 
  Title, 
  ButtonPrimary,
  ButtonContainerCenter 
} from './styled/FormComponents';
import { ErrorBox, ErrorIcon, ErrorHeading, ErrorMessage } from './styled/ErrorComponents';
import { CenteredMessage } from './styled/StatusComponents';
import PlayerHeader from './PlayerHeader';
import { PlayerPageContainer, PlayerPageContent } from './styled/GameComponents';
import { colors } from './styled/theme';

interface PlayerGameProps {
  roomId: string;
}

export default function PlayerGame({ roomId }: PlayerGameProps) {
  const router = useRouter();
  const playerToken = tokenStorage.getPlayerToken(roomId);
  const hostToken = tokenStorage.getHostToken(roomId);
  
  // Check if this player is also the host (has both tokens)
  const isHost = !!hostToken;

  // Background music (only for host)
  const { isMuted, toggleMute, isLoaded } = useBackgroundMusic('/background-music.mp3', {
    autoPlay: isHost, // Only auto-play if this player is the host
    loop: true,
    volume: 0.3,
  });

  // Use XState machine for formal state management
  const [state, send] = useMachine(gameStateMachine);

  // Keep latest state in a ref so WebSocket handler always sees current state (avoids stale closure)
  const stateRef = useRef(state);
  stateRef.current = state;

  // Fallback: track which players have submitted for current question; transition when we've seen everyone (if backend never sends all_answers_submitted)
  const submittedForQuestionRef = useRef<Map<string, Set<string>>>(new Map());

  // Live topic list for "newRound" screen (built from websocket events)
  const [newRoundTopics, setNewRoundTopics] = useState<string[]>([]);

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
      send({ type: 'ROOM_UPDATED', room: currentRoom });
      
      const formattedLeaderboard = mapLeaderboardData(leaderboardData, currentRoom.players);
      send({ type: 'LEADERBOARD_UPDATED', leaderboard: formattedLeaderboard });
    } catch {
      send({ type: 'LEADERBOARD_UPDATED', leaderboard: [] });
    }
  }, [roomId, mapLeaderboardData, send]);

  const fetchRoom = useCallback(async () => {
    try {
      const roomData = await api.getRoom(roomId);

      if (roomData.status === 'started' && roomData.questions) {
        // Parse and set game start timestamp for timer synchronization
        if (roomData.startedAt) {
          const startTime = new Date(roomData.startedAt);
          if (!isNaN(startTime.getTime())) {
            send({ type: 'GAME_LOADED', room: roomData, startedAt: startTime });
          }
        }
        
        fetchLeaderboard();
      } else if (roomData.status === 'finished') {
        send({ type: 'ROOM_UPDATED', room: roomData });
        await fetchLeaderboard();
        send({ type: 'GAME_FINISHED', leaderboard: state.context.leaderboard });
      } else {
        send({ type: 'ROOM_UPDATED', room: roomData });
      }
    } catch (err) {
      send({ type: 'ERROR', error: err instanceof Error ? err.message : 'Failed to load game' });
    }
  }, [roomId, fetchLeaderboard, state.context.leaderboard, send]);

  const handleSubmitTopic = useCallback(async (topic: string) => {
    if (!playerToken) return;
    
    try {
      await api.submitRoundTopic(roomId, playerToken, topic);
    } catch (error) {
      console.error('Failed to submit topic:', error);
      throw error;
    }
  }, [roomId, playerToken]);

  // Get current question index from state machine context
  const currentQuestionIndex = state.context.currentQuestionIndex;

  // Game timer display hook (resets per question, always uses timePerQuestion)
  const { timer } = useGameTimerDisplay({
    room: state.context.room,
    gameState: state.value as 'question' | 'submitted' | 'roundFinished' | 'newRound' | 'finished',
    questionStartedAt: state.context.questionStartedAt,
    reviewStartedAt: state.context.reviewStartedAt,
    currentQuestionIndex: state.context.currentQuestionIndex,
  });

  // Send TIMER_EXPIRED when question timer runs out (timePerQuestion seconds from when this question started)
  useEffect(() => {
    if (state.value === 'question' && state.context.room?.timePerQuestion && state.context.questionStartedAt) {
      const timePerQuestionMs = state.context.room.timePerQuestion * 1000;
      const check = () => {
        const now = new Date();
        const elapsedMs = now.getTime() - state.context.questionStartedAt!.getTime();
        const remainingMs = timePerQuestionMs - elapsedMs;
        if (remainingMs <= 0) {
          send({ type: 'TIMER_EXPIRED' });
          return true;
        }
        return false;
      };
      if (check()) return;
      const interval = setInterval(() => {
        if (check()) clearInterval(interval);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [state.value, state.context.room?.timePerQuestion, state.context.questionStartedAt, send]);

  // Initial room fetch
  useEffect(() => {
    if (hasNoToken) return; // Don't fetch if no token
    fetchRoom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(async (message: {
    type: string;
    startedAt?: string;
    currentRound?: number;
    questionId?: string;
    playerId?: string;
    topic?: string;
    topics?: string[];
    player?: {
      playerId: string;
      playerName: string;
      joinedAt: string;
    };
  }) => {
    if (message.type === 'game_started') {
      submittedForQuestionRef.current.clear();
      fetchRoom();
      return;
    }
    
    if (message.type === 'round_changed') {
      submittedForQuestionRef.current.clear();
      // New round has started - update timer sync and fetch updated room data
      const roomData = await api.getRoom(roomId);
      if (message.startedAt) {
        const startTime = new Date(message.startedAt);
        if (!isNaN(startTime.getTime())) {
          send({ type: 'ROUND_CHANGED', startedAt: startTime, room: roomData });
        }
      }
      // Reset topic list once we move into the next round questions
      setNewRoundTopics([]);
      return;
    }
    
    if (message.type === 'answer_submitted') {
      const current = stateRef.current;
      const room = current.context.room;
      const questionId = message.questionId != null ? String(message.questionId) : '';
      const playerId = message.playerId != null ? String(message.playerId) : '';
      if (questionId && playerId && room?.players?.length) {
        let set = submittedForQuestionRef.current.get(questionId);
        if (!set) {
          set = new Set();
          submittedForQuestionRef.current.set(questionId, set);
        }
        set.add(playerId);
        const inQuestion = current.value === 'question';
        const currentQuestionId = room.questions?.[current.context.currentQuestionIndex]?.id;
        const questionMatch = currentQuestionId != null && String(currentQuestionId) === questionId;
        if (inQuestion && questionMatch && set.size >= room.players.length) {
          submittedForQuestionRef.current.delete(questionId);
          send({ type: 'ALL_ANSWERED' });
        }
      }
      fetchLeaderboard();
      return;
    }

    if (message.type === 'all_answers_submitted') {
      const current = stateRef.current;
      const inQuestion = current.value === 'question';
      const currentQuestionId = current.context.room?.questions?.[current.context.currentQuestionIndex]?.id;
      const messageQuestionId = message.questionId != null ? String(message.questionId) : '';
      const questionMatch = !messageQuestionId || !currentQuestionId || messageQuestionId === String(currentQuestionId);
      if (inQuestion && questionMatch) {
        send({ type: 'ALL_ANSWERED' });
      }
      fetchLeaderboard();
      return;
    }

    if (message.type === 'topic_submitted') {
      // During the "newRound" phase, show topics as they come in for everyone.
      // Prefer the full topic list if provided; otherwise append the single topic.
      if (state.value === 'newRound') {
        if (Array.isArray(message.topics) && message.topics.length > 0) {
          setNewRoundTopics(Array.from(new Set(message.topics.map((t) => t.trim()).filter(Boolean))));
        } else if (message.topic) {
          const t = message.topic.trim();
          if (t) {
            setNewRoundTopics((prev) => (prev.includes(t) ? prev : [...prev, t]));
          }
        }
      }
      return;
    }
    
    if (message.type === 'player_joined' && message.player) {
      send({ type: 'PLAYER_JOINED', player: message.player });
    }
  }, [fetchRoom, fetchLeaderboard, roomId, send]);

  // WebSocket connection
  useWebSocket(roomId, {
    onMessage: handleWebSocketMessage,
  });

  const handleSubmitAnswer = async (answer: string) => {
    if (!state.context.room?.questions || !playerToken) return;

    const currentQuestion = state.context.room.questions[currentQuestionIndex];
    
    try {
      const response = await api.submitAnswer(roomId, playerToken, currentQuestion.id, answer);
      
      send({ 
        type: 'ANSWER_SUBMITTED', 
        isCorrect: response.isCorrect, 
        score: response.currentScore,
        selectedAnswer: answer,
      });
      
      fetchLeaderboard();
    } catch {
      // Fallback to local validation if API fails
      const isAnswerCorrect = 
        answer.toLowerCase().trim() === 
        currentQuestion.options[currentQuestion.correctAnswer].toLowerCase().trim();
      
      const newScore = isAnswerCorrect ? state.context.score + 1 : state.context.score;
      
      send({ 
        type: 'ANSWER_SUBMITTED', 
        isCorrect: isAnswerCorrect, 
        score: newScore,
        selectedAnswer: answer,
      });
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
      <PlayerPageContainer>
          <PlayerHeader />
          <PlayerPageContent>
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
          </PlayerPageContent>
        </PlayerPageContainer>
    );
  }

  // Loading state
  if (state.value === 'loading') {
    return <div style={centeredScreenStyle}>Loading game...</div>;
  }

  // Error state
  if (state.value === 'error' || state.context.error) {
    return <div style={centeredScreenStyle}>Error: {state.context.error}</div>;
  }

  // Waiting for game to start
  if (!state.context.room?.questions?.length) {
    return <div style={centeredScreenStyle}>Waiting for game to start...</div>;
  }

  // Check for server sync during active gameplay
  if ((state.value === 'question' || state.value === 'submitted') && !state.context.gameStartedAt) {
    return <div style={centeredScreenStyle}>Synchronizing with server...</div>;
  }

  // Round finished state (show between rounds)
  if (state.value === 'roundFinished') {
    return (
      <>
        {isHost && <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />}
        <RoundFinished
          currentRound={state.context.room.currentRound}
          totalRounds={state.context.room.numRounds}
          leaderboard={state.context.leaderboard}
          timer={timer}
        />
      </>
    );
  }

  // New round topic submission state
  if (state.value === 'newRound') {
    return (
      <>
        {isHost && <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />}
        <NewRoundTopicSubmission
          currentRound={state.context.room.currentRound + 1}
          totalRounds={state.context.room.numRounds}
          onSubmitTopic={handleSubmitTopic}
          collectedTopics={newRoundTopics}
        />
      </>
    );
  }

  // Game finished state
  if (state.value === 'finished') {
    return (
      <>
        {isHost && <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />}
        <GameFinished
          totalQuestions={state.context.room.questionsPerRound}
          finalScore={state.context.score}
          leaderboard={state.context.leaderboard}
        />
      </>
    );
  }

  const currentQuestion = state.context.room.questions[currentQuestionIndex];
  
  // Question loading state
  if (!currentQuestion) {
    return (
      <CenteredMessage>
        <p>Loading question {currentQuestionIndex + 1}...</p>
      </CenteredMessage>
    );
  }

  // Answer submitted state (show results for 8 seconds)
  if (state.value === 'submitted') {
    return (
      <>
        {isHost && <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />}
        <SubmittedScreen
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={state.context.room.questionsPerRound}
          currentRound={state.context.room.currentRound}
          numRounds={state.context.room.numRounds}
          isCorrect={state.context.isCorrect}
          question={currentQuestion.question}
          options={currentQuestion.options}
          correctAnswerIndex={currentQuestion.correctAnswer}
          selectedAnswer={state.context.selectedAnswer}
          explanation={currentQuestion.explanation || ''}
          leaderboard={state.context.leaderboard}
          timer={timer}
        />
      </>
    );
  }

  // Active question state
  return (
    <>
      {isHost && <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />}
      <QuestionScreen
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={state.context.room.questionsPerRound}
        currentRound={state.context.room.currentRound}
        numRounds={state.context.room.numRounds}
        timer={timer}
        question={currentQuestion.question}
        topics={currentQuestion.topics}
        options={currentQuestion.options}
        onSubmit={handleSubmitAnswer}
      />
    </>
  );
}