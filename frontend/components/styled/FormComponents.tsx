import styled from 'styled-components';
import Link from 'next/link';
import { colors, typography } from './theme';

export const PageContainer = styled.div`
  min-height: 100vh;
  background-color: ${colors.primary};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  width: 100%;
`;

export const FormCard = styled.div`
  background-color: ${colors.surface};
  
  border-radius: 40px;
  padding: 2rem;
  width: 100%;
  max-width: 28rem; /* max-w-md */
`;

export const Title = styled.h1`
  font-family: ${typography.presets.h1.fontFamily};
  font-size: ${typography.presets.h1.fontSize};
  font-weight: ${typography.presets.h1.fontWeight};
  line-height: ${typography.presets.h1.lineHeight};
  color: ${colors.typeMain};
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
  font-family: ${typography.presets.label.fontFamily};
  font-size: ${typography.presets.label.fontSize};
  font-weight: ${typography.presets.label.fontWeight};
  line-height: ${typography.presets.label.lineHeight};
  color: ${colors.typeMain};
`;

export const Input = styled.input`
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.5rem;
  text-align: left;
  margin-bottom: 1rem;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background-color: ${colors.surface};
  color: ${colors.typeMain};
  font-family: ${typography.presets.input.fontFamily};
  font-size: ${typography.presets.input.fontSize};
  font-weight: ${typography.presets.input.fontWeight};
  line-height: ${typography.presets.input.lineHeight};
  box-sizing: border-box;

  &:focus {
    outline: none;
    border: 1px solid ${colors.border};
    outline: 1px solid ${colors.border};
    outline-offset: 0;
    box-shadow: 0 0 5px 5px ${colors.surfaceSecondary};
  }

  &::placeholder {
    color: ${colors.border};
  }

  &[readonly] {
    cursor: default;
    background-color: ${colors.surfaceSecondary};
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  text-align: left;
  margin-bottom: 1rem;
  border: 1px solid ${colors.border};
  border-radius: 0.25rem;
  background-color: ${colors.surface};
  color: ${colors.typeMain};
  font-family: ${typography.presets.input.fontFamily};
  font-size: ${typography.presets.input.fontSize};
  font-weight: ${typography.presets.input.fontWeight};
  line-height: ${typography.presets.input.lineHeight};
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 2rem;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px ${colors.surfaceSecondary};
  }
`;

export const Button = styled.button`
  padding: 0.5rem 1.5rem;
  background-color: ${colors.accent};
  color: ${colors.typeMain};
  border: none;
  border-radius: 8px;
  font-family: ${typography.presets.button.fontFamily};
  font-size: ${typography.presets.button.fontSize};
  font-weight: ${typography.presets.button.fontWeight};
  line-height: ${typography.presets.button.lineHeight};
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${colors.typeAccent};
  }

  &:disabled {
    background-color: ${colors.typeSecondary};
    cursor: not-allowed;
  }
`;

export const ButtonLarge = styled(Button)`
  padding: 0.75rem 2rem;
  font-weight: ${typography.presets.buttonLarge.fontWeight};
`;

export const ButtonPrimary = styled(Button)`
  background-color: ${colors.accent};
  color: ${colors.typeMain};
  
  
  &:hover:not(:disabled) {
    background-color: ${colors.typeAccent};
    color: ${colors.typeMain};
  }
  
  &:disabled {
    background-color: ${colors.typeSecondary};
    color: ${colors.typeMain};
    
  }
`;

export const ButtonSuccess = styled(Button)`
  background-color: #16a34a; /* green-600 */
  
  &:hover:not(:disabled) {
    background-color:  #16a34a;
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
  color: ${colors.typeAccent};
  text-decoration: none;
  font-family: ${typography.presets.link.fontFamily};
  font-size: ${typography.presets.link.fontSize};
  font-weight: ${typography.presets.link.fontWeight};
  line-height: ${typography.presets.link.lineHeight};
  cursor: pointer;
  text-align: center;
  display: block;
  margin-top: 1rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const StyledLink = styled(Link)`
  color: ${colors.accent};
  text-decoration: none;
  font-family: ${typography.presets.link.fontFamily};
  font-size: ${typography.presets.link.fontSize};
  font-weight: ${typography.presets.link.fontWeight};
  line-height: ${typography.presets.link.lineHeight};
  cursor: pointer;
  text-align: center;
  display: block;
  margin-top: 1rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const HelperText = styled.span`
  color: ${colors.bgContrast};
  font-family: ${typography.presets.bodySmall.fontFamily};
  font-size: ${typography.presets.bodySmall.fontSize};
  font-weight: ${typography.presets.bodySmall.fontWeight};
  line-height: ${typography.presets.bodySmall.lineHeight};
`;

export const Text = styled.p`
  color: ${colors.bgContrast};
  font-family: ${typography.presets.bodySmall.fontFamily};
  font-size: ${typography.presets.bodySmall.fontSize};
  font-weight: ${typography.presets.bodySmall.fontWeight};
  line-height: ${typography.presets.bodySmall.lineHeight};
`;