'use client';
import { useGame } from '@/lib/gameStore';
import { formatTimestamp } from '@/lib/ui';

export default function GameLog() {
  const { state } = useGame();
  const entries = [...state.log].reverse();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">Game Log</h2>
      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {entries.length === 0 && (
          <div className="text-gray-500 text-sm italic">No actions yet.</div>
        )}
        {entries.map(entry => (
          <div key={entry.id} className="bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700">
            <div className="flex items-baseline gap-2">
              <span className="text-gray-500 text-xs font-mono shrink-0">{formatTimestamp(entry.timestamp)}</span>
              <span className="text-blue-300 font-medium shrink-0">{entry.action}</span>
            </div>
            <div className="text-gray-300 mt-0.5">{entry.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
