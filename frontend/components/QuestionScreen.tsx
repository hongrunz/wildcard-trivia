'use client';

import { useState, useEffect } from 'react';
import PlayerHeader from './PlayerHeader';
import {
  GameScreenContainer,
  GameScreenContent,
  GameCard,
  GameHeader,
  CircularBadge,
  QuestionText,
  GameHeaderRow,
  GameRoundLabel,
  GameTimerBadge,
  PlayerGameCardWrapper,
  GameSubmitButton,
} from './styled/GameComponents';
import { OptionsContainer, OptionButton } from './styled/OptionsContainer';

interface QuestionScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  currentRound?: number;
  numRounds?: number;
  timer?: number;
  question: string;
  topics?: string[];
  options: string[];
  onSubmit: (answer: string) => void;
}

export default function QuestionScreen({
  currentQuestion,
  totalQuestions,
  currentRound = 1,
  numRounds = 1,
  timer,
  question,
  topics,
  options,
  onSubmit,
}: QuestionScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (selectedOption !== null) {
      onSubmit(selectedOption);
    }
  };

  const safeOptions = options || [];

  return (
    <GameScreenContainer>
      <PlayerHeader />
      <GameScreenContent>
        <GameHeaderRow>
          <GameRoundLabel>Round {currentRound} of {numRounds}</GameRoundLabel>
          {mounted && timer !== undefined && (
            <GameTimerBadge>{timer}s</GameTimerBadge>
          )}
        </GameHeaderRow>
        <PlayerGameCardWrapper>
          <GameCard>
            <GameHeader>
              <CircularBadge>Question {currentQuestion}/{totalQuestions}</CircularBadge>
            </GameHeader>
            <QuestionText>{question}</QuestionText>
            {safeOptions.length > 0 && (
              <OptionsContainer>
                {safeOptions.map((option, index) => (
                  <OptionButton
                    key={index}
                    onClick={() => handleOptionClick(option)}
                    disabled={false}
                    $selected={selectedOption === option}
                  >
                    {option}
                  </OptionButton>
                ))}
              </OptionsContainer>
            )}
            <GameSubmitButton
              type="button"
              onClick={handleSubmit}
              disabled={selectedOption === null}
            >
              Submit
            </GameSubmitButton>
          </GameCard>
        </PlayerGameCardWrapper>
      </GameScreenContent>
    </GameScreenContainer>
  );
}
