'use client';

import { useState, useEffect } from 'react';
import {
  GameScreenContainer,
  GameCard,
  GameHeader,
  CircularBadge,
  GameTitle,
  QuestionText,
} from './styled/GameComponents';
import { OptionsContainer, OptionButton } from './styled/OptionsContainer';

interface QuestionScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  timer?: number;
  question: string;
  options: string[];
  onSubmit: (answer: string) => void;
}

export default function QuestionScreen({
  currentQuestion,
  totalQuestions,
  timer,
  question,
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

  return (
    <GameScreenContainer>
      <GameCard>
        <GameHeader>
          <CircularBadge>{currentQuestion}/{totalQuestions}</CircularBadge>
          {mounted && timer !== undefined && <CircularBadge>{timer}</CircularBadge>}
        </GameHeader>
        <GameTitle>Ultimate Trivia!</GameTitle>
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
