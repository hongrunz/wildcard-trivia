import { Suspense } from 'react';
import JoinGame from '../components/JoinGame';

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-800 flex items-center justify-center text-white">Loading...</div>}>
      <JoinGame />
    </Suspense>
  );
}

