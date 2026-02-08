'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FormGroup,
  FieldContainer,
  Label,
  Input,
  ButtonPrimary,
  ButtonContainerCenter,
} from './styled/FormComponents';
import { ErrorText } from './styled/ErrorComponents';
import { GameTitleImage } from './styled/GameComponents';
import {
  BigScreenContainer,
  BigScreenLayout,
  BigScreenRightContainer,
  BigScreenGameTitle,
  TriviCommentaryCharacterContainer,
  TriviCommentaryTextContainer,
  TriviCommentaryTitle,
  TriviCommentaryBody,
  CreateGameLeftSection,
  CreateGameWelcomeCard,
  CreateGameFormCard,
  CreateGameSectionTitle,
  CreateGameDurationText,
} from './styled/BigScreenComponents';
import { api, tokenStorage } from '../lib/api';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import MusicControl from './MusicControl';

const DEFAULT_NUM_QUESTIONS = 3;
const DEFAULT_TIME_LIMIT = 30;
const DEFAULT_NUM_ROUNDS = 3;

/** Answer reveal timer length (seconds) — must match useGameTimerDisplay.REVIEW_TIME_SECONDS */
const ANSWER_REVEAL_SECONDS = 15;
/** Buffer between rounds for topic submission / leaderboard (minutes) for max estimate */
const ROUND_BUFFER_MINUTES = 2;

export default function CreateGame() {
  const router = useRouter();
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_NUM_QUESTIONS));
  const [timeLimit, setTimeLimit] = useState(String(DEFAULT_TIME_LIMIT));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [numRounds, setNumRounds] = useState(String(DEFAULT_NUM_ROUNDS));

  const { isMuted, toggleMute, isLoaded } = useBackgroundMusic('/background-music.mp3', {
    autoPlay: true,
    loop: true,
    volume: 0.3,
  });

  const parsedNumRounds = numRounds === '' ? NaN : parseInt(numRounds, 10);
  const parsedNumQuestions = numQuestions === '' ? NaN : parseInt(numQuestions, 10);
  const parsedTimeLimit = timeLimit === '' ? NaN : parseInt(timeLimit, 10);

  const isNumRoundsValid = !Number.isNaN(parsedNumRounds) && parsedNumRounds >= 1 && parsedNumRounds <= 5;
  const isNumQuestionsValid = !Number.isNaN(parsedNumQuestions) && parsedNumQuestions >= 1 && parsedNumQuestions <= 10;
  const isTimeLimitValid = !Number.isNaN(parsedTimeLimit) && parsedTimeLimit >= 30 && parsedTimeLimit <= 50;

  const isFormValid =
    isNumRoundsValid &&
    isNumQuestionsValid &&
    isTimeLimitValid;

  // Total time range: min = rounds * questions * (timePerQuestion + answerReveal); max = min + rounds * 2min
  const totalSecondsMin =
    isNumRoundsValid && isNumQuestionsValid && isTimeLimitValid
      ? parsedNumRounds * parsedNumQuestions * (parsedTimeLimit + ANSWER_REVEAL_SECONDS)
      : 0;
  const totalSecondsMax =
    totalSecondsMin > 0
      ? totalSecondsMin + parsedNumRounds * ROUND_BUFFER_MINUTES * 60
      : 0;
  const totalMinMinutes = totalSecondsMin > 0 ? Math.ceil(totalSecondsMin / 60) : 0;
  const totalMaxMinutes = totalSecondsMax > 0 ? Math.ceil(totalSecondsMax / 60) : 0;

  const handleCreateRoom = async () => {
    if (!isNumRoundsValid || !isNumQuestionsValid || !isTimeLimitValid) {
      setError('Please fill in all numeric fields with valid values (rounds: 1-5, questions: 1-10, time limit: 30-50 seconds).');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.createRoom({
        name: 'Host',
        topics: [],
        questionsPerRound: parsedNumQuestions,
        timePerQuestion: parsedTimeLimit,
        sessionMode: 'display',
        numRounds: parsedNumRounds,
      });

      tokenStorage.setHostToken(response.roomId, response.hostToken);
      router.push(`/host/${response.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
      <BigScreenContainer>
      <BigScreenLayout>
        {/* Left section: title + welcome card (same style as BigScreenDisplay) */}
        <CreateGameLeftSection>
          <BigScreenGameTitle>
            <GameTitleImage src="/assets/game_title.svg" alt="Wildcard Trivia" />
          </BigScreenGameTitle>

          <CreateGameWelcomeCard>
            <TriviCommentaryCharacterContainer>
              <img src="/assets/Trivi_big_smile.svg" alt="Trivi character" />
            </TriviCommentaryCharacterContainer>
            <TriviCommentaryTextContainer>
              <TriviCommentaryTitle>Create a room to get started!</TriviCommentaryTitle>
              <TriviCommentaryBody>
              I will stay on this screen and guide you through the game. Use your own device to join and play.
              </TriviCommentaryBody>
            </TriviCommentaryTextContainer>
          </CreateGameWelcomeCard>
        </CreateGameLeftSection>

        {/* Right section: white form card (same style as BigScreen right panel) */}
        <BigScreenRightContainer>
          <CreateGameFormCard>
            <CreateGameSectionTitle>Game Room Setup</CreateGameSectionTitle>

           
            <FormGroup>
              <FieldContainer>
                <Label htmlFor="numRounds">Number of rounds</Label>
                <Input
                  id="numRounds"
                  type="number"
                  value={numRounds}
                  min={1}
                  max={5}
                  onChange={(e) => setNumRounds(e.target.value)}
                  placeholder="e.g., 3"
                />
              </FieldContainer>

              <FieldContainer>
                <Label htmlFor="numQuestions">Number of questions each round</Label>
                <Input
                  id="numQuestions"
                  type="number"
                  value={numQuestions}
                  min={1}
                  max={10}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  placeholder="e.g., 3"
                />
              </FieldContainer>

              <FieldContainer>
                <Label htmlFor="timeLimit">Time limit per question (seconds)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={timeLimit}
                  min={30}
                  max={50}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="e.g., 30 (seconds)"
                />
              </FieldContainer>
            </FormGroup>

            {error && <ErrorText>{error}</ErrorText>}

            {totalMinMinutes > 0 && totalMaxMinutes > 0 && (
              <CreateGameDurationText>
                Your game will take approximately {totalMinMinutes}–{totalMaxMinutes} min.
              </CreateGameDurationText>
            )}

            <ButtonContainerCenter>
              <ButtonPrimary
                onClick={handleCreateRoom}
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </ButtonPrimary>
            </ButtonContainerCenter>
          </CreateGameFormCard>
        </BigScreenRightContainer>
      </BigScreenLayout>
    </BigScreenContainer>
    </>
  );
}
