'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FormCard,
  FormGroup,
  FieldContainer,
  Label,
  Input,
  ButtonLarge,
  ButtonContainerCenter,
} from './styled/FormComponents';
import { ErrorText } from './styled/ErrorComponents';
import PlayerHeader from './PlayerHeader';
import { PlayerPageContainer, PlayerPageContent, TopicsSection, TopicsContainer, TopicBadge } from './styled/GameComponents';
import { MutedText } from './styled/StatusComponents';
import { api, tokenStorage, type RoomResponse } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';

export default function JoinGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || '';
  const [guestName, setGuestName] = useState('');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [isRoomLoading, setIsRoomLoading] = useState(false);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    setIsRoomLoading(true);
    try {
      const roomData = await api.getRoom(roomId);
      setRoom(roomData);
    } catch {
      // Non-blocking: joining can still work even if we can't fetch room details.
      setRoom(null);
    } finally {
      setIsRoomLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void fetchRoom();
  }, [fetchRoom]);

  const handleWebSocketMessage = useCallback((message: { type: string }) => {
    if (message.type === 'player_joined' || message.type === 'topic_submitted') {
      void fetchRoom();
    }
  }, [fetchRoom]);

  useWebSocket(roomId, {
    onMessage: handleWebSocketMessage,
  });

  const handleJoin = async () => {
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (!roomId) {
      setError('Room ID is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.joinRoom(roomId, guestName.trim(), topic.trim());

      // Store player token
      tokenStorage.setPlayerToken(roomId, response.playerToken);

      // Navigate to game view
      router.push(`/game/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <PlayerPageContainer>
      <PlayerHeader />
      <PlayerPageContent>
      <FormCard>
        {roomId && (
          <TopicsSection style={{ marginBottom: '1.5rem' }}>
            <MutedText style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
              {isRoomLoading ? 'Loading topics…' : `Topics so far (${room?.collectedTopics?.length ?? 0})`}
            </MutedText>
            {room?.collectedTopics && room.collectedTopics.length > 0 ? (
              <TopicsContainer>
                {room.collectedTopics.map((t) => (
                  <TopicBadge key={t}>
                    {t}
                  </TopicBadge>
                ))}
              </TopicsContainer>
            ) : (
              <MutedText style={{ textAlign: 'center' }}>
                No topics yet — be the first!
              </MutedText>
            )}
          </TopicsSection>
        )}

        <FormGroup>
          <FieldContainer>
            <Label htmlFor="guestName">Your Name:</Label>
            <Input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoin();
                }
              }}
            />
          </FieldContainer>

          <FieldContainer>
            <Label htmlFor="topic">Topic Suggestion:</Label>
            <Input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic for questions"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoin();
                }
              }}
            />
          </FieldContainer>
        </FormGroup>

        {error && <ErrorText>{error}</ErrorText>}

        {!roomId && <ErrorText>No room ID provided. Please use a valid room link.</ErrorText>}

        <ButtonContainerCenter>
          <ButtonLarge
            onClick={handleJoin}
            disabled={!guestName.trim() || !topic.trim() || !roomId || isLoading}
          >
            {isLoading ? 'Joining...' : 'Join'}
          </ButtonLarge>
        </ButtonContainerCenter>
      </FormCard>
      </PlayerPageContent>
    </PlayerPageContainer>
  );
}

