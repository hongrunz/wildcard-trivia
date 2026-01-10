'use client';

import { useState, useEffect, useMemo } from 'react';
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

interface StartGameProps {
  roomId: string;
}

export default function StartGame({ roomId }: StartGameProps) {
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
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const roomData = await api.getRoom(roomId);
        setRoom(roomData);
        setError('');
      } catch (err) {
        console.error('Error fetching room:', err);
        setError(err instanceof Error ? err.message : 'Failed to load room');
      } finally {
        setIsLoading(false);
      }
    };

    if (roomId) {
      fetchRoom();
      
      // Poll for room updates every 3 seconds
      const interval = setInterval(fetchRoom, 3000);
      return () => clearInterval(interval);
    }
  }, [roomId]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      alert('URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
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
      await api.startGame(roomId, hostToken);
      // Refresh room data to get questions
      const updatedRoom = await api.getRoom(roomId);
      setRoom(updatedRoom);
      alert('Game started successfully!');
      // TODO: Navigate to game view when implemented
    } catch (err) {
      console.error('Error starting game:', err);
      setError(err instanceof Error ? err.message : 'Failed to start game. Please try again.');
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <FormCard>
          <GameContainer>
            <Title>Loading room...</Title>
          </GameContainer>
        </FormCard>
      </PageContainer>
    );
  }

  if (error && !room) {
    return (
      <PageContainer>
        <FormCard>
          <GameContainer>
            <Title>Error</Title>
            <div style={{ color: '#dc2626', marginTop: '1rem' }}>{error}</div>
          </GameContainer>
        </FormCard>
      </PageContainer>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <PageContainer>
      <FormCard>
        <GameContainer>
          <Title>{room.name}</Title>

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
                room.players.map((player, index) => (
                  <PlayerAvatar key={player.playerId}>
                    {player.playerName.charAt(0).toUpperCase()}
                  </PlayerAvatar>
                ))
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
  );
}

