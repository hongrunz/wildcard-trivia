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
import PlayerHeader from './PlayerHeader';
import {
  PlayerPageContainer,
  PlayerPageContent,
  QRCodeContainer,
  GameContainer,
  TopicsSection,
  TopicsContainer,
  TopicBadge,
  CardsContainer,
  PlayerListCard,
  PlayerListTitle,
  PlayerListItem,
  PlayerListItemAvatar,
  PlayerListItemName,
  PlayerListContainer,
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

  // Detect session mode after mount to avoid hydration mismatch
  useEffect(() => {
    setSessionMode(getSessionMode());
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
      void fetchRoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // WebSocket connection for real-time updates
  const handleWebSocketMessage = useCallback((message: { 
    type: string; 
    startedAt?: string;
    submittedCount?: number;
    totalPlayers?: number;
  }) => {
    switch (message.type) {
      case 'player_joined':
        // Refresh room data to get updated players and topics
        fetchRoom();
        break;
      
      case 'topic_submitted':
        // Refresh room data to get updated collected topics
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
    } catch {
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
      <PlayerPageContainer>
        <PlayerHeader />
        <PlayerPageContent>
        <CardsContainer>
          {/* Player List Card */}
          <PlayerListCard>
            <PlayerListTitle>Players</PlayerListTitle>
            <PlayerListContainer>
              {room.players.length > 0 ? (
                room.players.map((player, index) => {
                  // Assign unique avatars by position (1–10); wrap only when more than 10 players
                  const avatarCount = 10;
                  const avatarIndex = (index % avatarCount) + 1;
                  const avatarSrc = `/assets/avatars/avatar_${avatarIndex}.svg`;
                  
                  return (
                    <PlayerListItem key={player.playerId}>
                      <PlayerListItemAvatar $avatarSrc={avatarSrc}>
                        {player.playerName.charAt(0).toUpperCase()}
                      </PlayerListItemAvatar>
                      <PlayerListItemName>{player.playerName}</PlayerListItemName>
                    </PlayerListItem>
                  );
                })
              ) : (
                <MutedText style={{ textAlign: 'center', padding: '2rem 0' }}>
                  No players yet
                </MutedText>
              )}
            </PlayerListContainer>
          </PlayerListCard>

          {/* Main Game Card */}
          <FormCard>
            <GameContainer>
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
                Copy URL
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

              {/* Start button - only show if game hasn't started */}
              {room.status === 'waiting' && (
                <ButtonSuccess 
                  onClick={handleStart}
                  disabled={isStarting || room.players.length === 0}
                >
                  {isStarting ? 'Starting...' : 'Start'}
                </ButtonSuccess>
              )}
              {room.status === 'started' && (
                <SuccessText>Game Started</SuccessText>
              )}
            </GameContainer>
          </FormCard>
        </CardsContainer>
        </PlayerPageContent>
      </PlayerPageContainer>
    </>
  );
}

