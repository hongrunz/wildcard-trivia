'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
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
import PlayerHeader from './PlayerHeader';
import { PlayerPageContainer, PlayerPageContent } from './styled/GameComponents';
import { api, tokenStorage } from '../lib/api';
import { getSessionMode, getDeviceType } from '../lib/deviceDetection';

const DEFAULT_NUM_QUESTIONS = 3;
const DEFAULT_TIME_LIMIT = 10;
const DEFAULT_NUM_ROUNDS = 3;

export default function CreateGame() {
  const router = useRouter();
  const [hostName, setHostName] = useState('');
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_NUM_QUESTIONS));
  const [timeLimit, setTimeLimit] = useState(String(DEFAULT_TIME_LIMIT));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [sessionMode, setSessionMode] = useState<'player' | 'display'>('player');
  const [deviceType, setDeviceType] = useState<'mobile' | 'web'>('web');
  const [isMounted, setIsMounted] = useState(false);
  const [numRounds, setNumRounds] = useState(String(DEFAULT_NUM_ROUNDS));

  // Detect device type and session mode after mount to avoid hydration mismatch
  useEffect(() => {
    // Batch updates to minimize re-renders
    const mode = getSessionMode();
    const device = getDeviceType();
    
    setSessionMode(mode);
    setDeviceType(device);
    setIsMounted(true);
  }, []);

  const parsedNumRounds = numRounds === '' ? NaN : parseInt(numRounds, 10);
  const parsedNumQuestions = numQuestions === '' ? NaN : parseInt(numQuestions, 10);
  const parsedTimeLimit = timeLimit === '' ? NaN : parseInt(timeLimit, 10);

  const isNumRoundsValid = !Number.isNaN(parsedNumRounds) && parsedNumRounds >= 1;
  const isNumQuestionsValid = !Number.isNaN(parsedNumQuestions) && parsedNumQuestions >= 1;
  const isTimeLimitValid = !Number.isNaN(parsedTimeLimit) && parsedTimeLimit >= 1;

  const isFormValid =
    (sessionMode !== 'player' || !!hostName.trim()) &&
    isNumRoundsValid &&
    isNumQuestionsValid &&
    isTimeLimitValid;

  const handleCreateRoom = async () => {
    if (sessionMode === 'player' && !hostName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!isNumRoundsValid || !isNumQuestionsValid || !isTimeLimitValid) {
      setError('Please fill in all numeric fields with valid values (rounds and questions ≥ 1, time limit ≥ 1).');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.createRoom({
        name: hostName.trim() || 'Host',
        topics: deviceType === 'mobile' ? [topic] : [],
        questionsPerRound: parsedNumQuestions,
        timePerQuestion: parsedTimeLimit,
        sessionMode: sessionMode,
        numRounds: parsedNumRounds,
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
    <PlayerPageContainer>
      <PlayerHeader />
      <PlayerPageContent>
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
              min={1}
              onChange={(e) => setNumRounds(e.target.value)}
              placeholder="e.g., 3"
            />
          </FieldContainer>

          <FieldContainer>
            <Label htmlFor="numQuestions">Number of questions to be asked each round:</Label>
            <Input
              id="numQuestions"
              type="number"
              value={numQuestions}
              min={1}
              onChange={(e) => setNumQuestions(e.target.value)}
              placeholder="e.g., 3"
            />
          </FieldContainer>

          <FieldContainer>
            <Label htmlFor="timeLimit">Time limit per question (in seconds):</Label>
            <Input
              id="timeLimit"
              type="number"
              value={timeLimit}
              min={1}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="e.g., 20"
            />
          </FieldContainer>

        </FormGroup>

        {error && <ErrorText>{error}</ErrorText>}
        
        <ButtonContainer>
          <ButtonPrimary
            onClick={handleCreateRoom}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </ButtonPrimary>
        </ButtonContainer>
      </FormCard>
      </PlayerPageContent>
    </PlayerPageContainer>
  );
}

