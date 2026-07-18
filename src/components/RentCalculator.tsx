'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { calculateRent } from '@/lib/engine';
import { fmt$ } from '@/lib/ui';

export default function RentCalculator() {
  const { state, dispatch, activePlayers } = useGame();
  const [propertyId, setPropertyId] = useState('');
  const [payerId, setPayerId] = useState('');
  const [diceRoll, setDiceRoll] = useState('');
  const [result, setResult] = useState<ReturnType<typeof calculateRent> | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const selectedProp = state.properties.find(p => p.id === propertyId);

  function handleCalculate() {
    if (!selectedProp || !payerId) return;
    const dice = diceRoll ? parseInt(diceRoll) : undefined;
    const r = calculateRent(selectedProp, payerId, state, dice);
    setResult(r);
    setConfirmed(false);
  }

  function handleConfirm() {
    if (!result || !selectedProp || !payerId) return;
    dispatch({
      type: 'PAY_RENT',
      propertyId,
      payerId,
      amount: result.finalAmount,
      diceRoll: diceRoll ? parseInt(diceRoll) : undefined,
    });
    // track rent-collected-from for Corporate Sponsor / MO
    setResult(null);
    setPropertyId('');
    setPayerId('');
    setDiceRoll('');
    setConfirmed(true);
  }

  const ownedProps = state.properties.filter(p => p.ownerId !== null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Rent / Payment Calculator</h2>

      <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
        <div>
          <label className="text-gray-400 text-sm block mb-1">Property landed on</label>
          <select
            value={propertyId}
            onChange={e => { setPropertyId(e.target.value); setResult(null); }}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">— select property —</option>
            {ownedProps.map(p => {
              const owner = state.players.find(pl => pl.id === p.ownerId);
              return (
                <option key={p.id} value={p.id}>
                  {p.name}{p.isMortgaged ? ' [MORTGAGED]' : ''} — owned by {owner?.name}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">Landing player (payer)</label>
          <select
            value={payerId}
            onChange={e => { setPayerId(e.target.value); setResult(null); }}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">— select player —</option>
            {activePlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedProp?.group === 'Utility' && (
          <div>
            <label className="text-gray-400 text-sm block mb-1">Dice roll total (required for utility)</label>
            <input
              type="number"
              min={2}
              max={12}
              value={diceRoll}
              onChange={e => { setDiceRoll(e.target.value); setResult(null); }}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              placeholder="e.g. 7"
            />
          </div>
        )}

        <button
          onClick={handleCalculate}
          disabled={!propertyId || !payerId}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded px-4 py-2 font-semibold transition-colors"
        >
          Calculate Rent
        </button>
      </div>

      {result && (
        <div className="bg-gray-800 rounded-lg p-4 border border-blue-700 space-y-3">
          <div className="text-center">
            <div className="text-gray-400 text-sm">Amount owed</div>
            <div className="text-3xl font-bold text-white">{fmt$(result.finalAmount)}</div>
          </div>

          {result.diceRollNeeded && (
            <div className="text-yellow-400 text-sm text-center">⚠ Enter dice roll above to calculate utility rent.</div>
          )}

          <div className="text-xs text-gray-400 space-y-1">
            {result.breakdown.map((line, i) => (
              <div key={i} className="font-mono">{line}</div>
            ))}
          </div>

          {result.finalAmount > 0 && !result.diceRollNeeded && (
            <button
              onClick={handleConfirm}
              className="w-full bg-green-600 hover:bg-green-500 text-white rounded px-4 py-2 font-semibold transition-colors"
            >
              ✓ Confirm — Transfer {fmt$(result.finalAmount)}
            </button>
          )}
          {result.finalAmount === 0 && (
            <div className="text-center text-gray-400 text-sm">No payment needed.</div>
          )}
        </div>
      )}

      {confirmed && (
        <div className="bg-green-900 border border-green-600 rounded-lg px-4 py-2 text-green-300 text-sm text-center">
          ✓ Payment applied!
        </div>
      )}
    </div>
  );
}
