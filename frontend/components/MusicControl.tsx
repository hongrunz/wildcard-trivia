'use client';

import { useState } from 'react';
import { MusicControlContainer, MusicButton, Tooltip, TooltipText, TooltipLine, TooltipLink } from './styled/MusicControlComponent';

interface MusicControlProps {
  isMuted: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'small' | 'normal';
}

export default function MusicControl({ isMuted, onToggle, disabled = false, size = 'normal' }: MusicControlProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <MusicControlContainer
      $topOffset={size === 'small' ? '0.75rem' : undefined}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <MusicButton
        onClick={onToggle}
        disabled={disabled}
        $isMuted={isMuted}
        $size={size}
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
