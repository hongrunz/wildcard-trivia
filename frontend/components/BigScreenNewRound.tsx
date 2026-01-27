'use client';

import {
  GameScreenContainer,
  GameTitle,
  GameTitleImage,
  TopicsContainer,
  TopicBadge,
} from './styled/GameComponents';
import {
  BigScreenCard,
  BigScreenHeader,
  BigScreenBadge,
} from './styled/BigScreenComponents';
import { MutedText } from './styled/StatusComponents';

interface BigScreenNewRoundProps {
  currentRound: number;
  totalRounds: number;
  submittedCount: number;
  totalPlayers: number;
  collectedTopics?: string[];
}

export default function BigScreenNewRound({
  currentRound,
  totalRounds,
  submittedCount,
  totalPlayers,
  collectedTopics = [],
}: BigScreenNewRoundProps) {
  return (
    <GameScreenContainer>
      <GameTitleImage src="/assets/game_title.svg" alt="Ultimate Trivia" />
      <BigScreenCard>
        <BigScreenHeader>
          <BigScreenBadge>
            Round {currentRound}/{totalRounds}
          </BigScreenBadge>
          <BigScreenBadge>
            {submittedCount}/{totalPlayers} Ready
          </BigScreenBadge>
        </BigScreenHeader>

        <GameTitle style={{ fontSize: '3rem', marginBottom: '2rem' }}>
          New Round Starting! 🎯
        </GameTitle>

        <MutedText style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          Players are submitting topics...
        </MutedText>

        {/* Display collected topics */}
        {collectedTopics && collectedTopics.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <MutedText style={{ fontSize: '1rem', marginBottom: '0.5rem', textAlign: 'center' }}>
              Topics submitted ({collectedTopics.length}):
            </MutedText>
            <TopicsContainer>
              {collectedTopics.map((topic, index) => (
                <TopicBadge key={index}>
                  {topic}
                </TopicBadge>
              ))}
            </TopicsContainer>
          </div>
        )}

        <MutedText style={{ fontSize: '1rem', textAlign: 'center', marginTop: '3rem' }}>
          Waiting for all players to submit their topics...
        </MutedText>
      </BigScreenCard>
    </GameScreenContainer>
  );
}
