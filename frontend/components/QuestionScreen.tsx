'use client';

import { useState, useEffect } from 'react';
import {
  GameScreenContainer,
  GameCard,
  GameHeader,
  CircularBadge,
  GameTitle,
  QuestionText,
  TopicsContainer,
  TopicBadge,
} from './styled/GameComponents';
import { OptionsContainer, OptionButton } from './styled/OptionsContainer';
import { MutedText } from './styled/StatusComponents';

interface QuestionScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  timer?: number;
  question: string;
  topics?: string[];
  options: string[];
  onSubmit: (answer: string) => void;
}

export default function QuestionScreen({
  currentQuestion,
  totalQuestions,
  timer,
  question,
  topics,
  options,
  onSubmit,
}: QuestionScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Set mounted to true after component mounts to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    onSubmit(option);
  };

  // Ensure options has a default value
  const safeOptions = options || [];
  const safeTopics = topics || [];

  return (
    <GameScreenContainer>
      <GameCard>
        <GameHeader>
          <CircularBadge>{currentQuestion}/{totalQuestions}</CircularBadge>
          {mounted && timer !== undefined && <CircularBadge>{timer}</CircularBadge>}
        </GameHeader>
        <GameTitle>Wildcard Trivia!</GameTitle>
        
        {/* Display topics */}
        {safeTopics.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <MutedText style={{ fontSize: '0.75rem', marginBottom: '0.25rem', textAlign: 'center' }}>
              Topics:
            </MutedText>
            <TopicsContainer>
              {safeTopics.map((topic, index) => (
                <TopicBadge key={index} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                  {topic}
                </TopicBadge>
              ))}
            </TopicsContainer>
          </div>
        )}
        
        <QuestionText>{question}</QuestionText>
        {safeOptions.length > 0 && (
          <OptionsContainer>
            {safeOptions.map((option, index) => (
              <OptionButton
                key={index}
                onClick={() => handleOptionClick(option)}
                disabled={selectedOption !== null}
              >
                {option}
              </OptionButton>
            ))}
          </OptionsContainer>
        )}
      </GameCard>
    </GameScreenContainer>
  );
}
