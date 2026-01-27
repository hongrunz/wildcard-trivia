'use client';

import {
  GameScreenContainer,
  GameCard,
  GameTitle,
  LeaderboardSection,
  LeaderboardHeading,
  LeaderboardList,
  LeaderboardItem,
  TopicBadge,
  GameTitleImage,
} from './styled/GameComponents';
import { MutedText } from './styled/StatusComponents';

interface LeaderboardEntry {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
  topicScore?: { [topic: string]: number };
}

interface RoundFinishedProps {
  currentRound: number;
  totalRounds: number;
  leaderboard: LeaderboardEntry[];
  timer?: number;
}

export default function RoundFinished({
  currentRound,
  totalRounds,
  leaderboard,
  timer,
}: RoundFinishedProps) {
  // Get top 3 players for highlighting
  const topThree = leaderboard.slice(0, 3);
  const isTopThree = (playerId: string) => 
    topThree.some(entry => entry.playerId === playerId);

  return (
    <GameScreenContainer>
      <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
      <GameCard>
        <GameTitle>Round {currentRound} Complete! 🎊</GameTitle>
        
        <MutedText style={{ fontSize: '1.2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          {currentRound < totalRounds 
            ? `Get ready for Round ${currentRound + 1}...`
            : 'Final round complete! Calculating results...'}
        </MutedText>

        {timer !== undefined && currentRound < totalRounds && (
          <div style={{ 
            textAlign: 'center', 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0)'
          }}>
            Next round starts in: {timer}s
          </div>
        )}

        <LeaderboardSection>
          <LeaderboardHeading>Current Standings:</LeaderboardHeading>
          <LeaderboardList>
            {leaderboard.map((entry) => (
              <LeaderboardItem 
                key={entry.playerId}
                style={{
                  backgroundColor: isTopThree(entry.playerId) 
                    ? 'rgba(255, 215, 0, 0.15)' 
                    : undefined,
                  border: isTopThree(entry.playerId) 
                    ? '2px solid rgba(255, 215, 0, 0.5)' 
                    : undefined,
                }}
              >
                <div>
                  <span style={{ 
                    fontSize: entry.rank <= 3 ? '1.1rem' : '1rem',
                    fontWeight: entry.rank <= 3 ? 'bold' : 'normal'
                  }}>
                    {entry.rank === 1 && '🥇 '}
                    {entry.rank === 2 && '🥈 '}
                    {entry.rank === 3 && '🥉 '}
                    {entry.rank > 3 && `No${entry.rank} `}
                    {entry.playerName}
                  </span>
                  <span style={{ 
                    fontSize: entry.rank <= 3 ? '1.1rem' : '1rem',
                    fontWeight: entry.rank <= 3 ? 'bold' : 'normal'
                  }}>
                    ... {entry.points} pts
                  </span>
                </div>
                {entry.topicScore && Object.keys(entry.topicScore).length > 0 && (
                  <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {Object.entries(entry.topicScore).map(([topic, score]) => (
                      <TopicBadge key={topic} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                        {topic}: {score}
                      </TopicBadge>
                    ))}
                  </div>
                )}
              </LeaderboardItem>
            ))}
          </LeaderboardList>
        </LeaderboardSection>

        <MutedText style={{ fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem' }}>
          {currentRound < totalRounds 
            ? 'Stay focused! The next round is about to begin...'
            : 'Preparing final results...'}
        </MutedText>
      </GameCard>
    </GameScreenContainer>
  );
}
