'use client';

import { useState } from 'react';
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
import { api, tokenStorage } from '../lib/api';

export default function CreateGame() {
  const router = useRouter();
  const [hostName, setHostName] = useState('');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!hostName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Split topics by comma and trim each
      const topics = topic.split(',').map(t => t.trim()).filter(t => t.length > 0);

      const response = await api.createRoom({
        name: hostName.trim(),
        topics: topics.length > 0 ? topics : [topic.trim()],
        questionsPerRound: numQuestions,
        timePerQuestion: timeLimit,
      });

      // Store host token
      tokenStorage.setHostToken(response.roomId, response.hostToken);

      // Navigate to host start page
      router.push(`/host/${response.roomId}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err instanceof Error ? err.message : 'Failed to create room. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <FormCard>
        <Title>Ultimate Trivia!</Title>
        
        <FormGroup>
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

          <FieldContainer>
            <Label htmlFor="topic">Topic(s):</Label>
            <Input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter topic(s), separated by commas"
            />
          </FieldContainer>

          <FieldContainer>
            <Label htmlFor="numQuestions">Number of questions to be asked:</Label>
            <Input
              id="numQuestions"
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || 10)}
              min="1"
            />
          </FieldContainer>

          <FieldContainer>
            <Label htmlFor="timeLimit">Time limit per question (in seconds):</Label>
            <Input
              id="timeLimit"
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
              placeholder="e.g., 30 seconds"
            />
          </FieldContainer>

        </FormGroup>

        {error && (
          <div style={{ color: '#dc2626', marginTop: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        
        <ButtonContainer>
          <ButtonPrimary
            onClick={handleCreateRoom}
            disabled={!hostName.trim() || !topic.trim() || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </ButtonPrimary>
        </ButtonContainer>
      </FormCard>
    </PageContainer>
  );
}

