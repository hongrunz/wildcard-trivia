import styled from 'styled-components';
import { colors, typography } from './theme';

export const QRCodeContainer = styled.div`
  background-color: ${colors.surface};
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const PlayerAvatar = styled.div<{ $bgColor?: string; $avatarSrc?: string }>`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: ${props => props.$bgColor || colors.accent};
  background-image: ${props => props.$avatarSrc ? `url(${props.$avatarSrc})` : 'none'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$avatarSrc ? 'transparent' : colors.surface};
  font-family: ${typography.fontFamily.dmSans};
  font-weight: ${typography.fontWeight.bold};
  font-size: ${typography.fontSize.lg};
  line-height: ${typography.lineHeight.tight};
  overflow: hidden;
`;

export const PlayerList = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

// Player List Card Components
export const CardsContainer = styled.div`
  display: flex;
  gap: 2rem;
  width: 100%;
  max-width: 60rem;
  align-items: flex-start;
  justify-content: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    max-width: 28rem;
  }
`;

export const PlayerListCard = styled.div`
  background-color: ${colors.surface};
  border-radius: 40px;
  padding: 2rem;
  width: 100%;
  max-width: 20rem;
  min-height: 400px;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    max-width: 28rem;
    min-height: auto;
  }
`;

export const PlayerListTitle = styled.h2`
  font-family: ${typography.presets.h2.fontFamily};
  font-size: ${typography.presets.h2.fontSize};
  font-weight: ${typography.presets.h2.fontWeight};
  line-height: ${typography.presets.h2.lineHeight};
  color: ${colors.typeMain};
  text-align: center;
  margin-bottom: 1.5rem;
`;

export const PlayerListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${colors.surfaceSecondary};

  &:last-child {
    border-bottom: none;
  }
`;

export const PlayerListItemAvatar = styled(PlayerAvatar)`
  flex-shrink: 0;
`;

export const PlayerListItemName = styled.span`
  font-family: ${typography.presets.body.fontFamily};
  font-size: ${typography.presets.body.fontSize};
  font-weight: ${typography.presets.body.fontWeight};
  line-height: ${typography.presets.body.lineHeight};
  color: ${colors.typeMain};
  flex: 1;
`;

export const PlayerListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
  max-height: 500px;

  @media (max-width: 768px) {
    max-height: 300px;
  }
`;

// Game Title Image (standalone, e.g. for non-player screens)
export const GameTitleImage = styled.img`
  width: 100%;
  max-width: 30rem;
  height: auto;
  margin: 0 auto 2rem auto;
  display: block;
  
  @media (max-width: 768px) {
    max-width: 20rem;
    margin-bottom: 1.5rem;
  }
`;

// Player header: Primary background, full-bleed. Title centered in header; Trivi on the left.
export const PlayerHeaderBar = styled.header`
  width: 100%;
  margin: 0;
  background-color: ${colors.primary};
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0.75rem 1rem;
  flex-shrink: 0;
`;

// Content area below the player header (use when header is full-bleed so container has no padding)
export const GameScreenContent = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
`;

// For form-based player views (Join, Start, Create, Access Denied): outer no padding, content padded
export const PlayerPageContainer = styled.div`
  min-height: 100vh;
  background-color: ${colors.primary};
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  width: 100%;
`;

export const PlayerPageContent = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
`;

export const PlayerHeaderTriviImg = styled.img`
  height: 32px;
  width: auto;
  display: block;
  flex-shrink: 0;
  position: absolute;
  left: 1rem;
  background-color: ${colors.surface};
  border-radius: 8px;
`;

export const PlayerHeaderTitleWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const PlayerHeaderTitleImg = styled.img`
  height: 32px;
  width: auto;
  display: block;
  flex-shrink: 0;
  margin: 0 auto;
`;

// Chat bubble from Trivi (for correct/wrong feedback on SubmittedScreen)
export const TriviChatBubbleWrap = styled.div`
  position: absolute;
  left: calc(1rem + 32px + 0.5rem);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  z-index: 2;
`;

export const TriviChatBubbleTail = styled.div`
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 10px solid ${colors.surface};
  flex-shrink: 0;
  align-self: flex-end;
  margin-bottom: 0.5rem;
`;

export const TriviChatBubble = styled.div`
  background-color: ${colors.surface};
  color: ${colors.typeMain};
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.semibold};
  line-height: ${typography.lineHeight.normal};
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 14rem;
`;

export const Ellipsis = styled.span`
  color: ${colors.bgContrast};
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.normal};
  line-height: ${typography.lineHeight.normal};
`;

export const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const BottomSection = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 2rem;
`;

export const TopicsSection = styled.div`
  margin-bottom: 2rem;
  width: 100%;
`;

export const TopicsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
`;

export const TopicBadge = styled.span`
  padding: 0.5rem 1.2rem;
  background-color: ${colors.surfaceDark};
  border-radius: 2rem;
  font-family: ${typography.presets.badge.fontFamily};
  font-size: ${typography.presets.badge.fontSize};
  font-weight: ${typography.presets.badge.fontWeight};
  line-height: ${typography.presets.badge.lineHeight};
  color: ${colors.typeMain};
