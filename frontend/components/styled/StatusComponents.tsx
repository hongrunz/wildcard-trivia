import styled from 'styled-components';
import { colors, typography } from './theme';

// Success status text
export const SuccessText = styled.div`
  color: ${colors.green[600]};
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.semibold};
  line-height: ${typography.lineHeight.normal};
`;

// Muted text for empty states
export const MutedText = styled.div`
  color: ${colors.typeMain};
  font-family: ${typography.presets.bodySmall.fontFamily};
  font-size: ${typography.presets.bodySmall.fontSize};
  font-weight: ${typography.presets.bodySmall.fontWeight};
  line-height: ${typography.presets.bodySmall.lineHeight};
`;

// Centered loading/message container
export const CenteredMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${colors.surface};
  font-family: ${typography.fontFamily.dmSans};
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.normal};
  line-height: ${typography.lineHeight.normal};
`;
