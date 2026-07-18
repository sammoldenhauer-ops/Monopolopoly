'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { fmt$ } from '@/lib/ui';

export default function AuctionPanel() {
  const { state, dispatch, activePlayers } = useGame();
  const [propertyId, setPropertyId] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);

  const unownedProps = state.properties.filter(p => p.ownerId === null);

  function handleSubmit() {
    const amtNum = parseInt(amount);
    if (!propertyId || !winnerId || isNaN(amtNum) || amtNum < 0) return;
    dispatch({ type: 'RECORD_AUCTION', propertyId, winnerId, amount: amtNum });
    setPropertyId('');
    setWinnerId('');
    setAmount('');
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  const selectedProp = state.properties.find(p => p.id === propertyId);
  const winner = activePlayers.find(p => p.id === winnerId);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Auction Panel</h2>
      <p className="text-gray-400 text-sm">
        Record an auction result. Cash is deducted from the winner and the property is assigned.
        Auction counter is incremented for Market Opportunity tracking.
      </p>

      <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
        <div>
          <label className="text-gray-400 text-sm block mb-1">Property being auctioned</label>
          <select
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">— select unowned property —</option>
            {unownedProps.map(p => (
              <option key={p.id} value={p.id}>{p.name} (listed: {fmt$(p.price)})</option>
            ))}
          </select>
          {unownedProps.length === 0 && (
            <p className="text-gray-500 text-xs mt-1">No unowned properties available.</p>
          )}
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">Auction winner</label>
          <select
            value={winnerId}
            onChange={e => setWinnerId(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">— select player —</option>
            {activePlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name} (cash: {fmt$(p.cash)})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">Winning bid amount</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
            placeholder="e.g. 150"
          />
        </div>

        {/* Preview */}
        {selectedProp && winner && amount && (
          <div className="bg-gray-700 rounded p-3 text-sm space-y-1">
            <div className="text-gray-300">
              <span className="text-white font-medium">{winner.name}</span> buys{' '}
              <span className="text-white font-medium">{selectedProp.name}</span> for{' '}
              <span className="text-green-400 font-bold">{fmt$(parseInt(amount) || 0)}</span>
            </div>
            <div className="text-gray-400">
              {winner.name} cash: {fmt$(winner.cash)} → {fmt$(winner.cash - (parseInt(amount) || 0))}
              {(winner.cash - (parseInt(amount) || 0)) < 0 && (
                <span className="text-red-400 ml-2">⚠ Insufficient funds!</span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!propertyId || !winnerId || !amount || parseInt(amount) < 0}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded px-4 py-2 font-semibold transition-colors"
        >
          Record Auction
        </button>
      </div>

      {done && (
        <div className="bg-green-900 border border-green-600 rounded-lg px-4 py-2 text-green-300 text-sm text-center">
          ✓ Auction recorded!
        </div>
      )}
    </div>
  );
}
