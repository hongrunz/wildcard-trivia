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
import { api, tokenStorage } from '../lib/api';

export default function JoinGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || '';
  const [guestName, setGuestName] = useState('');
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
      const response = await api.joinRoom(roomId, guestName.trim());

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
        </FormGroup>

        {error && (
          <div style={{ color: '#dc2626', marginTop: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!roomId && (
          <div style={{ color: '#dc2626', marginTop: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
            No room ID provided. Please use a valid room link.
          </div>
        )}

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

