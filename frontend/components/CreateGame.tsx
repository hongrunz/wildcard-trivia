'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageContainer,
  FormCard,
  Title,
  FormGroup,
  FieldContainer,
  Label,
  Input,
  ButtonPrimary,
  ButtonContainer,
} from './styled/FormComponents';
import { ErrorText } from './styled/ErrorComponents';
import { InfoBox } from './styled/InfoComponents';
import { api, tokenStorage } from '../lib/api';
import { getSessionMode, getDeviceType } from '../lib/deviceDetection';

const DEFAULT_NUM_QUESTIONS = 5;
const DEFAULT_TIME_LIMIT = 20;

export default function CreateGame() {
  const router = useRouter();
  const [hostName, setHostName] = useState('');
  const [numQuestions, setNumQuestions] = useState(DEFAULT_NUM_QUESTIONS);
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionMode, setSessionMode] = useState<'player' | 'display'>('player');
  const [deviceType, setDeviceType] = useState<'mobile' | 'web'>('web');

  // Detect device type on mount
  useEffect(() => {
    const mode = getSessionMode();
    const device = getDeviceType();
    setSessionMode(mode);
    setDeviceType(device);
  }, []);

  const handleCreateRoom = async () => {
    // For display mode (web), host name is optional - it's just a label
    // For player mode (mobile), host name is required since they'll be playing
    if (sessionMode === 'player' && !hostName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.createRoom({
        name: hostName.trim() || 'Host', // Default name for display mode
        topics: [], // Topics will be collected from players
        questionsPerRound: numQuestions,
        timePerQuestion: timeLimit,
        sessionMode: sessionMode, // Pass session mode to backend
      });

      // Store host token
      tokenStorage.setHostToken(response.roomId, response.hostToken);

      // Navigate to host start page
      router.push(`/host/${response.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <FormCard>
        <Title>Ultimate Trivia!</Title>
        
        {/* Show device mode info */}
        <InfoBox $variant={deviceType}>
          {deviceType === 'web' ? (
            <>
              🖥️ <strong>Big Screen Mode:</strong> This device will display questions and leaderboard. 
              You&apos;ll need to join as a player on another device to answer questions.
            </>
          ) : (
            <>
              📱 <strong>Mobile Mode:</strong> You&apos;ll answer questions from this device.
            </>
          )}
        </InfoBox>
        
        <FormGroup>
          {sessionMode === 'player' && (
            <FieldContainer>
              <Label htmlFor="hostName">Your Name:</Label>
              <Input
                id="hostName"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Enter your name"
              />
            </FieldContainer>
          )}

          <FieldContainer>
            <Label htmlFor="numQuestions">Number of questions to be asked:</Label>
            <Input
              id="numQuestions"
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
              min="1"
            />
          </FieldContainer>

          <FieldContainer>
            <Label htmlFor="timeLimit">Time limit per question (in seconds):</Label>
            <Input
              id="timeLimit"
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value) || 20)}
              placeholder="e.g., 20 seconds"
            />
          </FieldContainer>

        </FormGroup>

        {error && <ErrorText>{error}</ErrorText>}
        
        <ButtonContainer>
          <ButtonPrimary
            onClick={handleCreateRoom}
            disabled={(sessionMode === 'player' && !hostName.trim()) || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </ButtonPrimary>
        </ButtonContainer>
      </FormCard>
    </PageContainer>
  );
}

