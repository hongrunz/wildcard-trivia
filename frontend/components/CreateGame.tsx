'use client';

import { useState, useEffect } from 'react';
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
import { InfoBox } from './styled/InfoComponents';
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
import { getSessionMode, getDeviceType } from '../lib/deviceDetection';
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
  const [hostName, setHostName] = useState('');
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_NUM_QUESTIONS));
  const [timeLimit, setTimeLimit] = useState(String(DEFAULT_TIME_LIMIT));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [sessionMode, setSessionMode] = useState<'player' | 'display'>('player');
  const [deviceType, setDeviceType] = useState<'mobile' | 'web'>('web');
  const [isMounted, setIsMounted] = useState(false);
  const [numRounds, setNumRounds] = useState(String(DEFAULT_NUM_ROUNDS));

  useEffect(() => {
    const mode = getSessionMode();
    const device = getDeviceType();
    setSessionMode(mode);
    setDeviceType(device);
    setIsMounted(true);
  }, []);

  const { isMuted, toggleMute, isLoaded } = useBackgroundMusic('/background-music.mp3', {
    autoPlay: true,
    loop: true,
    volume: 0.3,
  });

  const parsedNumRounds = numRounds === '' ? NaN : parseInt(numRounds, 10);
  const parsedNumQuestions = numQuestions === '' ? NaN : parseInt(numQuestions, 10);
  const parsedTimeLimit = timeLimit === '' ? NaN : parseInt(timeLimit, 10);

  const isNumRoundsValid = !Number.isNaN(parsedNumRounds) && parsedNumRounds >= 1;
  const isNumQuestionsValid = !Number.isNaN(parsedNumQuestions) && parsedNumQuestions >= 1;
  const isTimeLimitValid = !Number.isNaN(parsedTimeLimit) && parsedTimeLimit >= 1;

  const isFormValid =
    (sessionMode !== 'player' || !!hostName.trim()) &&
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
    if (sessionMode === 'player' && !hostName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!isNumRoundsValid || !isNumQuestionsValid || !isTimeLimitValid) {
      setError('Please fill in all numeric fields with valid values (rounds and questions ≥ 1, time limit ≥ 1).');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.createRoom({
        name: hostName.trim() || 'Host',
        topics: deviceType === 'mobile' ? [topic] : [],
        questionsPerRound: parsedNumQuestions,
        timePerQuestion: parsedTimeLimit,
        sessionMode: sessionMode,
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
              {sessionMode === 'player' && (
                <FieldContainer>
                  <Label htmlFor="hostName">Your Name:</Label>
                  <Input
                    id="hostName"
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </FieldContainer>
              )}

              {deviceType === 'mobile' && (
                <FieldContainer>
                  <Label htmlFor="topic">Topic Suggestion:</Label>
                  <Input
                    id="topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter a topic for questions"
                  />
                </FieldContainer>
              )}

              <FieldContainer>
                <Label htmlFor="numRounds">Number of rounds</Label>
                <Input
                  id="numRounds"
                  type="number"
                  value={numRounds}
                  min={1}
                  onChange={(e) => setNumRounds(e.target.value)}
                  placeholder="e.g., 5"
                />
              </FieldContainer>

              <FieldContainer>
                <Label htmlFor="numQuestions">Number of questions each round</Label>
                <Input
                  id="numQuestions"
                  type="number"
                  value={numQuestions}
                  min={1}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  placeholder="e.g., 5"
                />
              </FieldContainer>

              <FieldContainer>
                <Label htmlFor="timeLimit">Time limit per question</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={timeLimit}
                  min={1}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="e.g., 20 (seconds)"
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
