'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  PageContainer,
  FormCard,
  Title,
  FormGroup,
  FieldContainer,
  Label,
  Input,
  ButtonLarge,
  ButtonContainerCenter,
} from './styled/FormComponents';
import { ErrorText } from './styled/ErrorComponents';
import { GameTitleImage } from './styled/GameComponents';
import { api, tokenStorage } from '../lib/api';

export default function JoinGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || '';
  const [guestName, setGuestName] = useState('');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    <PageContainer>
      <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
      <FormCard>
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
    </PageContainer>
  );
}

