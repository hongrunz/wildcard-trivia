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
} from './styled/GameComponents';
import { api, tokenStorage, RoomResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import MusicControl from './MusicControl';

interface StartGameProps {
  roomId: string;
}

export default function StartGame({ roomId }: StartGameProps) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

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
        // Add new player to the list
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
      
      case 'game_started':
        // Game has started, navigate to game page
        router.push(`/game/${roomId}`);
        break;
    }
  }, [roomId, router]);

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
      // Store the host's player token if provided
      if (response.playerToken) {
        tokenStorage.setPlayerToken(roomId, response.playerToken);
      }
      // Navigate to the game page
      router.push(`/game/${roomId}`);
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
              <div style={{ color: '#dc2626', marginTop: '1rem' }}>{error}</div>
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

          {/* QR Code */}
          <QRCodeContainer>
            {roomUrl && <QRCodeSVG value={roomUrl} size={200} />}
          </QRCodeContainer>

          <Input value={roomUrl} readOnly />

          {/* Copy URL Button */}
          <ButtonPrimary onClick={handleCopyUrl} style={{ marginBottom: '2rem' }}>
            copy URL
          </ButtonPrimary>

          {error && (
            <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

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
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>No players yet</div>
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
              <div style={{ color: '#16a34a', fontWeight: 600 }}>Game Started</div>
            )}
          </BottomSection>
        </GameContainer>
      </FormCard>
    </PageContainer>
    </>
  );
}

