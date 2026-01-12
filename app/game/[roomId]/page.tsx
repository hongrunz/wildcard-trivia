'use client';

import { useParams } from 'next/navigation';
import PlayerGame from '../../../frontend/components/PlayerGame';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return <PlayerGame roomId={roomId} />;
}
