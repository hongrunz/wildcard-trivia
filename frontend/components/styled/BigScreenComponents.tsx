import styled from 'styled-components';
import {
  LeaderboardSection,
  LeaderboardHeading,
  LeaderboardItem,
} from './GameComponents';
import { colors, typography } from './theme';

// Styled components for big screen (scaled up version of mobile styles)
export const BigScreenCard = styled.div`
  background-color: ${colors.surface};
  width: 100%;
  max-width: 90rem;
  padding: 4rem;
  position: relative;
  display: flex;
  flex-direction: column;

  @media (max-width: 1024px) {
    max-width: 60rem;
    padding: 3rem;
  }

  @media (max-width: 768px) {
    max-width: 28rem;
    padding: 2rem;
  }
`;

export const BigScreenHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

export const BigScreenBadge = styled.div`
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background-color: ${colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${typography.presets.bigScreenBadge.fontFamily};
  font-weight: ${typography.presets.bigScreenBadge.fontWeight};
  font-size: ${typography.presets.bigScreenBadge.fontSize};
  line-height: ${typography.presets.bigScreenBadge.lineHeight};
  color: ${colors.typeMain};

  @media (max-width: 768px) {
    width: 3rem;
    height: 3rem;
    font-size: ${typography.fontSize.base};
  }
`;

export const BigScreenQuestionText = styled.h1`
  font-family: ${typography.presets.h1.fontFamily};
  font-size: ${typography.presets.h1.fontSize};
  font-weight: ${typography.presets.h1.fontWeight};
  line-height: ${typography.presets.h1.lineHeight};
  color: ${colors.typeMain};
  margin-bottom: 3rem;
  text-align: center;

  @media (max-width: 1200px) {
    font-size: ${typography.fontSize.displaymd};
    margin-bottom: 2rem;
  }

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.displaymd};
    margin-bottom: 1.5rem;
  }
`;

export const BigScreenOptionsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0 0 3rem 0;

  @media (max-width: 768px) {
    gap: 0.5rem;
    margin: 0 0 1.5rem 0;
  }
`;

export const BigScreenOptionBox = styled.div<{ $isCorrect?: boolean; $showAnswer?: boolean }>`
  width: 100%;
  padding: 2.5rem;
  border: 2px solid ${colors.border};
  border-radius: 100px;
  background-color: ${props => 
    props.$showAnswer && props.$isCorrect ? colors.green[500] : colors.surface};
  color: ${props => 
    props.$showAnswer && props.$isCorrect ? colors.surface : colors.typeMain};
  font-family: ${typography.presets.bigScreenOption.fontFamily};
  font-size: ${typography.presets.bigScreenOption.fontSize};
  font-weight: ${typography.presets.bigScreenOption.fontWeight};
  line-height: ${typography.presets.bigScreenOption.lineHeight};
  text-align: center;
  transition: all 0.3s ease;

  @media (max-width: 1024px) {
    padding: 1.5rem;
    font-size: ${typography.fontSize.displaymd};
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    font-size: ${typography.fontSize.base};
  }
`;

export const BigScreenExplanation = styled.div`
  
  background-color: ${colors.surface};
  border-radius: 0.5rem;
  margin-bottom: 2rem;
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.normal};
  line-height: ${typography.lineHeight.normal};
  color: ${colors.typeMain};
  

  @media (max-width: 768px) {
    
    font-size: ${typography.fontSize.base};
  }
`;

export const BigScreenLeaderboardSection = styled(LeaderboardSection)`
  margin-top: 2rem;
  background-color: ${colors.surface};
  padding: 2rem;
  border-radius: 0.5rem;
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const BigScreenLeaderboardHeading = styled(LeaderboardHeading)`
  font-size: ${typography.fontSize.display2xl};
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.base};
    margin-bottom: 1rem;
  }
`;

export const BigScreenLeaderboardItem = styled(LeaderboardItem)`
  font-size: ${typography.fontSize.displaymd};
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.base};
    margin-bottom: 0.5rem;
  }
`;

// Error title with red color
export const ErrorTitle = styled.h1`
  font-family: ${typography.presets.h1.fontFamily};
  font-size: ${typography.presets.h1.fontSize};
  font-weight: ${typography.presets.h1.fontWeight};
  line-height: ${typography.presets.h1.lineHeight};
  color: #ef4444;
  text-align: center;
  margin: 0 0 2rem 0;
`;

