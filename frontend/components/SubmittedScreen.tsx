'use client';

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
  submittedAnswer: string;
  leaderboard: LeaderboardEntry[];
}

export default function SubmittedScreen({
  currentQuestion,
  totalQuestions,
  isCorrect,
  submittedAnswer,
  leaderboard,
}: SubmittedScreenProps) {
  return (
    <GameScreenContainer>
      <GameCard>
        <GameHeader>
          <CircularBadge>{currentQuestion}/{totalQuestions}</CircularBadge>
        </GameHeader>
        <GameTitle>Ultimate Trivia!</GameTitle>
        <FeedbackMessage>
          You are {isCorrect ? 'correct' : 'wrong'}!
        </FeedbackMessage>
        <AnswerInput
          type="text"
          value={submittedAnswer}
          readOnly
        />
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
