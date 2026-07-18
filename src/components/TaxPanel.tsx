'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { calculateTax, calcNetWorth } from '@/lib/engine';
import { fmt$ } from '@/lib/ui';

export default function TaxPanel() {
  const { state, dispatch } = useGame();
  const [preview, setPreview] = useState(false);

  const entries = calculateTax(state);
  const totalTax = entries.reduce((sum, e) => sum + e.taxOwed, 0);
  const totalActual = entries.reduce((sum, e) => sum + Math.min(e.taxOwed, e.player.cash), 0);
  const hasShortfall = entries.some(e => e.shortfall > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Net-Worth Tax</h2>
        <span className="text-gray-400 text-sm">Rotation #{state.turnRotationCount + 1}</span>
      </div>
      <p className="text-gray-400 text-sm">
        Triggered after all active players complete a turn rotation.
        1st place: 10%, 2nd: 8%, 3rd: 6%, all others: 5%.
        Collected amount goes into the Free Parking pool.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => setPreview(p => !p)}
          className="flex-1 bg-blue-700 hover:bg-blue-600 text-white rounded px-4 py-2 font-semibold transition-colors"
        >
          {preview ? 'Hide Preview' : 'Preview Tax'}
        </button>
        {preview && (
          <button
            onClick={() => { dispatch({ type: 'APPLY_TAX' }); setPreview(false); }}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded px-4 py-2 font-semibold transition-colors"
          >
            Apply Tax
          </button>
        )}
      </div>

      {preview && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-3 py-2 bg-gray-700 text-gray-300 text-xs font-medium grid grid-cols-5 gap-2">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Net Worth</span>
            <span className="text-right">Tax ({'>'}rate)</span>
            <span className="text-right">Cash After</span>
          </div>
          {entries.map((e, i) => (
            <div
              key={e.player.id}
              className={`px-3 py-2 text-sm grid grid-cols-5 gap-2 border-t border-gray-700 ${e.shortfall > 0 ? 'bg-red-900/20' : ''}`}
            >
              <span className="text-gray-400">#{i + 1}</span>
              <span className="text-white font-medium truncate">{e.player.name}</span>
              <span className="text-right text-gray-300">{fmt$(e.netWorth)}</span>
              <span className="text-right text-red-400">
                −{fmt$(e.taxOwed)} <span className="text-gray-500">({Math.round(e.taxRate * 100)}%)</span>
              </span>
              <span className={`text-right font-bold ${e.shortfall > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {fmt$(e.cashAfter)}
                {e.shortfall > 0 && <span className="block text-xs text-red-300">⚠ short ${e.shortfall}</span>}
              </span>
            </div>
          ))}
          <div className="px-3 py-2 bg-gray-700 text-sm border-t border-gray-600 flex justify-between">
            <span className="text-gray-400">Total collected → Free Parking</span>
            <span className="text-yellow-400 font-bold">
              {hasShortfall ? `${fmt$(totalActual)} (of ${fmt$(totalTax)})` : fmt$(totalTax)}
            </span>
          </div>
        </div>
      )}

      {hasShortfall && preview && (
        <div className="bg-red-900 border border-red-600 rounded-lg p-3 text-red-200 text-sm">
          ⚠ One or more players cannot afford their full tax. Apply Tax will deduct what they have (down to $0).
          You may want to resolve bankruptcies manually before applying.
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex items-center justify-between">
        <span className="text-gray-400 text-sm">Current Free Parking Pool</span>
        <span className="text-yellow-400 font-bold text-xl">{fmt$(state.freeParkingPool)}</span>
      </div>
    </div>
  );
}
