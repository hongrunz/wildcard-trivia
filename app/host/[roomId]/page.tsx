'use client';

import { useParams } from 'next/navigation';
import StartGame from '../../components/StartGame';

export default function HostStartPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return <StartGame roomId={roomId} />;
}

