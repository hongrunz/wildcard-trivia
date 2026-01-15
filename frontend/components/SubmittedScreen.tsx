'use client';

import { Text } from './styled/FormComponents';
import {
  GameScreenContainer,
  GameCard,
  GameHeader,
  CircularBadge,
  GameTitle,
  FeedbackMessage,
  AnswerInput,
  LeaderboardSection,
  LeaderboardHeading,
  LeaderboardList,
  LeaderboardItem,
} from './styled/GameComponents';

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  points: number;
}

interface SubmittedScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  leaderboard: LeaderboardEntry[];
  timer?: number;
}

export default function SubmittedScreen({
  currentQuestion,
  totalQuestions,
  isCorrect,
  correctAnswer,
  explanation,
  leaderboard,
  timer,
}: SubmittedScreenProps) {
  return (
    <GameScreenContainer>
      <GameCard>
        <GameHeader>
          <CircularBadge>{currentQuestion}/{totalQuestions}</CircularBadge>
          {timer !== undefined && <CircularBadge>{timer}</CircularBadge>}
        </GameHeader>
        <GameTitle>Ultimate Trivia!</GameTitle>
        <FeedbackMessage>
          You are {isCorrect ? 'correct' : 'wrong'}!
        </FeedbackMessage>
        <AnswerInput
          type="text"
          value={correctAnswer}
          readOnly
        />
        <Text>Explanation: {explanation}</Text>
        <LeaderboardSection>
          <LeaderboardHeading>Leader board:</LeaderboardHeading>
          <LeaderboardList>
            {leaderboard.map((entry) => (
              <LeaderboardItem key={entry.rank}>
                No{entry.rank} {entry.playerName} ... {entry.points} pts,
              </LeaderboardItem>
            ))}
          </LeaderboardList>
        </LeaderboardSection>
      </GameCard>
    </GameScreenContainer>
  );
}
