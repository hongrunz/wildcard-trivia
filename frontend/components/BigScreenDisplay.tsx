'use client';

import { useState, useEffect, useCallback } from 'react';
import GameFinished from './GameFinished';
import { api, RoomResponse, LeaderboardResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import { useGameTimer } from '../lib/useGameTimer';
import MusicControl from './MusicControl';
import { GameScreenContainer, GameTitle, LeaderboardList, TopicsContainer, TopicBadge, GameTitleImage, PlayerListTitle, PlayerListItem, PlayerListItemAvatar, PlayerListItemName, PlayerListContainer } from './styled/GameComponents';
import {
  BigScreenCard,
  BigScreenHeader,
  BigScreenBadge,
  BigScreenQuestionText,
  BigScreenExplanation,
  BigScreenLeaderboardSection,
  BigScreenLeaderboardHeading,
  BigScreenLeaderboardItem,
  ErrorTitle,
  BigScreenLayout,
  GamePlayStatus,
  BigScreenLeaderboardCard,
  BigScreenQuestionCard,
  BigScreenContainer,
  BigScreenGameTitle,
  BigScreenGameTitlePart,
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
import { OptionsContainer, OptionButton, BigScreenOptionsContainer, BigScreenOptionButton } from './styled/OptionsContainer';
import { MutedText } from './styled/StatusComponents';
import { colors, typography } from './styled/theme';

interface BigScreenDisplayProps {
  roomId: string;
}

interface LeaderboardEntry {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
  topicScore?: { [topic: string]: number };
}

type GameState = 'question' | 'submitted' | 'finished';

export default function BigScreenDisplay({ roomId }: BigScreenDisplayProps) {
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [gameState, setGameState] = useState<GameState>('question');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameStartedAt, setGameStartedAt] = useState<Date | null>(null);

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

      // Always try to fetch leaderboard, even if game hasn't started
      fetchLeaderboard();

      if (roomData.status === 'started' && roomData.questions) {
        setIsLoading(false);
        setGameState('question');
        
        // Parse and set game start timestamp for timer synchronization
        if (roomData.startedAt) {
          const startTime = new Date(roomData.startedAt);
          if (!isNaN(startTime.getTime())) {
            setGameStartedAt(startTime);
          }
        }
      } else if (roomData.status === 'finished') {
        setGameState('finished');
        setIsLoading(false);
      } else {
        setGameState('question');
        setIsLoading(false);
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
    // Just stay in question state, but players can't submit anymore
  }, []);

  const handleQuestionChanged = useCallback(() => {
    setGameState('question');
    fetchLeaderboard();
  }, [fetchLeaderboard]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Loading state
  if (isLoading) {
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
  if (error) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenContainer>
          <BigScreenCard>
            <ErrorTitle>Error: {error}</ErrorTitle>
          </BigScreenCard>
        </BigScreenContainer>
      </>
    );
  }

  // Waiting for game to start
  if (!room?.questions?.length) {
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
  if (gameState === 'question' && !gameStartedAt) {
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

  const currentQuestion = room.questions[currentQuestionIndex];
  
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

  // Game finished state
  if (gameState === 'finished') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameFinished
          totalQuestions={room.questionsPerRound}
          finalScore={0} // Big screen doesn't have a score
          leaderboard={leaderboard}
        />
      </>
    );
  }

  // Calculate current round (assuming 10 questions per round)
  const questionsPerRound = 10;
  const currentRound = Math.floor(currentQuestionIndex / questionsPerRound) + 1;
  const totalRounds = Math.ceil(room.questionsPerRound / questionsPerRound);

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
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry) => {
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
              <span>Round {currentRound} of {totalRounds}</span>
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