`;

// Game Screen Components (player game layout: no padding so header is full-bleed; use GameScreenContent for padded content)
export const GameScreenContainer = styled.div`
  min-height: 100vh;
  background-color: ${colors.bgContrast};
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
`;

export const GameHeaderRow = styled.div`
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 1rem 0;
`;

export const GameRoundLabel = styled.p`
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.medium};
  color: ${colors.surface};
  margin: 0;
`;

export const GameTimerBadge = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background-color: ${colors.surface};
  border: 2px solid ${colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${typography.fontFamily.dmSans};
  font-weight: ${typography.fontWeight.bold};
  font-size: ${typography.fontSize.sm};
  line-height: ${typography.lineHeight.tight};
  color: ${colors.typeMain};
`;

export const PlayerGameCardWrapper = styled.div`
  width: 100%;
  max-width: 28rem;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.5rem;
`;

export const GameCard = styled.div`
  background-color: ${colors.surface};
  width: 100%;
  max-width: 28rem;
  padding: 2rem;
  padding-top: 2.5rem;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  border-radius: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

export const GameHeader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
`;

export const CircularBadge = styled.div`
  width: auto;
  height: 3rem;
  border-radius: 50%;
  background-color: ${colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${typography.fontFamily.dmSans};
  font-weight: ${typography.fontWeight.bold};
  font-size: ${typography.fontSize.base};
  line-height: ${typography.lineHeight.tight};
  color: ${colors.typeMain};
`;

export const GameSubmitButton = styled.button`
  width: 100%;
  padding: 1rem 1.5rem;
  margin-top: auto;
  margin-bottom: 0;
  background-color: ${colors.accent};
  color: ${colors.typeMain};
  border: none;
  border-radius: 12px;
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.bold};
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${colors.typeAccent};
  }

  &:disabled {
    background-color: ${colors.typeSecondary};
    cursor: not-allowed;
    opacity: 0.8;
  }
`;

export const GameHeaderCentered = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

export const GameTitle = styled.h2`
  font-family: ${typography.presets.h2.fontFamily};
  font-size: ${typography.presets.h2.fontSize};
  font-weight: ${typography.presets.h2.fontWeight};
  line-height: ${typography.presets.h2.lineHeight};
  color: ${colors.surface};
  text-align: center;
  margin: 0 0 2rem 0;
`;

export const QuestionText = styled.h3`
  font-family: ${typography.presets.h3.fontFamily};
  font-size: ${typography.presets.h3.fontSize};
  font-weight: ${typography.presets.h3.fontWeight};
  line-height: ${typography.presets.h3.lineHeight};
  color: ${colors.typeMain};
  margin-bottom: 1.5rem;
  text-align: center;
`;

export const AnswerInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${colors.border};
  border-radius: 0.25rem;
  background-color: ${colors.surface};
  color: ${colors.typeMain};
  font-family: ${typography.presets.input.fontFamily};
  font-size: ${typography.presets.input.fontSize};
  font-weight: ${typography.presets.input.fontWeight};
  line-height: ${typography.presets.input.lineHeight};
  margin-bottom: 1.5rem;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px ${colors.surfaceSecondary};
  }
`;

export const FeedbackMessage = styled.p`
  font-family: ${typography.presets.h3.fontFamily};
  font-size: ${typography.presets.h3.fontSize};
  font-weight: ${typography.presets.h3.fontWeight};
  line-height: ${typography.presets.h3.lineHeight};
  color: ${colors.typeMain};
  text-align: center;
  margin-bottom: 1.5rem;
`;

export const LeaderboardSection = styled.div`
  margin-top: 2rem;
`;

export const LeaderboardHeading = styled.h2`
  font-family: ${typography.presets.h3.fontFamily};
  font-size: ${typography.presets.h3.fontSize};
  font-weight: ${typography.presets.h3.fontWeight};
  line-height: ${typography.presets.h3.lineHeight};
  color: ${colors.typeMain};
  margin-bottom: 1rem;
`;

export const LeaderboardList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const LeaderboardItem = styled.li`
  font-family: ${typography.presets.body.fontFamily};
  font-size: ${typography.presets.body.fontSize};
  font-weight: ${typography.presets.body.fontWeight};
  line-height: ${typography.presets.body.lineHeight};
  color: ${colors.typeMain};
  margin-bottom: 0.5rem;
`;

/** Option row on answer-reveal screen: correct (green + check), wrong-selected (primarySelected + X), or neutral */
export const RevealedOptionRow = styled.div<{ $correct?: boolean; $wrongSelected?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 100px;
  border: 1px solid ${colors.border};
  background-color: ${props =>
    props.$correct ? colors.green[500] : props.$wrongSelected ? colors.primarySelected : colors.surface};
  color: ${props => (props.$correct || props.$wrongSelected) ? colors.surface : colors.typeMain};
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.semibold};
  line-height: ${typography.lineHeight.normal};
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;
