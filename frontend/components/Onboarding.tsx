'use client';

import { useRouter } from 'next/navigation';
import {
  OnboardingContainer,
  OnboardingContent,
  OnboardingTitleImage,
  OnboardingExplanationCard,
  OnboardingIllustration,
  OnboardingExplanationText,
  OnboardingButtonWrap,
} from './styled/OnboardingComponents';
import { ButtonPrimary } from './styled/FormComponents';
import { useBackgroundMusic } from '../lib/useBackgroundMusic';
import MusicControl from './MusicControl';

export default function Onboarding() {
  const router = useRouter();
  const { isMuted, toggleMute, isLoaded } = useBackgroundMusic('/background-music.mp3', {
    autoPlay: true,
    loop: true,
    volume: 0.3,
  });

  return (
    <>
      <MusicControl isMuted={isMuted} onToggle={toggleMute} disabled={!isLoaded} />
      <OnboardingContainer>
      <OnboardingContent>
        <OnboardingTitleImage
          src="/assets/GameTitle_OnStart.svg"
          alt="Wildcard Trivia!"
        />
        <OnboardingExplanationCard>
          <OnboardingIllustration>
            <img src="/assets/Illustration.svg" alt="" aria-hidden />
          </OnboardingIllustration>
          <OnboardingExplanationText>
            Trivi will find connections between your topics of interest, and make
            the game enjoyable for your whole group!
            <br />
            <br />
            <strong>Recommended for 2-5 players</strong>
          </OnboardingExplanationText>
        </OnboardingExplanationCard>
        <OnboardingButtonWrap>
          <ButtonPrimary onClick={() => router.push('/create')}>
            Start
          </ButtonPrimary>
        </OnboardingButtonWrap>
      </OnboardingContent>
    </OnboardingContainer>
    </>
  );
}
