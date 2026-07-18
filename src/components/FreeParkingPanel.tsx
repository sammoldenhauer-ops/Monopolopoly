'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { fmt$ } from '@/lib/ui';

export default function FreeParkingPanel() {
  const { state, dispatch, activePlayers } = useGame();
  const [payoutPlayerId, setPayoutPlayerId] = useState('');
  const [done, setDone] = useState(false);

  const isFirstLanding = !state.firstFreeParkingLanderClaimed;

  function handlePayout() {
    if (!payoutPlayerId) return;
    dispatch({
      type: 'FREE_PARKING_PAYOUT',
      playerId: payoutPlayerId,
      isFirstEverLanding: isFirstLanding,
    });
    setPayoutPlayerId('');
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  // Manual pool contributions (e.g. from certain Chance/Community Chest cards)
  const [addAmount, setAddAmount] = useState('');
  const [addReason, setAddReason] = useState('');

  function handleAddToPool() {
    const n = parseInt(addAmount);
    if (isNaN(n) || n <= 0) return;
    dispatch({ type: 'ADD_LOG', action: 'Free Parking', detail: `$${n} added to pool: ${addReason || 'manual'}` });
    // We update freeParkingPool via a bank payment action
    // Since we don't have a direct pool-add action, we use a workaround:
    // Dispatch APPLY_TAX would be wrong, so we add an explicit BANK_CASH-like action.
    // Instead, track via ADD_LOG + direct pool manipulation via a custom approach.
    // For now, handle this in the reducer via an inline approach:
    dispatch({ type: 'ADD_TO_FREE_PARKING_POOL' as never, amount: n, reason: addReason || 'manual' } as never);
    setAddAmount('');
    setAddReason('');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Free Parking Pool</h2>

      <div className="bg-gray-800 rounded-lg p-4 border border-yellow-700 text-center">
        <div className="text-gray-400 text-sm mb-1">Current Pool</div>
        <div className="text-5xl font-bold text-yellow-400">{fmt$(state.freeParkingPool)}</div>
        {isFirstLanding && (
          <div className="mt-2 text-xs text-blue-300">
            ℹ Next landing also triggers MO #20: +$100 from bank (first-ever landing bonus)
          </div>
        )}
      </div>

      {/* Payout */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
        <h3 className="text-white font-semibold text-sm">Pay Out Pool to Player</h3>
        <div>
          <label className="text-gray-400 text-sm block mb-1">Player who landed on Free Parking</label>
          <select
            value={payoutPlayerId}
            onChange={e => setPayoutPlayerId(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">— select player —</option>
            {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {payoutPlayerId && (
          <div className="bg-gray-700 rounded p-2 text-sm text-gray-300">
            {activePlayers.find(p => p.id === payoutPlayerId)?.name} will receive{' '}
            <span className="text-yellow-400 font-bold">{fmt$(state.freeParkingPool)}</span>
            {isFirstLanding && (
              <span className="text-blue-300"> + $100 bank bonus (MO #20)</span>
            )}
          </div>
        )}
        <button
          onClick={handlePayout}
          disabled={!payoutPlayerId}
          className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded px-4 py-2 font-semibold transition-colors"
        >
          Pay Out Pool
        </button>
      </div>

      {done && (
        <div className="bg-green-900 border border-green-600 rounded-lg px-4 py-2 text-green-300 text-sm text-center">
          ✓ Pool paid out. Pool reset to $0.
        </div>
      )}

      {/* Manual add to pool (for future Chance/CC card effects etc) */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
        <h3 className="text-white font-semibold text-sm">Add to Pool (manual — e.g. card effect)</h3>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={addAmount}
            onChange={e => setAddAmount(e.target.value)}
            placeholder="Amount"
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          />
          <input
            value={addReason}
            onChange={e => setAddReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAddToPool}
            disabled={!addAmount || parseInt(addAmount) <= 0}
            className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded px-3 py-2 text-sm font-semibold"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
