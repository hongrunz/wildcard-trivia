'use client';

import {
  GameTitleImage,
  TopicsContainer,
  TopicBadge,
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
  BigScreenTopBar,
  BigScreenQuestionText,
  BigScreenQuestionCard,
  BigScreenBodyText,
  TriviCommentaryCard,
  TriviCommentaryCharacterContainer,
  TriviCommentaryTextContainer,
  TriviCommentaryTitle,
  TriviCommentaryBody,
  BigScreenLeaderboardCard,
  LeaderboardScore,
} from './styled/BigScreenComponents';
import { MutedText } from './styled/StatusComponents';

export interface LeaderboardEntryForRound {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
}

interface BigScreenNewRoundProps {
  currentRound: number;
  totalRounds: number;
  submittedCount: number;
  totalPlayers: number;
  collectedTopics?: string[];
  leaderboard?: LeaderboardEntryForRound[];
}

export default function BigScreenNewRound({
  currentRound,
  totalRounds,
  submittedCount,
  totalPlayers,
  collectedTopics = [],
  leaderboard = [],
}: BigScreenNewRoundProps) {
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
              <TriviCommentaryTitle>New round!</TriviCommentaryTitle>
              <TriviCommentaryBody>
                Players are submitting topics...
              </TriviCommentaryBody>
            </TriviCommentaryTextContainer>
          </TriviCommentaryCard>

          <BigScreenLeaderboardCard>
            <PlayerListTitle>Leaderboard</PlayerListTitle>
            <PlayerListContainer>
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => {
                  // Assign unique avatars by position (1–10); wrap only when more than 10 players
                  const avatarCount = 10;
                  const avatarIndex = (index % avatarCount) + 1;
                  const avatarSrc = `/assets/avatars/avatar_${avatarIndex}.svg`;
                  return (
                    <PlayerListItem key={entry.playerId}>
                      <PlayerListItemAvatar $avatarSrc={avatarSrc}>
                        {entry.playerName.charAt(0).toUpperCase()}
                      </PlayerListItemAvatar>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <PlayerListItemName>
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

        {/* Right Side - New round content */}
        <BigScreenRightContainer>
          <BigScreenTopBar>
            <span>Round {currentRound} of {totalRounds}</span>
          </BigScreenTopBar>

          <BigScreenQuestionCard>
            <BigScreenQuestionText style={{ marginBottom: '2rem' }}>
              New Round Starting! 🎯
            </BigScreenQuestionText>

            <BigScreenBodyText style={{ textAlign: 'center', marginBottom: '2rem' }}>
              {submittedCount} of {totalPlayers} players ready
            </BigScreenBodyText>

            {collectedTopics.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <MutedText style={{ fontSize: '1rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                  Topics submitted ({collectedTopics.length}):
                </MutedText>
                <TopicsContainer>
                  {collectedTopics.map((topic, index) => (
                    <TopicBadge key={index}>{topic}</TopicBadge>
                  ))}
                </TopicsContainer>
              </div>
            )}

            <MutedText style={{ fontSize: '1rem', textAlign: 'center', marginTop: '3rem' }}>
              Waiting for all players to submit their topics...
            </MutedText>
          </BigScreenQuestionCard>
        </BigScreenRightContainer>
      </BigScreenLayout>
    </BigScreenContainer>
  );
}
