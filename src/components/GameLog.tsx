'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { formatTimestamp } from '@/lib/ui';

export default function GameLog() {
  const { state, dispatch } = useGame();
  const [pendingUndo, setPendingUndo] = useState(false);
  const entries = [...state.log].reverse();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">Game Log</h2>
      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {entries.length === 0 && (
          <div className="text-gray-500 text-sm italic">No actions yet.</div>
        )}
        {entries.map((entry, index) => {
          const isMostRecent = index === 0;
          return (
            <div key={entry.id} className="bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-500 text-xs font-mono shrink-0">{formatTimestamp(entry.timestamp)}</span>
                    <span className="text-blue-300 font-medium shrink-0">{entry.action}</span>
                  </div>
                  <div className="text-gray-300 mt-0.5">{entry.detail}</div>
                </div>
                {isMostRecent && state.undoState && (
                  <div className="shrink-0 flex items-center gap-2">
                    {pendingUndo ? (
                      <>
                        <button
                          onClick={() => {
                            dispatch({ type: 'UNDO_LAST_ACTION' });
                            setPendingUndo(false);
                          }}
                          className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                          title="Confirm undo"
                        >
                          Confirm Undo
                        </button>
                        <button
                          onClick={() => setPendingUndo(false)}
                          className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1 rounded"
                          title="Cancel undo"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setPendingUndo(true)}
                        className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                        title="Undo the most recent action"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
