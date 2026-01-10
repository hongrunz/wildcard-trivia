import styled from 'styled-components';

export const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #1f2937; /* gray-800 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

export const FormCard = styled.div`
  background-color: #e5e7eb; /* gray-200 */
  border-radius: 0.5rem;
  padding: 2rem;
  width: 100%;
  max-width: 28rem; /* max-w-md */
`;

export const Title = styled.h1`
  font-size: 1.875rem; /* text-3xl */
  font-weight: 700;
  color: #1f2937; /* gray-800 */
  text-align: center;
  margin-bottom: 2rem;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem; /* space-y-6 */
`;

export const FieldContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #1f2937; /* gray-800 */
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;
  text-align: center;
  margin-bottom: 1rem;
  border: 1px solid #9ca3af; /* border-gray-400 */
  border-radius: 0.25rem;
  background-color: #ffffff;
  color: #111827; /* gray-900 */

  &:focus {
    outline: none;
    border-color: #3b82f6; /* blue-500 */
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }

  &[readonly] {
    cursor: default;
    background-color: #f3f4f6; /* gray-100 */
  }
`;

export const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #2563eb; /* blue-600 */
  color: white;
  border: none;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: #1d4ed8; /* blue-700 */
  }

  &:disabled {
    background-color: #9ca3af; /* gray-400 */
    cursor: not-allowed;
  }
`;

export const ButtonLarge = styled(Button)`
  padding: 0.75rem 2rem;
  font-weight: 600;
`;

export const ButtonPrimary = styled(Button)`
  background-color: #2563eb; /* blue-600 */
  
  &:hover:not(:disabled) {
    background-color: #1d4ed8; /* blue-700 */
  }
`;

export const ButtonSuccess = styled(Button)`
  background-color: #16a34a; /* green-600 */
  
  &:hover:not(:disabled) {
    background-color: #15803d; /* green-700 */
  }
`;

export const ButtonContainer = styled.div`
  margin-top: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const ButtonContainerCenter = styled.div`
  margin-top: 2rem;
  display: flex;
  justify-content: center;
`;

export const HelperText = styled.span`
  color: #4b5563; /* gray-600 */
  font-size: 0.875rem; /* text-sm */
`;

