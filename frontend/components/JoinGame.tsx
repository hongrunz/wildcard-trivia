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

    if (!roomId) {
      setError('Room ID is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.joinRoom(roomId, guestName.trim(), topic.trim() || undefined);

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
      <FormCard>
        <Title>Ultimate Trivia!</Title>
        
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
            <Label htmlFor="topic">Topic Suggestion (optional):</Label>
            <Input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Suggest a topic for questions"
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
            disabled={!guestName.trim() || !roomId || isLoading}
          >
            {isLoading ? 'Joining...' : 'Join'}
          </ButtonLarge>
        </ButtonContainerCenter>
      </FormCard>
    </PageContainer>
  );
}

