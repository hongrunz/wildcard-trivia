'use client';

import { useState } from 'react';
import PlayerHeader from './PlayerHeader';
import {
  GameScreenContainer,
  GameScreenContent,
  GameCard,
  GameTitle,
  TopicsSection,
  TopicsContainer,
  TopicBadge,
} from './styled/GameComponents';
import { MutedText } from './styled/StatusComponents';
import { Input } from './styled/FormComponents';
import { ButtonPrimary } from './styled/FormComponents';

interface NewRoundTopicSubmissionProps {
  currentRound: number;
  totalRounds: number;
  onSubmitTopic: (topic: string) => Promise<void>;
  collectedTopics?: string[];
}

export default function NewRoundTopicSubmission({
  currentRound,
  totalRounds,
  onSubmitTopic,
  collectedTopics = [],
}: NewRoundTopicSubmissionProps) {
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitTopic(topic.trim());
      setHasSubmitted(true);
    } catch (error) {
      console.error('Failed to submit topic:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GameScreenContainer>
      <PlayerHeader />
      <GameScreenContent>
        <GameTitle>Round {currentRound} of {totalRounds}</GameTitle>
      <GameCard>
        
        
        <MutedText style={{ fontSize: '1.2rem', textAlign: 'center', marginBottom: '2rem' }}>
          Submit a new topic for the next round!
        </MutedText>

        {collectedTopics.length > 0 && (
          <TopicsSection style={{ marginBottom: '1.5rem' }}>
            <MutedText style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
              Topics submitted so far ({collectedTopics.length})
            </MutedText>
            <TopicsContainer>
              {collectedTopics.map((t) => (
                <TopicBadge key={t}>
                  {t}
                </TopicBadge>
              ))}
            </TopicsContainer>
          </TopicsSection>
        )}

        {!hasSubmitted ? (
          <form onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="Enter a topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isSubmitting}
              maxLength={50}
              autoFocus
            />
            
            <MutedText style={{ fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0 1.5rem' }}>
              Choose something fun and challenging!
            </MutedText>

            <ButtonPrimary 
              type="submit" 
              disabled={!topic.trim() || isSubmitting}
              style={{ width: '100%' }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Topic'}
            </ButtonPrimary>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem' 
            }}>
              ✅
            </div>
            <GameTitle style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Topic Submitted!
            </GameTitle>
            <MutedText style={{ fontSize: '1rem' }}>
              Waiting for other players...
            </MutedText>
          </div>
        )}
      </GameCard>
      </GameScreenContent>
    </GameScreenContainer>
  );
}
