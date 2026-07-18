'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';

export default function SetupScreen() {
  const { dispatch } = useGame();
  const [names, setNames] = useState<string[]>(['', '', '', '', '', '', '']);

  function updateName(i: number, val: string) {
    setNames(prev => { const n = [...prev]; n[i] = val; return n; });
  }

  const valid = names.every(n => n.trim().length > 0);

  function handleStart() {
    if (!valid) return;
    dispatch({ type: 'START_GAME', playerNames: names.map(n => n.trim()) });
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Monopoly Scorekeeper</h1>
          <p className="text-gray-400 text-sm mt-1">Enter the names of all 7 players to begin.</p>
        </div>

        <div className="space-y-2">
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-500 text-sm w-6 text-right">{i + 1}.</span>
              <input
                type="text"
                value={name}
                onChange={e => updateName(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && valid) handleStart(); }}
                placeholder={`Player ${i + 1}`}
                className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={!valid}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 font-bold text-base transition-colors"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
