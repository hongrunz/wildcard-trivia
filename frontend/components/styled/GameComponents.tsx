import styled from 'styled-components';

export const QRCodeContainer = styled.div`
  background-color: #ffffff;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const PlayerAvatar = styled.div<{ $bgColor?: string }>`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: ${props => props.$bgColor || '#3b82f6'}; /* dynamic or blue-500 fallback */
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.125rem;
`;

export const PlayerList = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const Ellipsis = styled.span`
  color: #4b5563; /* gray-600 */
  font-size: 1.125rem;
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
  padding: 0.5rem 1rem;
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 1rem;
  font-size: 0.875rem;
  color: #3b82f6;
`;

// Game Screen Components
export const GameScreenContainer = styled.div`
  min-height: 100vh;
  background-color: #4b5563; /* gray-600 - dark gray background */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

export const GameCard = styled.div`
  background-color: #e5e7eb; /* light gray */
  width: 100%;
  max-width: 28rem;
  padding: 2rem;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 400px;
`;

export const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

export const CircularBadge = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  color: #000000;
`;

export const GameTitle = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: #000000;
  text-align: center;
  margin: 0 0 2rem 0;
`;

export const QuestionText = styled.p`
  font-size: 1rem;
  color: #000000;
  margin-bottom: 1.5rem;
  text-align: center;
`;

export const AnswerInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #9ca3af;
  border-radius: 0.25rem;
  background-color: #ffffff;
  color: #111827;
  font-size: 1rem;
  margin-bottom: 1.5rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export const FeedbackMessage = styled.p`
  font-size: 1rem;
  font-weight: 600;
  color: #000000;
  text-align: center;
  margin-bottom: 1.5rem;
`;

export const LeaderboardSection = styled.div`
  margin-top: 2rem;
`;

export const LeaderboardHeading = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  color: #000000;
  margin-bottom: 1rem;
`;

export const LeaderboardList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const LeaderboardItem = styled.li`
  font-size: 1rem;
  color: #000000;
  margin-bottom: 0.5rem;
`;
