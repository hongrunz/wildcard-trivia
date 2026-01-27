'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { GameScreenContainer, GameTitle, TopicsContainer, TopicBadge, GameTitleImage, PlayerListTitle, PlayerListItem, PlayerListItemAvatar, PlayerListItemName, PlayerListContainer } from './styled/GameComponents';
import {
  BigScreenCard,
  BigScreenHeader,
  BigScreenBadge,
  BigScreenQuestionText,
  BigScreenOptionsContainer,
  BigScreenOptionBox,
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

  // Game timer display hook (synchronized to server time)
  const { timer } = useGameTimerDisplay({
    room: state.context.room,
    gameState: state.value as 'question' | 'submitted' | 'roundFinished' | 'newRound' | 'finished',
    gameStartedAt: state.context.gameStartedAt,
    currentQuestionIndex: state.context.currentQuestionIndex,
  });

  // Send TIMER_EXPIRED when question timer runs out (synchronized to server time)
  useEffect(() => {
    if (state.value === 'question' && state.context.room?.timePerQuestion && state.context.gameStartedAt) {
      const calculateRemainingTime = () => {
        const now = new Date();
        const elapsedMs = now.getTime() - state.context.gameStartedAt!.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        const REVIEW_TIME_SECONDS = 8;
        const totalTimePerCycle = state.context.room!.timePerQuestion + REVIEW_TIME_SECONDS;
        const timeInCurrentCycle = elapsedSeconds % totalTimePerCycle;
        
        if (timeInCurrentCycle < state.context.room!.timePerQuestion) {
          return state.context.room!.timePerQuestion - timeInCurrentCycle;
        }
        return 0; // Already past question phase
      };
      
      const remainingSeconds = calculateRemainingTime();
      if (remainingSeconds > 0) {
        const timeout = setTimeout(() => {
          send({ type: 'TIMER_EXPIRED' });
        }, remainingSeconds * 1000);
        return () => clearTimeout(timeout);
      } else {
        // Already past, send immediately
        send({ type: 'TIMER_EXPIRED' });
      }
    }
  }, [state.value, state.context.room?.timePerQuestion, state.context.gameStartedAt, send]);

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
      fetchRoom();
      return;
    }
    
    if (message.type === 'round_changed') {
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
      <>f
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

  // Active question display
  if (state.value === 'question') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameScreenContainer>
          <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
          <BigScreenCard>
            {/* Header with question number and timer */}
            <BigScreenHeader>
              <BigScreenBadge>
                {currentQuestionIndex + 1}/{state.context.room.questionsPerRound}
              </BigScreenBadge>
              <BigScreenBadge>
                {timer}
              </BigScreenBadge>
            </BigScreenHeader>

            {/* Display topics */}
            {currentQuestion.topics && currentQuestion.topics.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <MutedText style={{ fontSize: '1rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                  Topics:
                </MutedText>
                <TopicsContainer>
                  {currentQuestion.topics.map((topic, index) => (
                    <TopicBadge key={index}>
                      {topic}
                    </TopicBadge>
                  ))}
                </TopicsContainer>
              </div>
            )}

            {/* Question text */}
            <BigScreenQuestionText>
              {currentQuestion.question}
            </BigScreenQuestionText>

            {/* Options - no answer revealed yet */}
            <BigScreenOptionsContainer>
              {currentQuestion.options.map((option, index) => (
                <BigScreenOptionBox 
                  key={index}
                  $showAnswer={false}
                  $isCorrect={false}
                >
                  {option}
                </BigScreenOptionBox>
              ))}
            </BigScreenOptionsContainer>
          </BigScreenCard>
        </GameScreenContainer>
      </>
    );
  }


  // Active question display
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
                  state.context.leaderboard.map((entry: LeaderboardEntry) => {
                    // Generate a consistent avatar based on player ID
                    const avatarCount = 10;
                    const avatarIndex = (entry.playerId.charCodeAt(0) % avatarCount) + 1;
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

              {/* Options - Vertical stack */}
              <BigScreenOptionsContainer>
                {currentQuestion.options.map((option, index) => {
                  const showAnswer = timer !== undefined && timer <= 0;
                  const isCorrect = index === currentQuestion.correctAnswer;
                  return (
                    <BigScreenOptionButton
                      key={index}
                      disabled
                      style={{
                        backgroundColor: showAnswer && isCorrect ? colors.green[500] : colors.surface,
                        color: showAnswer && isCorrect ? colors.surface : colors.typeMain,
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

              {/* Show explanation after time expires */}
              {timer !== undefined && timer <= 0 && currentQuestion.explanation && (
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
