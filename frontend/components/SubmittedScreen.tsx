'use client';

import { Text } from './styled/FormComponents';
import {
  GameScreenContainer,
  GameCard,
  GameHeader,
  CircularBadge,
  FeedbackMessage,
  AnswerInput,
  LeaderboardSection,
  LeaderboardHeading,
  LeaderboardList,
  LeaderboardItem,
  GameTitleImage,
} from './styled/GameComponents';

interface LeaderboardEntry {
  playerId: string;
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
      <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
      <GameCard>
        <GameHeader>
          <CircularBadge>{currentQuestion}/{totalQuestions}</CircularBadge>
          {timer !== undefined && <CircularBadge>{timer}</CircularBadge>}
        </GameHeader>
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
              <LeaderboardItem key={entry.playerId}>
                No{entry.rank} {entry.playerName} ... {entry.points} pts,
              </LeaderboardItem>
            ))}
          </LeaderboardList>
        </LeaderboardSection>
      </GameCard>
    </GameScreenContainer>
  );
}
