'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageContainer,
  FormCard,
  FormGroup,
  FieldContainer,
  Label,
  Input,
  ButtonPrimary,
  ButtonContainer,
} from './styled/FormComponents';
import { ErrorText } from './styled/ErrorComponents';
import { InfoBox } from './styled/InfoComponents';
import { GameTitleImage } from './styled/GameComponents';
import { api, tokenStorage } from '../lib/api';
import { getSessionMode, getDeviceType } from '../lib/deviceDetection';

const DEFAULT_NUM_QUESTIONS = 3;
const DEFAULT_TIME_LIMIT = 8;
const DEFAULT_NUM_ROUNDS = 3;

export default function CreateGame() {
  const router = useRouter();
  const [hostName, setHostName] = useState('');
  const [numQuestions, setNumQuestions] = useState(DEFAULT_NUM_QUESTIONS);
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [sessionMode, setSessionMode] = useState<'player' | 'display'>('player');
  const [deviceType, setDeviceType] = useState<'mobile' | 'web'>('web');
  const [isMounted, setIsMounted] = useState(false);
  const [numRounds, setNumRounds] = useState(DEFAULT_NUM_ROUNDS);

  // Detect device type and session mode after mount to avoid hydration mismatch
  useEffect(() => {
    // Batch updates to minimize re-renders
    const mode = getSessionMode();
    const device = getDeviceType();
    
    setSessionMode(mode);
    setDeviceType(device);
    setIsMounted(true);
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
        topics: deviceType === 'mobile' ? [topic] : [], // Topics will be collected from players
        questionsPerRound: numQuestions,
        timePerQuestion: timeLimit,
        sessionMode: sessionMode, // Pass session mode to backend
        numRounds: numRounds,
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
      <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
      <FormCard>
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

          {deviceType === 'mobile' && (
            <FieldContainer>
              <Label htmlFor="topic">Topic Suggestion:</Label>
              <Input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic for questions"
              />
            </FieldContainer>
          )}

          <FieldContainer>
            <Label htmlFor="numRounds">Number of rounds:</Label>
            <Input
              id="numRounds"
              type="number"
              value={numRounds}
              onChange={(e) => setNumRounds(parseInt(e.target.value) || DEFAULT_NUM_ROUNDS)}
              min="1"
            />
          </FieldContainer>

          <FieldContainer>
            <Label htmlFor="numQuestions">Number of questions to be asked each round:</Label>
            <Input
              id="numQuestions"
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || DEFAULT_NUM_QUESTIONS)}
              min="1"
            />
          </FieldContainer>

          <FieldContainer>
            <Label htmlFor="timeLimit">Time limit per question (in seconds):</Label>
            <Input
              id="timeLimit"
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value) || DEFAULT_TIME_LIMIT)}
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

