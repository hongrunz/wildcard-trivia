'use client';

import { Text } from './styled/FormComponents';
import PlayerHeader from './PlayerHeader';
import {
  GameScreenContainer,
  GameScreenContent,
  GameCard,
  GameHeader,
  GameHeaderRow,
  CircularBadge,
  LeaderboardSection,
  LeaderboardHeading,
  LeaderboardList,
  LeaderboardItem,
  QuestionText,
  RevealedOptionRow,
  GameTimerBadge,
  GameRoundLabel,
} from './styled/GameComponents';
import { OptionsContainer } from './styled/OptionsContainer';

interface LeaderboardEntry {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
}

interface SubmittedScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  currentRound: number;
  numRounds: number;
  isCorrect: boolean;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  selectedAnswer: string | null;
  explanation: string;
  leaderboard: LeaderboardEntry[];
  timer?: number;
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M15.707 4.293a1 1 0 010 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 0z" fill="currentColor" />
    </svg>
  );
}

export default function SubmittedScreen({
  currentQuestion,
  totalQuestions,
  currentRound,
  numRounds,
  isCorrect,
  question,
  options,
  correctAnswerIndex,
  selectedAnswer,
  explanation,
  leaderboard,
  timer,
}: SubmittedScreenProps) {
  const safeOptions = options ?? [];

  // Normalize for comparison so we match the player's selection even if room data was
  // refreshed (e.g. after fetchLeaderboard/ROOM_UPDATED) and option strings differ slightly.
  const normalize = (s: string) => String(s ?? '').trim().toLowerCase();

  const feedbackMessage = isCorrect ? 'You are correct!!' : "Oops! That's incorrect.";

  return (
    <GameScreenContainer>
      <PlayerHeader feedbackMessage={feedbackMessage} />
      <GameScreenContent>
      <GameHeaderRow>
         <GameRoundLabel>Round {currentRound} of {numRounds}</GameRoundLabel>
          {timer !== undefined && <GameTimerBadge>{timer}</GameTimerBadge>}
        </GameHeaderRow>
      <GameCard>
      <GameHeader>
          <CircularBadge>Question {currentQuestion}/{totalQuestions}</CircularBadge>
        </GameHeader>
        <QuestionText>{question}</QuestionText>
        {safeOptions.length > 0 && (
          <OptionsContainer>
            {safeOptions.map((option, index) => {
              const isCorrectOption = index === correctAnswerIndex;
              const isWrongSelected =
                selectedAnswer != null &&
                !isCorrect &&
                normalize(option) === normalize(selectedAnswer);
              return (
                <RevealedOptionRow
                  key={index}
                  $correct={isCorrectOption}
                  $wrongSelected={isWrongSelected}
                >
                  {option}
                  {isCorrectOption && <CheckIcon />}
                  {isWrongSelected && <XIcon />}
                </RevealedOptionRow>
              );
            })}
          </OptionsContainer>
        )}
        {explanation && (
          <Text style={{ marginTop: '1rem' }}><strong>Explanation:</strong> {explanation}</Text>
        )}
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
      </GameScreenContent>
    </GameScreenContainer>
  );
}