// Two-column layout for big screen
export const BigScreenLayout = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  align-items: stretch;

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
  }
`;

// Game play status container (left side with commentary and leaderboard)
export const GamePlayStatus = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 60%;
  padding: 2rem;
  overflow-y: auto;

  @media (max-width: 1200px) {
    width: 50%;
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

// Right side container for question area
export const BigScreenRightContainer = styled.div`
  width: 40%;
  min-height: 100vh;
  background-color: ${colors.bgContrast};
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 40px 0px 0px 40px;

  @media (max-width: 1200px) {
    width: 50%;
  }

  @media (max-width: 768px) {
    width: 100%;
    min-height: auto;
  }
`;

// Big screen container with blue background
export const BigScreenContainer = styled.div`
  min-height: 100vh;
  background-color: ${colors.primary};
  display: flex;
  flex-direction: column;
  padding: 0;
  position: relative;
  width: 100%;
  overflow: hidden;
`;

// Game title for big screen (Wildcard in white, Trivia! in yellow)
export const BigScreenGameTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: ${typography.fontFamily.itim};
  font-size: 3rem;
  font-weight: ${typography.fontWeight.bold};
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

export const BigScreenGameTitlePart = styled.span<{ $color: string }>`
  color: ${props => props.$color};
`;

// Trivi commentary card
export const TriviCommentaryCard = styled.div`
  background-color:${colors.surface};
  border-radius: 40px;
  padding: 2rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: none;
`;

// Character container for Trivi commentary card
export const TriviCommentaryCharacterContainer = styled.div`
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  min-height: 60px;
  max-width: 250px;
  max-height: 250px;
  flex-shrink: 1;
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
    
  }
`;

// Text container for Trivi commentary card
export const TriviCommentaryTextContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;

 
  
  
`;

// Trivi commentary title text
export const TriviCommentaryTitle = styled.div`
  font-family: ${typography.presets.Commentary.fontFamily};
  font-size: ${typography.presets.Commentary.fontSize};
  font-weight: ${typography.presets.Commentary.fontWeight};
  line-height: ${typography.presets.Commentary.lineHeight};
  color: ${colors.typeMain};
  width: fit-content;
  height: fit-content;

  
`;

// Trivi commentary body text
export const TriviCommentaryBody = styled.div`
  font-family: ${typography.presets.Commentary.fontFamily};
  font-size: ${typography.presets.Commentary.fontSize};
  font-weight: ${typography.presets.Commentary.fontWeight};
  line-height: ${typography.presets.Commentary.lineHeight};
  color: ${colors.typeMain};
  width: fit-content;
  height: fit-content;

   @media (max-width: 768px) {
    line-height: 1;
  }

  
`;

// Question progress text
export const QuestionProgress = styled.div`
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.sm};
  color: ${colors.typeSecondary};
  text-align: center;
  margin-bottom: 1rem;
`;

// Top bar with round info and timer
export const BigScreenTopBar = styled.div`
  
  top: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: ${colors.bgContrast};
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  color: white;
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.semibold};
  z-index: 10;
  
  @media (max-width: 768px) {
    position: relative;
    top: auto;
    right: auto;
    margin-bottom: 1rem;
  }
`;

export const TimerBadge = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${typography.fontWeight.bold};
`;

// Leaderboard card for big screen (left side)
export const BigScreenLeaderboardCard = styled.div`
  background-color: ${colors.surface};
  border-radius: 40px;
  padding: 2rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid ${colors.border};

 
  @media (max-width: 768px) {
    max-width: 100%;
    min-height: auto;
  }
`;

// Leaderboard item with colored score
export const LeaderboardScore = styled.span`
  color: ${colors.typeAccent};
  font-weight: ${typography.fontWeight.bold};
  font-size: ${typography.fontSize.lg};
`;

// Body text for card content (matches theme body preset)
export const BigScreenBodyText = styled.p`
  font-family: ${typography.presets.body.fontFamily};
  font-size: ${typography.presets.body.fontSize};
  font-weight: ${typography.presets.body.fontWeight};
  line-height: ${typography.presets.body.lineHeight};
  color: ${colors.typeMain};
  margin: 0;
`;

// Question content card (right side)
export const BigScreenQuestionCard = styled(BigScreenCard)`
  flex: 1;
  border-radius: 40px;
  background-color: ${colors.surface};
`;
