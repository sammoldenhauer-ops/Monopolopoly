'use client';
import { GameProvider, useGame } from '@/lib/gameStore';
import SetupScreen from '@/components/SetupScreen';
import Dashboard from '@/components/Dashboard';

function AppContent() {
  const { state } = useGame();
  return state.phase === 'setup' ? <SetupScreen /> : <Dashboard />;
}

export default function Home() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

