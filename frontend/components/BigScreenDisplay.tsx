'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMachine } from '@xstate/react';
import GameFinished from './GameFinished';
import BigScreenRoundFinished from './BigScreenRoundFinished';
import BigScreenNewRound from './BigScreenNewRound';
import { api, tokenStorage, LeaderboardResponse, RoomResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import { useGameTimerDisplay } from '../lib/useGameTimerDisplay';
import { useVoiceCommentary } from '../lib/useVoiceCommentary';
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
  PointsGainBadge,
  BigScreenRightContainer,
  RoundStartLoadingSpinner,
  RoundStartLoadingText,
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

  // Points gained this question (for "+N" animation after answer reveal); key = playerId
  const [pointsGained, setPointsGained] = useState<Record<string, number>>({});

  // Fallback: track which players have submitted for current question; transition when we've seen everyone (if backend never sends all_answers_submitted)
  const submittedForQuestionRef = useRef<Map<string, Set<string>>>(new Map());
  
  // Local state for topic submission tracking (not part of game state machine)
  const [topicSubmissionCount, setTopicSubmissionCount] = useState(0);
  const [collectedTopics, setCollectedTopics] = useState<string[]>([]);
  // Load timeout: show error + retry if we're stuck in loading without room data
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  // Start game error (e.g. Gemini API invalid) – from sessionStorage when display loads after failed start
  const [startGameError, setStartGameError] = useState<string | null>(null);
  // Questions wait timeout: still no questions after 60s (e.g. start failed silently or server slow)
  const [questionsWaitTimedOut, setQuestionsWaitTimedOut] = useState(false);
  // Room/players from previous screen (Start Game) so we can show the list immediately while loading
  const [initialRoomFromStorage, setInitialRoomFromStorage] = useState<RoomResponse | null>(null);

  // Background music hook (must be before callbacks/effects that use it)
  const { isMuted, toggleMute, isLoaded, setVolume: setMusicVolume } = useBackgroundMusic('/background-music.mp3', {
    autoPlay: true,
    loop: true,
    volume: 0.3,
  });

  // Voice commentary hook (must be before callbacks/effects that use it)
  const {
    playQuestionAudio,
    isPlaying: isCommentaryPlaying,
  } = useVoiceCommentary(roomId, { volume: 0.8, autoPlay: true });

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

  const fetchLeaderboard = useCallback(async (options?: { trackPointsGain?: boolean }) => {
    const prevLeaderboard = stateRef.current.context.leaderboard;
    try {
      const leaderboardData = await api.getLeaderboard(roomId);
      const currentRoom = await api.getRoom(roomId);
      send({ type: 'ROOM_UPDATED', room: currentRoom });
      const formattedLeaderboard = mapLeaderboardData(leaderboardData, currentRoom.players);
      if (options?.trackPointsGain && prevLeaderboard.length > 0) {
        const gains: Record<string, number> = {};
        formattedLeaderboard.forEach((entry) => {
          const prev = prevLeaderboard.find((e) => e.playerId === entry.playerId);
          const prevPoints = prev?.points ?? 0;
          const delta = entry.points - prevPoints;
          if (delta > 0) gains[entry.playerId] = delta;
        });
        setPointsGained(gains);
        setTimeout(() => setPointsGained({}), 4000);
      }
      send({ type: 'LEADERBOARD_UPDATED', leaderboard: formattedLeaderboard });
    } catch {
      send({ type: 'LEADERBOARD_UPDATED', leaderboard: [] });
      setPointsGained({});
    }
  }, [roomId, mapLeaderboardData, send]);

  const fetchRoom = useCallback(async () => {
    if (!roomId) {
      send({ type: 'ERROR', error: 'Invalid room. Please use the link from the host.' });
      return;
    }
    try {
      const roomData = await api.getRoom(roomId);

      // Always try to fetch leaderboard, even if game hasn't started
      fetchLeaderboard();

      if (roomData.status === 'started' && roomData.questions?.length) {
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

  // Advance from submitted at server time (reviewStartedAt + 8s) so big screen and players stay in sync
  const submittedEnteredAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (state.value !== 'submitted') {
      submittedEnteredAtRef.current = null;
      return;
    }
    if (submittedEnteredAtRef.current === null) {
      submittedEnteredAtRef.current = Date.now();
    }
    const reviewStartedAt = state.context.reviewStartedAt;
    const deadlineMs = reviewStartedAt
      ? reviewStartedAt.getTime() + 8000
      : submittedEnteredAtRef.current + 8000;
    const check = () => {
      if (Date.now() >= deadlineMs) {
        send({ type: 'ADVANCE_AFTER_REVIEW' });
        return true;
      }
      return false;
    };
    if (check()) return;
    const interval = setInterval(() => {
      if (check()) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [state.value, state.context.reviewStartedAt, send]);

  // Initial room fetch when roomId is available (params can be undefined on first paint)
  useEffect(() => {
    if (roomId) {
      setLoadTimedOut(false);
      fetchRoom();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // When stuck in initial loading (no room yet), also fetch leaderboard so we get room + list sooner
  useEffect(() => {
    if (state.value === 'loading' && !state.context.room && roomId) {
      fetchLeaderboard();
    }
  }, [state.value, state.context.room, roomId, fetchLeaderboard]);

  // Fetch leaderboard only when we enter answer-reveal (submitted) state; track points gained for animation
  const prevStateRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentState = typeof state.value === 'string' ? state.value : undefined;
    if (currentState === 'submitted' && prevStateRef.current !== 'submitted') {
      fetchLeaderboard({ trackPointsGain: true });
    }
    prevStateRef.current = currentState;
  }, [state.value, fetchLeaderboard]);

  // Voice commentary: Listen to game state machine transitions
  const prevStateValueRef = useRef<string | Record<string, unknown> | undefined>(undefined);
  useEffect(() => {
    const prevState = prevStateValueRef.current;
    const currentState = state.value;


    // question state entry → Play question audio and lower background music volume
    // Only when transitioning INTO question state, not when question index changes within question state
    if (currentState === 'question' && prevState !== 'question') {
      const currentQuestion = state.context.room?.questions?.[state.context.currentQuestionIndex];
      if (currentQuestion?.questionAudioUrl) {
        // Lower background music volume during question
        setMusicVolume(0.1);
        // Play the question audio
        playQuestionAudio(currentQuestion.questionAudioUrl);
      }
    }

    // Update ref
    prevStateValueRef.current = currentState;

    // Restore background music volume when commentary finishes
    if (!isCommentaryPlaying && prevState !== currentState && currentState !== 'question') {
      // Small delay to ensure audio has stopped
      const timer = setTimeout(() => {
        setMusicVolume(0.3);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.value, state.context, playQuestionAudio, isCommentaryPlaying, setMusicVolume, roomId]);

  // Read room/players from previous screen (Start Game) so we can show the list immediately
  useEffect(() => {
    if (!roomId) return;
    try {
      const raw = sessionStorage.getItem('displayInitialRoom');
      if (!raw) return;
      const { roomId: storedRoomId, room } = JSON.parse(raw) as { roomId: string; room: RoomResponse };
      if (storedRoomId === roomId && room?.players) {
        setInitialRoomFromStorage(room);
      }
    } catch {
      // ignore
    }
  }, [roomId]);

  // Clear stored initial room once we have real room data
  useEffect(() => {
    if (state.context.room) {
      try {
        sessionStorage.removeItem('displayInitialRoom');
      } catch {
        // ignore
      }
      setInitialRoomFromStorage(null);
    }
  }, [state.context.room]);

  // Timeout: if we're still loading with no room after 30s, show error + retry
  useEffect(() => {
    if (state.value !== 'loading' || state.context.room || !roomId) return;
    const t = setTimeout(() => setLoadTimedOut(true), 30000);
    return () => clearTimeout(t);
  }, [state.value, state.context.room, roomId]);

  // When load times out, read sessionStorage for startGameError (e.g. Gemini failed before we got room)
  useEffect(() => {
    if (!loadTimedOut || !roomId) return;
    try {
      const raw = sessionStorage.getItem('startGameError');
      if (!raw) return;
      const { roomId: storedRoomId, message } = JSON.parse(raw) as { roomId: string; message: string };
      if (storedRoomId === roomId) {
        setStartGameError(message);
        sessionStorage.removeItem('startGameError');
      }
    } catch {
      sessionStorage.removeItem('startGameError');
    }
  }, [loadTimedOut, roomId]);

  // Poll for questions while showing RoundStartWaiting (host clicked Start, backend generating)
  useEffect(() => {
    if (!state.context.room || state.context.room.questions?.length) return;
    const interval = setInterval(() => {
      fetchRoom();
    }, 2000);
    return () => clearInterval(interval);
  }, [state.context.room?.roomId, state.context.room?.questions?.length, fetchRoom]);

  // Read startGameError from sessionStorage when we're waiting for questions (e.g. Gemini API failed)
  useEffect(() => {
    const room = state.context.room;
    if (!room || room.questions?.length) return;
    try {
      const raw = sessionStorage.getItem('startGameError');
      if (!raw) return;
      const { roomId: storedRoomId, message } = JSON.parse(raw) as { roomId: string; message: string };
      if (storedRoomId === roomId) {
        setStartGameError(message);
        sessionStorage.removeItem('startGameError');
      }
    } catch {
      sessionStorage.removeItem('startGameError');
    }
  }, [roomId, state.context.room?.roomId, state.context.room?.questions?.length]);

  // Timeout: still no questions after 60s (e.g. Gemini API invalid, server misconfigured)
  useEffect(() => {
    const room = state.context.room;
    if (!room || room.questions?.length) return;
    setQuestionsWaitTimedOut(false);
    const t = setTimeout(() => setQuestionsWaitTimedOut(true), 60000);
    return () => clearTimeout(t);
  }, [roomId, state.context.room?.roomId, state.context.room?.questions?.length]);

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
    reviewStartedAt?: string;
    currentRound?: number;
    questionId?: string;
    playerId?: string;
    submittedCount?: number;
    topic?: string;
    topics?: string[];
    nextRound?: number;
    audioUrl?: string;
    text?: string;
    eventType?: string;
    data?: Record<string, unknown>;
    priority?: boolean;
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
      // Do not fetch leaderboard here — only update after answer is revealed
      return;
    }

    if (message.type === 'all_answers_submitted') {
      const current = stateRef.current;
      const inQuestion = current.value === 'question';
      const currentQuestionId = current.context.room?.questions?.[current.context.currentQuestionIndex]?.id;
      const messageQuestionId = message.questionId != null ? String(message.questionId) : '';
      const questionMatch = !messageQuestionId || !currentQuestionId || messageQuestionId === String(currentQuestionId);
      if (inQuestion && questionMatch) {
        const reviewStartedAt =
          typeof message.reviewStartedAt === 'string'
            ? new Date(message.reviewStartedAt)
            : undefined;
        send({
          type: 'ALL_ANSWERED',
          ...(isNaN(reviewStartedAt?.getTime() ?? NaN) ? {} : { reviewStartedAt: reviewStartedAt! }),
        });
      }
      // Leaderboard will be fetched when we enter 'submitted' (see effect below)
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

    // Handle commentary messages from WebSocket
    // if (message.type === 'commentary_ready' && message.audioUrl) {
    //   playCommentary(message.audioUrl, message.text, false);
    // }

    // if (message.type === 'commentary_event' && message.eventType) {
    //   playEventCommentary(message.eventType, message.data || {}, message.priority || false);
    // }
  }, [fetchRoom, fetchLeaderboard, roomId, send]);

  const handleRetryStartGame = useCallback(() => {
    setStartGameError(null);
    setQuestionsWaitTimedOut(false);
    try {
      sessionStorage.removeItem('startGameError');
    } catch {
      // ignore
    }
    const hostToken = roomId ? tokenStorage.getHostToken(roomId) : null;
    if (roomId && hostToken) {
      api.startGame(roomId, hostToken).then(() => fetchRoom()).catch((err) => {
        setStartGameError(err instanceof Error ? err.message : 'Failed to start game');
      });
    } else {
      fetchRoom();
    }
  }, [roomId, fetchRoom]);

  // WebSocket connection
  useWebSocket(roomId, {
    onMessage: handleWebSocketMessage,
  });


  // Invalid room: no roomId (e.g. wrong URL)
  if (!roomId) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenCard>
            <ErrorTitle>Invalid room</ErrorTitle>
            <MutedText style={{ marginTop: '1rem', textAlign: 'center' }}>
              Please use the link from the host to join the display.
            </MutedText>
          </BigScreenCard>
        </BigScreenContainer>
      </>
    );
  }

  // Loading state: no room data yet (same layout as RoundStartWaiting for consistent UX)
  const isLoadingNoRoom = state.value === 'loading' && !state.context.room;
  if (isLoadingNoRoom) {
    // Timed out: show error + retry (show startGameError from sessionStorage if present, e.g. Gemini API)
    if (loadTimedOut) {
      const loadErrorTitle = startGameError ? "Couldn't start the game" : "Couldn't connect";
      const loadErrorBody = startGameError
        ? "The server couldn't generate questions. Check the message on the right."
        : "Check that the room link is correct and the host has started the game.";
      return (
        <>
          <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
          <BigScreenContainer>
            <BigScreenLayout>
              <GamePlayStatus>
                <BigScreenGameTitle>
                  <GameTitleImage src="/assets/game_title.svg" alt="Wildcard Trivia" />
                </BigScreenGameTitle>
                <TriviCommentaryCard>
                  <TriviCommentaryCharacterContainer>
                    <img src="/assets/Trivi_big_smile.svg" alt="Trivi character" />
                  </TriviCommentaryCharacterContainer>
                  <TriviCommentaryTextContainer>
                    <TriviCommentaryTitle>{loadErrorTitle}</TriviCommentaryTitle>
                    <TriviCommentaryBody>
                      {loadErrorBody}
                    </TriviCommentaryBody>
                  </TriviCommentaryTextContainer>
                </TriviCommentaryCard>
                <BigScreenLeaderboardCard>
                  <PlayerListTitle>Players</PlayerListTitle>
                  <PlayerListContainer>
                    <MutedText style={{ textAlign: 'center', padding: '2rem 0' }}>—</MutedText>
                  </PlayerListContainer>
                </BigScreenLeaderboardCard>
              </GamePlayStatus>
              <BigScreenRightContainer style={{ justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
                <RoundStartLoadingText style={{ color: colors.surface, textAlign: 'center', maxWidth: '28rem' }}>
                  {startGameError ?? 'Try again'}
                </RoundStartLoadingText>
                <button
                  type="button"
                  onClick={() => {
                    setLoadTimedOut(false);
                    setStartGameError(null);
                    fetchRoom();
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: colors.primary,
                    backgroundColor: colors.surface,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </BigScreenRightContainer>
            </BigScreenLayout>
          </BigScreenContainer>
        </>
      );
    }
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenLayout>
            <GamePlayStatus>
              <BigScreenGameTitle>
                <GameTitleImage src="/assets/game_title.svg" alt="Wildcard Trivia" />
              </BigScreenGameTitle>

              <TriviCommentaryCard>
                <TriviCommentaryCharacterContainer>
                  <img src="/assets/Trivi_big_smile.svg" alt="Trivi character" />
                </TriviCommentaryCharacterContainer>
                <TriviCommentaryTextContainer>
                  <TriviCommentaryTitle>On it!</TriviCommentaryTitle>
                  <TriviCommentaryBody>
                    Working on getting your questions ready...
                  </TriviCommentaryBody>
                </TriviCommentaryTextContainer>
              </TriviCommentaryCard>

              <BigScreenLeaderboardCard>
                <PlayerListTitle>Leaderboard</PlayerListTitle>
                <PlayerListContainer>
                  {initialRoomFromStorage?.players?.length ? (
                    initialRoomFromStorage.players.map((player, index) => {
                      const avatarCount = 10;
                      const avatarIndex = (index % avatarCount) + 1;
                      const avatarSrc = `/assets/avatars/avatar_${avatarIndex}.svg`;
                      return (
                        <PlayerListItem key={player.playerId}>
                          <PlayerListItemAvatar $avatarSrc={avatarSrc}>
                            {player.playerName.charAt(0).toUpperCase()}
                          </PlayerListItemAvatar>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <PlayerListItemName>
                              #{index + 1} {player.playerName}
                            </PlayerListItemName>
                            <LeaderboardScore>0</LeaderboardScore>
                          </div>
                        </PlayerListItem>
                      );
                    })
                  ) : (
                    <MutedText style={{ textAlign: 'center', padding: '2rem 0' }}>
                      Loading...
                    </MutedText>
                  )}
                </PlayerListContainer>
              </BigScreenLeaderboardCard>
            </GamePlayStatus>

            <BigScreenRightContainer style={{ justifyContent: 'center' }}>
              <RoundStartLoadingSpinner />
              <RoundStartLoadingText>Loading...</RoundStartLoadingText>
            </BigScreenRightContainer>
          </BigScreenLayout>
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

  // Round start waiting: room exists but questions not ready yet (same layout as gameplay, right = loading or error)
  const roomWaitingForQuestions = state.context.room && !state.context.room.questions?.length ? state.context.room : null;
  const showQuestionsError = roomWaitingForQuestions && (startGameError || questionsWaitTimedOut);

  if (roomWaitingForQuestions) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenLayout>
            <GamePlayStatus>
              <BigScreenGameTitle>
                <GameTitleImage src="/assets/game_title.svg" alt="Wildcard Trivia" />
              </BigScreenGameTitle>

              <TriviCommentaryCard>
                <TriviCommentaryCharacterContainer>
                  <img src="/assets/Trivi_big_smile.svg" alt="Trivi character" />
                </TriviCommentaryCharacterContainer>
                <TriviCommentaryTextContainer>
                  <TriviCommentaryTitle>
                    {showQuestionsError ? "Something went wrong" : "On it!"}
                  </TriviCommentaryTitle>
                  <TriviCommentaryBody>
                    {showQuestionsError
                      ? (startGameError
                        ? "The server couldn't start the game. Check the message on the right and try again."
                        : "Questions are taking too long. The server may need a valid Gemini API key (backend/.env).")
                      : "Working on getting your questions ready..."}
                  </TriviCommentaryBody>
                </TriviCommentaryTextContainer>
              </TriviCommentaryCard>

              <BigScreenLeaderboardCard>
                <PlayerListTitle>Leaderboard</PlayerListTitle>
                <PlayerListContainer>
                  {state.context.leaderboard.length > 0 ? (
                    state.context.leaderboard.map((entry: LeaderboardEntry, index: number) => {
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
                  ) : roomWaitingForQuestions.players.length > 0 ? (
                    roomWaitingForQuestions.players.map((player, index) => {
                      const avatarCount = 10;
                      const avatarIndex = (index % avatarCount) + 1;
                      const avatarSrc = `/assets/avatars/avatar_${avatarIndex}.svg`;
                      return (
                        <PlayerListItem key={player.playerId}>
                          <PlayerListItemAvatar $avatarSrc={avatarSrc}>
                            {player.playerName.charAt(0).toUpperCase()}
                          </PlayerListItemAvatar>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <PlayerListItemName>
                              #{index + 1} {player.playerName}
                            </PlayerListItemName>
                            <LeaderboardScore>0</LeaderboardScore>
                          </div>
                        </PlayerListItem>
                      );
                    })
                  ) : (
                    <MutedText style={{ textAlign: 'center', padding: '2rem 0' }}>
                      No players yet
                    </MutedText>
                  )}
                </PlayerListContainer>
              </BigScreenLeaderboardCard>
            </GamePlayStatus>

            <BigScreenRightContainer style={{ justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
              {showQuestionsError ? (
                <>
                  <RoundStartLoadingText style={{ color: colors.surface, textAlign: 'center', maxWidth: '28rem' }}>
                    {startGameError ?? 'Questions are taking too long. The server may need a valid Gemini API key.'}
                  </RoundStartLoadingText>
                  <button
                    type="button"
                    onClick={handleRetryStartGame}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: colors.primary,
                      backgroundColor: colors.surface,
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <RoundStartLoadingSpinner />
                  <RoundStartLoadingText>Loading...</RoundStartLoadingText>
                </>
              )}
            </BigScreenRightContainer>
          </BigScreenLayout>
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
  if (state.value === 'roundFinished' && state.context.room) {
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
  if (state.value === 'newRound' && state.context.room) {
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
  if (state.value === 'finished' && state.context.room) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameFinished
          roomId={roomId}
          totalQuestions={state.context.room.questionsPerRound}
          finalScore={0}
          leaderboard={state.context.leaderboard}
        />
      </>
    );
  }

  const room = state.context.room;
  const currentQuestion = room?.questions?.[currentQuestionIndex];

  // Question loading state
  if (!room || !currentQuestion) {
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
                    const avatarCount = 10;
                    const avatarIndex = (index % avatarCount) + 1;
                    const avatarSrc = `/assets/avatars/avatar_${avatarIndex}.svg`;
                    const gain = pointsGained[entry.playerId];
                    return (
                      <PlayerListItem key={entry.playerId}>
                        <PlayerListItemAvatar $avatarSrc={avatarSrc}>
                          {entry.playerName.charAt(0).toUpperCase()}
                        </PlayerListItemAvatar>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                          <PlayerListItemName>
                            #{entry.rank} {entry.playerName}
                          </PlayerListItemName>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <LeaderboardScore>{entry.points}</LeaderboardScore>
                            {gain != null && gain > 0 && (
                              <PointsGainBadge>+{gain}</PointsGainBadge>
                            )}
                          </span>
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
              <span>Round {room.currentRound} of {room.numRounds}</span>
              <TimerBadge>{timer !== undefined ? `${timer}s` : '--'}</TimerBadge>
            </BigScreenTopBar>

            {/* Question Card */}
            <BigScreenQuestionCard>
              {/* Question progress */}
              <QuestionProgress>
                Question {currentQuestionIndex + 1}/{room.questionsPerRound}
              </QuestionProgress>

              {/* Question text */}
              <BigScreenQuestionText>
                {currentQuestion.question}
              </BigScreenQuestionText>

              {/* Options: during question show all; when answer revealed show only correct with label */}
              <BigScreenOptionsContainer>
                {state.value === 'submitted' ? (
                  <>
                    <p
                      style={{
                        width: '100%',
                        margin: 0,
                        marginBottom: '0.5rem',
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: colors.typeMain,
                      }}
                    >
                      The correct answer is…
                    </p>
                    <BigScreenOptionButton
                      disabled
                      style={{
                        backgroundColor: colors.green[500],
                        color: colors.surface,
                        cursor: 'default',
                        textAlign: 'center',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {currentQuestion.options[currentQuestion.correctAnswer]}
                    </BigScreenOptionButton>
                  </>
                ) : (
                  currentQuestion.options.map((option, index) => (
                    <BigScreenOptionButton
                      key={index}
                      disabled
                      style={{
                        backgroundColor: colors.surface,
                        color: colors.typeMain,
                        cursor: 'default',
                        textAlign: 'center',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {option}
                    </BigScreenOptionButton>
                  ))
                )}
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
