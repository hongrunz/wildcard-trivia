import styled from 'styled-components';

export const OptionsContainer = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin: 0 0 1.5rem 0;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const OptionButton = styled.button`
  width: 100%;
  padding: 0.75rem 0.75rem;
  border: 1px solid #9ca3af; /* gray-400 */
  border-radius: 0.375rem;
  background-color: #ffffff;
  color: #111827; /* gray-900 */
  font-size: 0.95rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.05s ease;

  &:hover:not(:disabled) {
    background-color: #f3f4f6; /* gray-100 */
    border-color: #6b7280; /* gray-500 */
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: none;
    border-color: #3b82f6; /* blue-500 */
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

