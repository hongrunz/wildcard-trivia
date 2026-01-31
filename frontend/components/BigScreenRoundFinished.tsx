'use client';

import {
  GameTitleImage,
  PlayerListTitle,
  PlayerListItem,
  PlayerListItemAvatar,
  PlayerListItemName,
  PlayerListContainer,
} from './styled/GameComponents';
import {
  BigScreenContainer,
  BigScreenLayout,
  GamePlayStatus,
  BigScreenRightContainer,
  BigScreenGameTitle,
  BigScreenQuestionText,
  BigScreenQuestionCard,
  TriviCommentaryCard,
  TriviCommentaryCharacterContainer,
  TriviCommentaryTextContainer,
  TriviCommentaryTitle,
  TriviCommentaryBody,
  BigScreenLeaderboardCard,
  LeaderboardScore,
  BigScreenTopBar,
  TimerBadge,
} from './styled/BigScreenComponents';
import { MutedText } from './styled/StatusComponents';

export interface LeaderboardEntryForRound {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
  topicScore?: { [topic: string]: number };
}

interface BigScreenRoundFinishedProps {
  currentRound: number;
  totalRounds: number;
  leaderboard: LeaderboardEntryForRound[];
  timer?: number;
}

export default function BigScreenRoundFinished({
  currentRound,
  totalRounds,
  leaderboard,
  timer,
}: BigScreenRoundFinishedProps) {
  const topThree = leaderboard.slice(0, 3);
  const isTopThree = (playerId: string) =>
    topThree.some((entry) => entry.playerId === playerId);

  return (
    <BigScreenContainer>
      <BigScreenLayout>
        {/* Left Side - Title, Trivi, Leaderboard */}
        <GamePlayStatus>
          <BigScreenGameTitle>
            <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
          </BigScreenGameTitle>

          <TriviCommentaryCard>
            <TriviCommentaryCharacterContainer>
              <img src="/assets/Trivi_big_smile.svg" alt="Trivi character" />
            </TriviCommentaryCharacterContainer>
            <TriviCommentaryTextContainer>
              <TriviCommentaryTitle>Round complete!</TriviCommentaryTitle>
              <TriviCommentaryBody>
                {currentRound < totalRounds
                  ? `Get ready for Round ${currentRound + 1}...`
                  : 'Final round complete! Calculating results...'}
              </TriviCommentaryBody>
            </TriviCommentaryTextContainer>
          </TriviCommentaryCard>

          <BigScreenLeaderboardCard>
            <PlayerListTitle>Leaderboard</PlayerListTitle>
            <PlayerListContainer>
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 10).map((entry, index) => {
                  // Assign unique avatars by position (1–10); wrap only when more than 10 players
                  const avatarCount = 10;
                  const avatarIndex = (index % avatarCount) + 1;
                  const avatarSrc = `/assets/avatars/avatar_${avatarIndex}.svg`;
                  const highlight = isTopThree(entry.playerId);
                  return (
                    <PlayerListItem
                      key={entry.playerId}
                      style={{
                        backgroundColor: highlight ? 'rgba(255, 215, 0, 0.15)' : undefined,
                        border: highlight ? '2px solid rgba(255, 215, 0, 0.6)' : undefined,
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                      }}
                    >
                      <PlayerListItemAvatar $avatarSrc={avatarSrc}>
                        {entry.playerName.charAt(0).toUpperCase()}
                      </PlayerListItemAvatar>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <PlayerListItemName>
                          {entry.rank === 1 && '🥇 '}
                          {entry.rank === 2 && '🥈 '}
                          {entry.rank === 3 && '🥉 '}
                          #{entry.rank} {entry.playerName}
                        </PlayerListItemName>
                        <LeaderboardScore>{entry.points}</LeaderboardScore>
                      </div>
                    </PlayerListItem>
                  );
                })
              ) : (
                <MutedText style={{ textAlign: 'center', padding: '2rem 0' }}>
                  No scores yet
                </MutedText>
              )}
            </PlayerListContainer>
          </BigScreenLeaderboardCard>
        </GamePlayStatus>

        {/* Right Side - Round complete message + timer */}
        <BigScreenRightContainer>
          <BigScreenTopBar>
            <span>Round {currentRound} of {totalRounds}</span>
            {timer !== undefined && (
              <TimerBadge>Next: {timer}s</TimerBadge>
            )}
          </BigScreenTopBar>

          <BigScreenQuestionCard>
            <BigScreenQuestionText style={{ marginBottom: '1.5rem' }}>
              Round {currentRound} Complete! 🎊
            </BigScreenQuestionText>

            <MutedText
              style={{
                fontSize: '1.5rem',
                textAlign: 'center',
                marginBottom: '2rem',
              }}
            >
              {currentRound < totalRounds
                ? `Get ready for Round ${currentRound + 1}...`
                : 'Final round complete! Calculating results...'}
            </MutedText>

            <MutedText
              style={{
                fontSize: '1.2rem',
                textAlign: 'center',
                marginTop: '1.5rem',
              }}
            >
              {currentRound < totalRounds
                ? 'Stay focused! The next round is about to begin...'
                : 'Preparing final results...'}
            </MutedText>
          </BigScreenQuestionCard>
        </BigScreenRightContainer>
      </BigScreenLayout>
    </BigScreenContainer>
  );
}
