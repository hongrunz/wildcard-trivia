'use client';

import {
  PlayerHeaderBar,
  PlayerHeaderTriviImg,
  PlayerHeaderTitleWrap,
  PlayerHeaderTitleImg,
  TriviChatBubbleWrap,
  TriviChatBubbleTail,
  TriviChatBubble,
} from './styled/GameComponents';

interface PlayerHeaderProps {
  /** When set, shows a chat bubble from Trivi (e.g. "You are correct!!" or "Oops! That's incorrect.") */
  feedbackMessage?: string;
}

export default function PlayerHeader({ feedbackMessage }: PlayerHeaderProps) {
  return (
    <PlayerHeaderBar>
      <PlayerHeaderTriviImg src="/assets/Trivi_big_smile.svg" alt="Trivi" />
      {feedbackMessage != null && feedbackMessage !== '' && (
        <TriviChatBubbleWrap>
          <TriviChatBubbleTail aria-hidden />
          <TriviChatBubble>{feedbackMessage}</TriviChatBubble>
        </TriviChatBubbleWrap>
      )}
      <PlayerHeaderTitleWrap>
        <PlayerHeaderTitleImg src="/assets/game_title.svg" alt="Wildcard Trivia" />
      </PlayerHeaderTitleWrap>
    </PlayerHeaderBar>
  );
}
