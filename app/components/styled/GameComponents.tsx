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

export const PlayerAvatar = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: #3b82f6; /* blue-500 */
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

