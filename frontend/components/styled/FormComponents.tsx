import styled from 'styled-components';
import Link from 'next/link';

export const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #d1d5db; /* lighter gray background */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

export const FormCard = styled.div`
  background-color: #e5e7eb; /* light gray */
  border: 2px solid #000000; /* black border */
  border-radius: 0;
  padding: 2rem;
  width: 100%;
  max-width: 28rem; /* max-w-md */
`;

export const Title = styled.h1`
  font-size: 1.875rem; /* text-3xl */
  font-weight: 700;
  color: #000000; /* black */
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
  padding: 0.5rem;
  text-align: left;
  margin-bottom: 1rem;
  border: 1px solid #9ca3af; /* border-gray-400 */
  border-radius: 0.25rem;
  background-color: #ffffff;
  color: #111827; /* gray-900 */
  font-size: 1rem;

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

export const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  text-align: left;
  margin-bottom: 1rem;
  border: 1px solid #9ca3af; /* border-gray-400 */
  border-radius: 0.25rem;
  background-color: #ffffff;
  color: #111827; /* gray-900 */
  font-size: 1rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 2rem;

  &:focus {
    outline: none;
    border-color: #3b82f6; /* blue-500 */
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
  background-color: #e5e7eb; /* gray */
  color: #000000; /* black text */
  border: 2px solid #000000; /* black border */
  
  &:hover:not(:disabled) {
    background-color: #d1d5db; /* slightly darker gray */
  }
  
  &:disabled {
    background-color: #e5e7eb;
    color: #9ca3af;
    border-color: #9ca3af;
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

export const LinkText = styled.span`
  color: #2563eb; /* blue */
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: center;
  display: block;
  margin-top: 1rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const StyledLink = styled(Link)`
  color: #2563eb; /* blue */
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: center;
  display: block;
  margin-top: 1rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const HelperText = styled.span`
  color: #4b5563; /* gray-600 */
  font-size: 0.875rem; /* text-sm */
`;

export const Text = styled.p`
  color: #4b5563; /* gray-600 */
  font-size: 0.875rem; /* text-sm */
`;