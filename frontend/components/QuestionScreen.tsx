'use client';

import { useState } from 'react';
import {
  GameScreenContainer,
  GameCard,
  GameHeader,
  CircularBadge,
  GameTitle,
  QuestionText,
  AnswerInput,
} from './styled/GameComponents';
import { ButtonLarge, ButtonContainerCenter } from './styled/FormComponents';

interface QuestionScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  timer?: number;
  question: string;
  onSubmit: (answer: string) => void;
}

export default function QuestionScreen({
  currentQuestion,
  totalQuestions,
  timer,
  question,
  onSubmit,
}: QuestionScreenProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <GameScreenContainer>
      <GameCard>
        <GameHeader>
          <CircularBadge>{currentQuestion}/{totalQuestions}</CircularBadge>
          {timer !== undefined && <CircularBadge>{timer}</CircularBadge>}
        </GameHeader>
        <GameTitle>Ultimate Trivia!</GameTitle>
        <QuestionText>{question}</QuestionText>
        <AnswerInput
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter your answer"
          autoFocus
        />
        <ButtonContainerCenter>
          <ButtonLarge onClick={handleSubmit}>Submit</ButtonLarge>
        </ButtonContainerCenter>
      </GameCard>
    </GameScreenContainer>
  );
}
