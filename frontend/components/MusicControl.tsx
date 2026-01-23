'use client';

import styled from 'styled-components';
import { useState } from 'react';

const MusicControlContainer = styled.div`
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 1000;
`;

const MusicButton = styled.button<{ $isMuted: boolean }>`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  border: 2px solid #ffffff;
  background-color: rgba(59, 130, 246, 0.9);
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;

  &:hover {
    background-color: rgba(37, 99, 235, 1);
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
  ${props => props.$isMuted && `
    &::after {
      content: '';
      position: absolute;
      width: 2.5rem;
      height: 2px;
      background-color: #ef4444;
      transform: rotate(-45deg);
      box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    }
  `}
`;

const Tooltip = styled.div<{ $show: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background-color: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: nowrap;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  opacity: ${props => props.$show ? 1 : 0};
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
    border-bottom-color: rgba(0, 0, 0, 0.9);
  }
`;

const TooltipText = styled.div`
  text-align: left;
`;

const TooltipLine = styled.div`
  margin-bottom: 0.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const TooltipLink = styled.a`
  color: #60a5fa;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

interface MusicControlProps {
  isMuted: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function MusicControl({ isMuted, onToggle, disabled = false }: MusicControlProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <MusicControlContainer
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <MusicButton
        onClick={onToggle}
        disabled={disabled}
        $isMuted={isMuted}
        aria-label={isMuted ? 'Unmute music' : 'Mute music'}
      >
        ♪
      </MusicButton>
      <Tooltip $show={showTooltip}>
        <TooltipText>
          <TooltipLine><strong>Music track:</strong> Foreign by Moavii</TooltipLine>
          <TooltipLine><strong>Source:</strong> <TooltipLink href="https://freetouse.com/music" target="_blank" rel="noopener noreferrer">freetouse.com/music</TooltipLink></TooltipLine>
          <TooltipLine>Vlog Music for Video (Free Download)</TooltipLine>
        </TooltipText>
      </Tooltip>
    </MusicControlContainer>
  );
}
