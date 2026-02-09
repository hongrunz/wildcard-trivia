'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  ButtonSuccess,
  ButtonPrimary,
  Input,
} from './styled/FormComponents';
import { GameTitleImage } from './styled/GameComponents';
import {
  BigScreenContainer,
  BigScreenLayout,
  BigScreenRightContainer,
  BigScreenGameTitle,
  BigScreenLeaderboardCard,
  TriviCommentaryCharacterContainer,
  TriviCommentaryTextContainer,
  TriviCommentaryTitle,
  TriviCommentaryBody,
  CreateGameLeftSection,
  CreateGameWelcomeCard,
  CreateGameSectionTitle,
  StartGameFormCard,
} from './styled/BigScreenComponents';
import {
  QRCodeContainer,
  PlayerListTitle,
  PlayerListItem,
  PlayerListItemAvatar,
  PlayerListItemName,
  PlayerListContainer,
  TopicsContainer,
  TopicBadge,
  GameContainer,
} from './styled/GameComponents';
import { api, tokenStorage, RoomResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import MusicControl from './MusicControl';
import { ErrorText } from './styled/ErrorComponents';
import { BigScreenNotice } from './styled/InfoComponents';
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

  const roomUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join?roomId=${roomId}`;
    }
    return '';
  }, [roomId]);

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

  useEffect(() => {
    if (roomId) {
      void fetchRoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleWebSocketMessage = useCallback((message: {
    type: string;
    startedAt?: string;
    submittedCount?: number;
    totalPlayers?: number;
  }) => {
    switch (message.type) {
      case 'player_joined':
        fetchRoom();
        break;
      case 'topic_submitted':
        fetchRoom();
        break;
      case 'game_started':
        router.push(`/host/${roomId}/display`);
        break;
    }
  }, [roomId, router, fetchRoom]);

  useWebSocket(roomId, {
    onMessage: handleWebSocketMessage,
  });

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

    setError('');

    // Pass current room/players to display so it can show the list immediately while loading
    if (room) {
      try {
        sessionStorage.setItem('displayInitialRoom', JSON.stringify({ roomId, room }));
      } catch {
        // ignore
      }
    }
    router.push(`/host/${roomId}/display`);
    setIsStarting(true);
    api.startGame(roomId, hostToken).then((response) => {
      if (response.playerToken) {
        tokenStorage.setPlayerToken(roomId, response.playerToken);
      }
    }).catch((err) => {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      setError(message);
      setIsStarting(false);
      try {
        sessionStorage.setItem('startGameError', JSON.stringify({ roomId, message }));
      } catch {
        // ignore storage errors
      }
    });
  };

  const renderRightContent = () => {
    if (isLoading) {
      return (
        <StartGameFormCard>
          <CreateGameSectionTitle>Room Ready</CreateGameSectionTitle>
          <GameContainer>
            <MutedText style={{ textAlign: 'center' }}>Loading room...</MutedText>
          </GameContainer>
        </StartGameFormCard>
      );
    }

    if (error && !room) {
      return (
        <StartGameFormCard>
          <CreateGameSectionTitle>Room Ready</CreateGameSectionTitle>
          <GameContainer>
            <ErrorText>{error}</ErrorText>
          </GameContainer>
        </StartGameFormCard>
      );
    }

    if (!room) {
      return (
        <StartGameFormCard>
          <CreateGameSectionTitle>Room Ready</CreateGameSectionTitle>
          <GameContainer>
            <MutedText style={{ textAlign: 'center' }}>Loading room...</MutedText>
          </GameContainer>
        </StartGameFormCard>
      );
    }

    return (
      <StartGameFormCard>
        <CreateGameSectionTitle>Room Ready</CreateGameSectionTitle>

        <BigScreenNotice>
          <strong>Keep this screen on!</strong>
          <br />
          This screen will display the questions and the leaderboard. Use your own device to join the game and submit answers.
        </BigScreenNotice>

        <QRCodeContainer>
          {roomUrl && <QRCodeSVG value={roomUrl} size={160} />}
        </QRCodeContainer>

        <Input value={roomUrl} readOnly />

        <ButtonPrimary onClick={handleCopyUrl} style={{ marginBottom: '1.5rem' }}>
          Copy URL
        </ButtonPrimary>

        {error && <ErrorText style={{ marginBottom: '1rem' }}>{error}</ErrorText>}

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
      </StartGameFormCard>
    );
  };

  return (
    <>
      <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
      <BigScreenContainer>
        <BigScreenLayout>
          <CreateGameLeftSection>
            <BigScreenGameTitle>
              <GameTitleImage src="/assets/game_title.svg" alt="Wildcard Trivia" />
            </BigScreenGameTitle>

            <CreateGameWelcomeCard>
              <TriviCommentaryCharacterContainer>
                <img src="/assets/Trivi_big_smile.svg" alt="Trivi character" />
              </TriviCommentaryCharacterContainer>
              <TriviCommentaryTextContainer>
                {room?.collectedTopics && room.collectedTopics.length > 0 ? (
                  <div style={{ textAlign: 'left', width: '100%' }}>
                    <TriviCommentaryTitle>
                      Topics submitted ({room.collectedTopics.length})
                    </TriviCommentaryTitle>
                    <TopicsContainer style={{ marginTop: '0.5rem', justifyContent: 'flex-start' }}>
                      {room.collectedTopics.map((topic, index) => (
                        <TopicBadge key={index}>{topic}</TopicBadge>
                      ))}
                    </TopicsContainer>
                  </div>
                ) : (
                  <>
                    <TriviCommentaryTitle>Share the link!</TriviCommentaryTitle>
                    <TriviCommentaryBody>
                      Players can join using the link. When everyone&apos;s in, hit Start.
                      <br />
                      <br />
                      <strong>Recommended for 2-5 players</strong>
                    </TriviCommentaryBody>
                  </>
                )}
              </TriviCommentaryTextContainer>
            </CreateGameWelcomeCard>

            <BigScreenLeaderboardCard>
              <PlayerListTitle>Players</PlayerListTitle>
              <PlayerListContainer>
                {room && room.players.length > 0 ? (
                  room.players.map((player, index) => {
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
            </BigScreenLeaderboardCard>
          </CreateGameLeftSection>

          <BigScreenRightContainer>
            {renderRightContent()}
          </BigScreenRightContainer>
        </BigScreenLayout>
      </BigScreenContainer>
    </>
  );
}
