import styled from 'styled-components';
import { colors, typography } from './theme';

export const MusicControlContainer = styled.div<{ $topOffset?: string }>`
  position: fixed;
  top: ${props => props.$topOffset || '1.5rem'};
  right: 1.5rem;
  z-index: 1000;
`;

export const MusicButton = styled.button<{ $isMuted: boolean; $size?: 'small' | 'normal' }>`
  width: ${props => props.$size === 'small' ? '2.5rem' : '3.5rem'};
  height: ${props => props.$size === 'small' ? '2.5rem' : '3.5rem'};
  border-radius: 50%;
  border: ${props => props.$size === 'small' ? '1.5px' : '2px'} solid ${colors.surface};
  background-color: ${colors.accent};
  opacity: 0.9;
  color: ${colors.surface};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${props => props.$size === 'small' ? '1.25rem' : typography.fontSize.displaylg};
  font-weight: ${typography.fontWeight.normal};
  line-height: ${typography.lineHeight.normal};
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;

  &:hover {
    background-color: ${colors.typeAccent};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Add slash effect when muted */
  ${props => {
    if (!props.$isMuted) return '';
    const slashWidth = props.$size === 'small' ? '1.75rem' : '2.5rem';
    return `
      &::after {
        content: '';
        position: absolute;
        width: ${slashWidth};
        height: 2px;
        background-color: ${colors.red[500]};
        transform: rotate(-45deg);
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
      }
    `;
  }}
`;

export const Tooltip = styled.div<{ $show: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background-color: ${colors.typeMain};
  color: ${colors.surface};
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-family: ${typography.presets.bodySmall.fontFamily};
  font-size: ${typography.presets.bodySmall.fontSize};
  font-weight: ${typography.presets.bodySmall.fontWeight};
  line-height: ${typography.presets.bodySmall.lineHeight};
  white-space: nowrap;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  opacity: ${props => props.$show ? 0.9 : 0};
  visibility: ${props => props.$show ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  pointer-events: none;
  z-index: 1001;

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    right: 1.5rem;
    border: 0.5rem solid transparent;
    border-bottom-color: ${colors.typeMain};
    opacity: 0.9;
  }
`;

export const TooltipText = styled.div`
  text-align: left;
`;

export const TooltipLine = styled.div`
  margin-bottom: 0.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const TooltipLink = styled.a`
  color: ${colors.blue[400]};
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;
