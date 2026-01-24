'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  PageContainer,
  FormCard,
  Title,
  ButtonSuccess,
  ButtonPrimary,
  Input,
} from './styled/FormComponents';
import {
  QRCodeContainer,
  PlayerAvatar,
  PlayerList,
  Ellipsis,
  GameContainer,
  BottomSection,
  TopicsSection,
  TopicsContainer,
  TopicBadge,
} from './styled/GameComponents';
import { api, tokenStorage, RoomResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import MusicControl from './MusicControl';
import { getSessionMode } from '../lib/deviceDetection';
import { ErrorText } from './styled/ErrorComponents';
import { BigScreenNotice, WarningText } from './styled/InfoComponents';
import { SuccessText, MutedText } from './styled/StatusComponents';

interface StartGameProps {
  roomId: string;
}

export default function StartGame({ roomId }: StartGameProps) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');
  const [sessionMode, setSessionMode] = useState<'player' | 'display'>('player');

  // Detect session mode on mount
  useEffect(() => {
    const mode = getSessionMode();
    setSessionMode(mode);
  }, []);

  // Generate the room URL
  const roomUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join?roomId=${roomId}`;
    }
    return '';
  }, [roomId]);

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    try {
      const roomData = await api.getRoom(roomId);
      setRoom(roomData);
      setError('');
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room');
      setIsLoading(false);
    }
  }, [roomId]);

  // Initial fetch
  useEffect(() => {
    if (roomId) {
      fetchRoom();
    }
  }, [roomId, fetchRoom]);

  // WebSocket connection for real-time updates
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'player_joined':
        // Refresh room data to get updated players and topics
        fetchRoom();
        break;
      
      case 'game_started':
        // Game has started, navigate to appropriate page
        if (sessionMode === 'display') {
          router.push(`/host/${roomId}/display`);
        } else {
          router.push(`/game/${roomId}`);
        }
        break;
    }
  }, [roomId, router, sessionMode, fetchRoom]);

  useWebSocket(roomId, {
    onMessage: handleWebSocketMessage,
  });

  // Background music
  const { isMuted, toggleMute, isLoaded } = useBackgroundMusic('/background-music.mp3', {
    autoPlay: true,
    loop: true,
    volume: 0.3,
  });

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      alert('URL copied to clipboard!');
    } catch (err) {
      alert('Failed to copy URL');
    }
  };

  const handleStart = async () => {
    const hostToken = tokenStorage.getHostToken(roomId);

    if (!hostToken) {
      setError('Host token not found. Please create a new room.');
      return;
    }

    setIsStarting(true);
    setError('');

    try {
      const response = await api.startGame(roomId, hostToken);
      // Store the host's player token if provided (in player mode)
      if (response.playerToken) {
        tokenStorage.setPlayerToken(roomId, response.playerToken);
      }
      // Navigate to appropriate page based on session mode
      if (sessionMode === 'display') {
        // In display mode, go to big screen display
        router.push(`/host/${roomId}/display`);
      } else {
        // In player mode, go to game page
        router.push(`/game/${roomId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game. Please try again.');
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <PageContainer>
          <FormCard>
            <GameContainer>
              <Title>Loading room...</Title>
            </GameContainer>
          </FormCard>
        </PageContainer>
      </>
    );
  }

  if (error && !room) {
    return (
      <>
        <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
        <PageContainer>
          <FormCard>
            <GameContainer>
              <Title>Error</Title>
              <ErrorText>{error}</ErrorText>
            </GameContainer>
          </FormCard>
        </PageContainer>
      </>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <>
      <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
      <PageContainer>
        <FormCard>
          <GameContainer>
            <Title>Ultimate Trivia!</Title>

          {/* Big Screen Mode Notice */}
          {sessionMode === 'display' && (
            <BigScreenNotice>
              <strong>🖥️ Big Screen Mode</strong>
              <br />
              This screen will display questions and leaderboard.
              <br />
              <WarningText>
                You must join as a player on another device to answer questions!
              </WarningText>
            </BigScreenNotice>
          )}

          {/* QR Code */}
          <QRCodeContainer>
            {roomUrl && <QRCodeSVG value={roomUrl} size={200} />}
          </QRCodeContainer>

          <Input value={roomUrl} readOnly />

          {/* Copy URL Button */}
          <ButtonPrimary onClick={handleCopyUrl} style={{ marginBottom: '2rem' }}>
            copy URL
          </ButtonPrimary>

          {/* Display collected topics */}
          {room.collectedTopics && room.collectedTopics.length > 0 && (
            <TopicsSection>
              <MutedText style={{ marginBottom: '0.5rem' }}>
                Topics submitted ({room.collectedTopics.length}):
              </MutedText>
              <TopicsContainer>
                {room.collectedTopics.map((topic, index) => (
                  <TopicBadge key={index}>
                    {topic}
                  </TopicBadge>
                ))}
              </TopicsContainer>
            </TopicsSection>
          )}

          {error && <ErrorText style={{ marginBottom: '1rem' }}>{error}</ErrorText>}

          {/* Bottom section with players and start button */}
          <BottomSection>
            {/* Players list */}
            <PlayerList>
              {room.players.length > 0 ? (
                room.players.map((player) => {
                  // Generate a consistent color based on player ID
                  const colors = [
                    '#3b82f6', // blue-500
                    '#ef4444', // red-500
                    '#10b981', // green-500
                    '#f59e0b', // amber-500
                    '#8b5cf6', // violet-500
                    '#ec4899', // pink-500
                    '#14b8a6', // teal-500
                    '#f97316', // orange-500
                  ];
                  const colorIndex = player.playerId.charCodeAt(0) % colors.length;
                  const bgColor = colors[colorIndex];
                  
                  return (
                    <PlayerAvatar key={player.playerId} $bgColor={bgColor}>
                      {player.playerName.charAt(0).toUpperCase()}
                    </PlayerAvatar>
                  );
                })
              ) : (
                <MutedText>No players yet</MutedText>
              )}
              {room.players.length > 5 && <Ellipsis>...</Ellipsis>}
            </PlayerList>

            {/* Start button - only show if game hasn't started */}
            {room.status === 'waiting' && (
              <ButtonSuccess 
                onClick={handleStart}
                disabled={isStarting || room.players.length === 0}
              >
                {isStarting ? 'Starting...' : 'start'}
              </ButtonSuccess>
            )}
            {room.status === 'started' && (
              <SuccessText>Game Started</SuccessText>
            )}
          </BottomSection>
        </GameContainer>
      </FormCard>
    </PageContainer>
    </>
  );
}

