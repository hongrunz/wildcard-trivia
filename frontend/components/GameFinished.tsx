'use client';

import { useRouter } from 'next/navigation';
import PlayerHeader from './PlayerHeader';
import {
  GameScreenContainer,
  GameScreenContent,
  GameCard,
  GameTitle,
  LeaderboardSection,
  LeaderboardHeading,
  LeaderboardList,
  LeaderboardItem,
  TopicBadge,
} from './styled/GameComponents';
import { ButtonLarge, ButtonContainerCenter } from './styled/FormComponents';

interface LeaderboardEntry {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
  topicScore?: { [topic: string]: number };
}

interface GameFinishedProps {
  totalQuestions: number;
  finalScore?: number;
  leaderboard: LeaderboardEntry[];
}

export default function GameFinished({
  leaderboard,
}: GameFinishedProps) {
  const router = useRouter();

  const handleNewGame = () => {
    router.push('/');
  };

  // Mock awards for each participant
  const getAward = (rank: number, index: number): string => {
    const awards = [
      '🏆 Champion',
      '🥈 Runner-up',
      '🥉 Third Place',
      '🌟 Rising Star',
      '💪 Most Improved',
      '🎯 Sharpshooter',
      '⚡ Speed Demon',
      '🧠 Brainiac',
      '🎨 Creative Thinker',
      '🚀 Quick Learner',
      '💎 Diamond Player',
      '⭐ Superstar',
      '🎪 Entertainer',
      '🔥 Fire Starter',
      '🌙 Night Owl',
    ];
    
    // Use rank-based awards for top 3, then cycle through others
    if (rank === 1) return awards[0];
    if (rank === 2) return awards[1];
    if (rank === 3) return awards[2];
    
    // For others, use index to cycle through remaining awards
    return awards[3 + ((index - 3) % (awards.length - 3))];
  };

  return (
    <GameScreenContainer>
      <PlayerHeader />
      <GameScreenContent>
      <GameCard>
        <GameTitle>Game Finished! 🎉</GameTitle>
        <LeaderboardSection>
          <LeaderboardHeading>Leader board:</LeaderboardHeading>
          <LeaderboardList>
            {leaderboard.map((entry, index) => (
              <LeaderboardItem key={entry.playerId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    No{entry.rank} {entry.playerName} ... {entry.points} pts
                  </div>
                  <TopicBadge style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.75rem',
                    backgroundColor: entry.rank <= 3 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    borderColor: entry.rank <= 3 ? 'rgba(255, 215, 0, 0.5)' : 'rgba(59, 130, 246, 0.3)',
                    fontWeight: 600,
                  }}>
                    {getAward(entry.rank, index)}
                  </TopicBadge>
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
        <ButtonContainerCenter>
          <ButtonLarge onClick={handleNewGame}>New Game</ButtonLarge>
        </ButtonContainerCenter>
      </GameCard>
      </GameScreenContent>
    </GameScreenContainer>
  );
}
