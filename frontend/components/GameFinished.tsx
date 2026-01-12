'use client';

import {
  GameScreenContainer,
  GameCard,
  GameHeader,
  CircularBadge,
  GameTitle,
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

interface GameFinishedProps {
  totalQuestions: number;
  finalScore?: number;
  leaderboard: LeaderboardEntry[];
}

export default function GameFinished({
  totalQuestions,
  finalScore,
  leaderboard,
}: GameFinishedProps) {
  return (
    <GameScreenContainer>
      <GameCard>
        <GameHeader>
          <CircularBadge>{totalQuestions}/{totalQuestions}</CircularBadge>
          {finalScore !== undefined && <CircularBadge>{finalScore}</CircularBadge>}
        </GameHeader>
        <GameTitle>Ultimate Trivia!</GameTitle>
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
