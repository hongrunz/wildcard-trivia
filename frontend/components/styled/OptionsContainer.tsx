import styled from 'styled-components';
import { colors, typography } from './theme';

export const OptionsContainer = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin: 0 0 1.5rem 0;
`;

// Vertical stack for big screen options
export const BigScreenOptionsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0 0 1.5rem 0;
`;

export const OptionButton = styled.button<{ $selected?: boolean }>`
  width: 100%;
  padding: 0.75rem 0.75rem;
  border: 1px solid ${colors.border};
  border-radius: 100px;
  background-color: ${props => props.$selected ? colors.primarySelected : colors.surface};
  color: ${props => props.$selected ? colors.surface : colors.typeMain};
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.semibold};
  line-height: ${typography.lineHeight.normal};
  text-align: center;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.05s ease;

  &:hover:not(:disabled) {
    background-color: ${props => props.$selected ? colors.primarySelected : colors.surfaceSecondary};
    border-color: ${colors.border};
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px ${colors.surfaceSecondary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

// Big screen option button with bigScreenOption typography
export const BigScreenOptionButton = styled.button`
  width: 100%;
  padding: 0.75rem 0.75rem;
  border: 1px solid ${colors.border};
  border-radius: 100px;
  background-color: ${colors.surface};
  color: ${colors.typeMain};
  font-family: ${typography.presets.bigScreenOption.fontFamily};
  font-size: ${typography.presets.bigScreenOption.fontSize};
  font-weight: ${typography.presets.bigScreenOption.fontWeight};
  line-height: ${typography.presets.bigScreenOption.lineHeight};
  text-align: center;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.05s ease;

  


  &:hover:not(:disabled) {
    background-color: ${colors.surfaceSecondary};
    border-color: ${colors.border};
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px ${colors.surfaceSecondary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.9;
  }
`;

