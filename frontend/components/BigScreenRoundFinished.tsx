'use client';

import {
  GameScreenContainer,
  GameTitle,
  LeaderboardList,
  TopicBadge,
  GameTitleImage,
} from './styled/GameComponents';
import {
  BigScreenCard,
  BigScreenHeader,
  BigScreenBadge,
  BigScreenLeaderboardSection,
  BigScreenLeaderboardHeading,
  BigScreenLeaderboardItem,
} from './styled/BigScreenComponents';
import { MutedText } from './styled/StatusComponents';

interface LeaderboardEntry {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
  topicScore?: { [topic: string]: number };
}

interface BigScreenRoundFinishedProps {
  currentRound: number;
  totalRounds: number;
  leaderboard: LeaderboardEntry[];
  timer?: number;
}

export default function BigScreenRoundFinished({
  currentRound,
  totalRounds,
  leaderboard,
  timer,
}: BigScreenRoundFinishedProps) {
  // Get top 3 players for highlighting
  const topThree = leaderboard.slice(0, 3);
  const isTopThree = (playerId: string) => 
    topThree.some(entry => entry.playerId === playerId);

  return (
    <GameScreenContainer>
      <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
      <BigScreenCard>
        {/* Header with round info and timer */}
        <BigScreenHeader>
          <BigScreenBadge>
            Round {currentRound}/{totalRounds}
          </BigScreenBadge>
          {timer !== undefined && (
            <BigScreenBadge>
              Next: {timer}s
            </BigScreenBadge>
          )}
        </BigScreenHeader>

        {/* Title */}
        <GameTitle>Round {currentRound} Complete! 🎊</GameTitle>

        <MutedText style={{ 
          fontSize: '1.5rem', 
          textAlign: 'center', 
          marginBottom: '2rem',
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
          {currentRound < totalRounds 
            ? `Get ready for Round ${currentRound + 1}...`
            : 'Final round complete! Calculating results...'}
        </MutedText>

        {/* Leaderboard */}
        <BigScreenLeaderboardSection>
          <BigScreenLeaderboardHeading>Current Standings:</BigScreenLeaderboardHeading>
          <LeaderboardList>
            {leaderboard.slice(0, 10).map((entry) => (
              <BigScreenLeaderboardItem 
                key={entry.playerId}
                style={{
                  backgroundColor: isTopThree(entry.playerId) 
                    ? 'rgba(255, 215, 0, 0.2)' 
                    : undefined,
                  border: isTopThree(entry.playerId) 
                    ? '3px solid rgba(255, 215, 0, 0.6)' 
                    : undefined,
                  transform: isTopThree(entry.playerId) 
                    ? 'scale(1.02)' 
                    : undefined,
                  transition: 'all 0.3s ease',
                }}
              >
                <div>
                  <span style={{ 
                    fontSize: entry.rank <= 3 ? '1.5rem' : '1.25rem',
                    fontWeight: entry.rank <= 3 ? 'bold' : 'normal'
                  }}>
                    {entry.rank === 1 && '🥇 '}
                    {entry.rank === 2 && '🥈 '}
                    {entry.rank === 3 && '🥉 '}
                    #{entry.rank} {entry.playerName}
                  </span>
                  <span style={{ 
                    fontSize: entry.rank <= 3 ? '1.5rem' : '1.25rem',
                    fontWeight: entry.rank <= 3 ? 'bold' : 'normal'
                  }}>
                    ... {entry.points} pts
                  </span>
                </div>
                {entry.topicScore && Object.keys(entry.topicScore).length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {Object.entries(entry.topicScore).map(([topic, score]) => (
                      <TopicBadge key={topic} style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem' }}>
                        {topic}: {score}
                      </TopicBadge>
                    ))}
                  </div>
                )}
              </BigScreenLeaderboardItem>
            ))}
          </LeaderboardList>
        </BigScreenLeaderboardSection>

        <MutedText style={{ 
          fontSize: '1.2rem', 
          textAlign: 'center', 
          marginTop: '1.5rem',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          {currentRound < totalRounds 
            ? 'Stay focused! The next round is about to begin...'
            : 'Preparing final results...'}
        </MutedText>
      </BigScreenCard>
    </GameScreenContainer>
  );
}
