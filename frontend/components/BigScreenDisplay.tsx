'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMachine } from '@xstate/react';
import GameFinished from './GameFinished';
import BigScreenRoundFinished from './BigScreenRoundFinished';
import BigScreenNewRound from './BigScreenNewRound';
import { api, LeaderboardResponse, RoomResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import { useGameTimerDisplay } from '../lib/useGameTimerDisplay';
import { gameStateMachine, type LeaderboardEntry } from '../lib/gameStateMachine';
import MusicControl from './MusicControl';
import { GameTitle, GameTitleImage, PlayerListTitle, PlayerListItem, PlayerListItemAvatar, PlayerListItemName, PlayerListContainer } from './styled/GameComponents';
import {
  BigScreenCard,
  BigScreenQuestionText,
  BigScreenOptionsContainer,
  BigScreenExplanation,
  ErrorTitle,
  BigScreenLayout,
  GamePlayStatus,
  BigScreenLeaderboardCard,
  BigScreenQuestionCard,
  BigScreenContainer,
  BigScreenGameTitle,
  TriviCommentaryCard,
  TriviCommentaryCharacterContainer,
  TriviCommentaryTextContainer,
  TriviCommentaryTitle,
  TriviCommentaryBody,
  QuestionProgress,
  BigScreenTopBar,
  TimerBadge,
  LeaderboardScore,
  BigScreenRightContainer,
} from './styled/BigScreenComponents';
import { BigScreenOptionButton } from './styled/OptionsContainer';
import { MutedText } from './styled/StatusComponents';
import { colors } from './styled/theme';

interface BigScreenDisplayProps {
  roomId: string;
}

export default function BigScreenDisplay({ roomId }: BigScreenDisplayProps) {
  // Use XState machine for formal state management
  const [state, send] = useMachine(gameStateMachine);

  // Keep latest state in a ref so WebSocket handler always sees current state (avoids stale closure)
  const stateRef = useRef(state);
  stateRef.current = state;

  // Fallback: track which players have submitted for current question; transition when we've seen everyone (if backend never sends all_answers_submitted)
  const submittedForQuestionRef = useRef<Map<string, Set<string>>>(new Map());
  
  // Local state for topic submission tracking (not part of game state machine)
  const [topicSubmissionCount, setTopicSubmissionCount] = useState(0);
  const [collectedTopics, setCollectedTopics] = useState<string[]>([]);

  // Helper function to map leaderboard data to UI format
  const mapLeaderboardData = useCallback((
    leaderboardData: LeaderboardResponse,
    players: RoomResponse['players']
  ): LeaderboardEntry[] => {
    const playerMap = new Map<string, string>(
      players.map((p: RoomResponse['players'][number]) => [p.playerId, p.playerName])
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
        console.warn('Available players:', players.map((p: RoomResponse['players'][number]) => ({ id: p.playerId, name: p.playerName })));
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

      // Always try to fetch leaderboard, even if game hasn't started
      fetchLeaderboard();

      if (roomData.status === 'started' && roomData.questions) {
        // Parse and set game start timestamp for timer synchronization
        if (roomData.startedAt) {
          const startTime = new Date(roomData.startedAt);
          if (!isNaN(startTime.getTime())) {
            send({ type: 'GAME_LOADED', room: roomData, startedAt: startTime });
          }
        }
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
    fetchRoom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset collected topics when entering newRound state
  useEffect(() => {
    if (state.value === 'newRound') {
      setCollectedTopics([]);
      setTopicSubmissionCount(0);
    }
  }, [state.value]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(async (message: {
    type: string;
    startedAt?: string;
    currentRound?: number;
    questionId?: string;
    playerId?: string;
    submittedCount?: number;
    topic?: string;
    topics?: string[];
    nextRound?: number;
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
      setTopicSubmissionCount(0); // Reset submission count
      setCollectedTopics([]); // Reset collected topics for new round
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
      // Update submission count
      if (message.submittedCount !== undefined) {
        setTopicSubmissionCount(message.submittedCount);
      }
      // Add topic to collected topics if provided in message
      if (message.topic) {
        setCollectedTopics(prev => {
          // Avoid duplicates
          if (!prev.includes(message.topic!)) {
            return [...prev, message.topic!];
          }
          return prev;
        });
      }
      // Don't fetch room data here - it would return topics for current_round, not next_round
      // We rely on WebSocket messages to accumulate topics for the next round
      return;
    }

    if (message.type === 'all_topics_submitted') {
      // All topics collected, could auto-advance to next round here
      // For now, we'll wait for the host or backend to trigger round_changed
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

  // Background music
  const { isMuted, toggleMute, isLoaded } = useBackgroundMusic('/background-music.mp3', {
    autoPlay: true,
    loop: true,
    volume: 0.3,
  });

  // Loading state
  if (state.value === 'loading') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenCard>
            <GameTitle>Loading game...</GameTitle>
          </BigScreenCard>
        </BigScreenContainer>
      </>
    );
  }

  // Error state
  if (state.value === 'error' || state.context.error) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenCard>
            <ErrorTitle>Error: {state.context.error}</ErrorTitle>
          </BigScreenCard>
        </BigScreenContainer>
      </>
    );
  }

  // Waiting for game to start
  if (!state.context.room?.questions?.length) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenCard>
            <GameTitle>Waiting for game to start...</GameTitle>
          </BigScreenCard>
        </BigScreenContainer>
      </>
    );
  }

  // Check for server sync during active gameplay
  if ((state.value === 'question' || state.value === 'submitted') && !state.context.gameStartedAt) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenCard>
            <GameTitle>Synchronizing with server...</GameTitle>
          </BigScreenCard>
        </BigScreenContainer>
      </>
    );
  }

  // Round finished state (show between rounds)
  if (state.value === 'roundFinished') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenRoundFinished
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
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenNewRound
          currentRound={state.context.room.currentRound + 1}
          totalRounds={state.context.room.numRounds}
          submittedCount={topicSubmissionCount}
          totalPlayers={state.context.room.players.length}
          collectedTopics={collectedTopics}
          leaderboard={state.context.leaderboard}
        />
      </>
    );
  }

  // Game finished state
  if (state.value === 'finished') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameFinished
          totalQuestions={state.context.room.questionsPerRound}
          finalScore={0} // Big screen doesn't have a score
          leaderboard={state.context.leaderboard}
        />
      </>
    );
  }

  const currentQuestion = state.context.room.questions[currentQuestionIndex];
  
  // Question loading state
  if (!currentQuestion) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenCard>
            <GameTitle>Loading question {currentQuestionIndex + 1}...</GameTitle>
          </BigScreenCard>
        </BigScreenContainer>
      </>
    );
  }

  // Active question display (and submitted) — always use full layout with avatar + leaderboard
  return (
    <>
      <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
      <BigScreenContainer>
        <BigScreenLayout>
          {/* Left Side - Leaderboard */}
          <GamePlayStatus>
            {/* Game Title */}
            <BigScreenGameTitle>
              <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
            </BigScreenGameTitle>

            {/* Trivi Commentary Card */}
            <TriviCommentaryCard>
              <TriviCommentaryCharacterContainer>
                <img src="/assets/Trivi_big_smile.svg" alt="Trivi character" />
              </TriviCommentaryCharacterContainer>
              <TriviCommentaryTextContainer>
                <TriviCommentaryTitle>Awesome!</TriviCommentaryTitle>
                <TriviCommentaryBody>
                  Placeholder text for commentary
                </TriviCommentaryBody>
              </TriviCommentaryTextContainer>
            </TriviCommentaryCard>

            {/* Leaderboard Card */}
            <BigScreenLeaderboardCard>
              <PlayerListTitle>Leaderboard</PlayerListTitle>
              <PlayerListContainer>
                {state.context.leaderboard.length > 0 ? (
                  state.context.leaderboard.map((entry: LeaderboardEntry, index: number) => {
                    // Assign unique avatars by position (1–10); wrap only when more than 10 players
                    const avatarCount = 10;
                    const avatarIndex = (index % avatarCount) + 1;
                    const avatarSrc = `/assets/avatars/avatar_${avatarIndex}.svg`;
                    
                    return (
                      <PlayerListItem key={entry.playerId}>
                        <PlayerListItemAvatar $avatarSrc={avatarSrc}>
                          {entry.playerName.charAt(0).toUpperCase()}
                        </PlayerListItemAvatar>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <PlayerListItemName>
                            #{entry.rank} {entry.playerName}
                          </PlayerListItemName>
                          <LeaderboardScore>{entry.points}</LeaderboardScore>
                        </div>
                      </PlayerListItem>
                    );
                  })
                ) : (
                  <MutedText style={{ textAlign: 'center', padding: '2rem 0' }}>
                    No scores yet
                  </MutedText>
                )}
              </PlayerListContainer>
            </BigScreenLeaderboardCard>
          </GamePlayStatus>

          {/* Right Side - Question Area */}
          <BigScreenRightContainer>
            {/* Top bar with round and timer */}
            <BigScreenTopBar>
              <span>Round {state.context.room.currentRound} of {state.context.room.numRounds}</span>
              <TimerBadge>{timer !== undefined ? `${timer}s` : '--'}</TimerBadge>
            </BigScreenTopBar>

            {/* Question Card */}
            <BigScreenQuestionCard>
              {/* Question progress */}
              <QuestionProgress>
                Question {currentQuestionIndex + 1}/{state.context.room.questionsPerRound}
              </QuestionProgress>

              {/* Question text */}
              <BigScreenQuestionText>
                {currentQuestion.question}
              </BigScreenQuestionText>

              {/* Options - only highlight correct answer and show explanation when in answer revelation (submitted) */}
              <BigScreenOptionsContainer>
                {currentQuestion.options.map((option, index) => {
                  const isAnswerRevelation = state.value === 'submitted';
                  const isCorrect = index === currentQuestion.correctAnswer;
                  return (
                    <BigScreenOptionButton
                      key={index}
                      disabled
                      style={{
                        backgroundColor: isAnswerRevelation && isCorrect ? colors.green[500] : colors.surface,
                        color: isAnswerRevelation && isCorrect ? colors.surface : colors.typeMain,
                        cursor: 'default',
                        textAlign: 'center',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {option}
                    </BigScreenOptionButton>
                  );
                })}
              </BigScreenOptionsContainer>

              {/* Show explanation only when in answer revelation (all players have submitted) */}
              {state.value === 'submitted' && currentQuestion.explanation && (
                <BigScreenExplanation>
                  <strong>Explanation:</strong> {currentQuestion.explanation}
                </BigScreenExplanation>
              )}
            </BigScreenQuestionCard>
          </BigScreenRightContainer>
        </BigScreenLayout>
      </BigScreenContainer>
    </>
  );
}
