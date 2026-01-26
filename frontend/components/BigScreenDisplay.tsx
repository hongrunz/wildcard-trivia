'use client';

import { useState, useEffect, useCallback } from 'react';
import GameFinished from './GameFinished';
import BigScreenRoundFinished from './BigScreenRoundFinished';
import { api, RoomResponse, LeaderboardResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import { useGameTimer } from '../lib/useGameTimer';
import MusicControl from './MusicControl';
import { GameScreenContainer, GameTitle, LeaderboardList, TopicsContainer, TopicBadge, GameTitleImage } from './styled/GameComponents';
import {
  BigScreenCard,
  BigScreenHeader,
  BigScreenBadge,
  BigScreenQuestionText,
  BigScreenOptionsContainer,
  BigScreenOptionBox,
  BigScreenExplanation,
  BigScreenLeaderboardSection,
  BigScreenLeaderboardHeading,
  BigScreenLeaderboardItem,
  ErrorTitle,
} from './styled/BigScreenComponents';
import { MutedText } from './styled/StatusComponents';

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

type GameState = 'question' | 'waiting' | 'submitted' | 'round_finished' | 'finished';

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
        
        fetchLeaderboard();
      } else if (roomData.status === 'finished') {
        setGameState('finished');
        setIsLoading(false);
        fetchLeaderboard();
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

  const handleRoundFinished = useCallback(() => {
    setGameState('round_finished');
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleTimerExpired = useCallback(() => {
    // When answer timer expires, move to waiting (which triggers submitted next)
    if (gameState === 'question') {
      setGameState('waiting');
    }
    // When waiting timer expires, move to submitted (show answer)
    if (gameState === 'waiting') {
      setGameState('submitted');
      fetchLeaderboard();
    }
  }, [gameState, fetchLeaderboard]);

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
    onRoundFinished: handleRoundFinished,
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
        <GameScreenContainer>
          <BigScreenCard>
            <GameTitle>Loading game...</GameTitle>
          </BigScreenCard>
        </GameScreenContainer>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameScreenContainer>
          <BigScreenCard>
            <ErrorTitle>Error: {error}</ErrorTitle>
          </BigScreenCard>
        </GameScreenContainer>
      </>
    );
  }

  // Waiting for game to start
  if (!room?.questions?.length) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameScreenContainer>
          <BigScreenCard>
            <GameTitle>Waiting for game to start...</GameTitle>
          </BigScreenCard>
        </GameScreenContainer>
      </>
    );
  }

  // Check for server sync during active gameplay
  if ((gameState === 'question' || gameState === 'waiting' || gameState === 'submitted') && !gameStartedAt) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameScreenContainer>
          <BigScreenCard>
            <GameTitle>Synchronizing with server...</GameTitle>
          </BigScreenCard>
        </GameScreenContainer>
      </>
    );
  }

  // Round finished state (show between rounds)
  if (gameState === 'round_finished') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <BigScreenRoundFinished
          currentRound={room.currentRound}
          totalRounds={room.numRounds}
          leaderboard={leaderboard}
          timer={timer}
        />
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

  const currentQuestion = room.questions[currentQuestionIndex];
  
  // Question loading state
  if (!currentQuestion) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameScreenContainer>
          <BigScreenCard>
            <GameTitle>Loading question {currentQuestionIndex + 1}...</GameTitle>
          </BigScreenCard>
        </GameScreenContainer>
      </>
    );
  }

  // Active question or waiting display
  if (gameState === 'question' || gameState === 'waiting') {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <GameScreenContainer>
          <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
          <BigScreenCard>
            {/* Header with question number and timer */}
            <BigScreenHeader>
              <BigScreenBadge>
                {currentQuestionIndex + 1}/{room.questionsPerRound}
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

  // Answer reveal with leaderboard (8-second review period)
  return (
    <>
      <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
      <GameScreenContainer>
        <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
        <BigScreenCard>
          {/* Header with question number and timer */}
          <BigScreenHeader>
            <BigScreenBadge>
              {currentQuestionIndex + 1}/{room.questionsPerRound}
            </BigScreenBadge>
            <BigScreenBadge>
              Review: {timer}s
            </BigScreenBadge>
          </BigScreenHeader>

          {/* Title */}
          <GameTitle>Answer Revealed!</GameTitle>

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

          {/* Options with answer revealed */}
          <BigScreenOptionsContainer>
            {currentQuestion.options.map((option, index) => (
              <BigScreenOptionBox 
                key={index}
                $showAnswer={true}
                $isCorrect={index === currentQuestion.correctAnswer}
              >
                {option}
              </BigScreenOptionBox>
            ))}
          </BigScreenOptionsContainer>

          {/* Show explanation */}
          {currentQuestion.explanation && (
            <BigScreenExplanation>
              <strong>Explanation:</strong> {currentQuestion.explanation}
            </BigScreenExplanation>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <BigScreenLeaderboardSection>
              <BigScreenLeaderboardHeading>Leaderboard:</BigScreenLeaderboardHeading>
              <LeaderboardList>
                {leaderboard.slice(0, 5).map((entry) => (
                  <BigScreenLeaderboardItem key={entry.playerId}>
                    <div>
                      <span>#{entry.rank} {entry.playerName}</span>
                      <span>... {entry.points} pts</span>
                    </div>
                    {entry.topicScore && Object.keys(entry.topicScore).length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {Object.entries(entry.topicScore).map(([topic, score]) => (
                          <TopicBadge key={topic} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                            {topic}: {score}
                          </TopicBadge>
                        ))}
                      </div>
                    )}
                  </BigScreenLeaderboardItem>
                ))}
              </LeaderboardList>
            </BigScreenLeaderboardSection>
          )}
        </BigScreenCard>
      </GameScreenContainer>
    </>
  );
}
