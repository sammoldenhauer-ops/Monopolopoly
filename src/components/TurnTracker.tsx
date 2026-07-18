'use client';
import { useEffect, useState } from 'react';
import { useGame } from '@/lib/gameStore';

export default function TurnTracker({ onJumpToTax }: { onJumpToTax: () => void }) {
  const { state, dispatch, activePlayers } = useGame();
  const [dismissed, setDismissed] = useState(false);

  // Re-show the tax-ready banner whenever a new rotation completes
  useEffect(() => {
    if (state.rotationReadyForTax) setDismissed(false);
  }, [state.rotationReadyForTax]);

  if (activePlayers.length === 0) return null;

  const takenIds = new Set(state.turnsTakenThisRotation);

  return (
    <div className="bg-gray-850 bg-gray-800/60 border-b border-gray-700 px-4 py-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500 text-xs uppercase tracking-wide shrink-0">Turn:</span>
        {activePlayers.map(p => {
          const isActive = state.activePlayerId === p.id;
          const hasGone = takenIds.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_PLAYER', playerId: p.id })}
              className={`relative text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : hasGone
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
              title={hasGone ? `${p.name} — turn taken this rotation` : `${p.name} — set as active player`}
            >
              {hasGone && <span className="mr-1">✓</span>}
              {p.name}
            </button>
          );
        })}
        <button
          onClick={() => dispatch({ type: 'END_TURN' })}
          className="text-xs px-3 py-1 rounded-full bg-green-700 hover:bg-green-600 text-white font-semibold shrink-0"
          title="Mark current player's turn done and advance to the next player"
        >
          End Turn →
        </button>
      </div>

      {state.rotationReadyForTax && !dismissed && (
        <div className="flex items-center justify-between gap-2 bg-yellow-900 border border-yellow-600 rounded px-3 py-1.5">
          <span className="text-yellow-200 text-xs">
            ⚡ Full rotation complete — Net-Worth Tax is ready to run.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onJumpToTax}
              className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-2 py-1 rounded font-semibold"
            >
              Go to Tax →
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-yellow-300 hover:text-yellow-100 text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
