'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { calcNetWorth, rankPlayersByNetWorth } from '@/lib/engine';
import { fmt$ } from '@/lib/ui';

type Step = 'select' | 'cash' | 'properties' | 'team' | 'done';

export default function EliminationPanel() {
  const { state, dispatch, activePlayers } = useGame();
  const [step, setStep] = useState<Step>('select');
  const [eliminatedId, setEliminatedId] = useState('');
  const [causingPlayerId, setCausingPlayerId] = useState('');
  const [propertyAuctions, setPropertyAuctions] = useState<Record<string, { winnerId: string; amount: string }>>({});
  const [teamAcquirerId, setTeamAcquirerId] = useState('');

  const eliminated = state.players.find(p => p.id === eliminatedId);
  const causingPlayer = state.players.find(p => p.id === causingPlayerId);
  const eliminatedProps = state.properties.filter(p => p.ownerId === eliminatedId);
  const isFirstElimination = state.eliminationCount === 0;

  // Last place (for auto-assign on first elimination)
  const ranked = rankPlayersByNetWorth(activePlayers.filter(p => p.id !== eliminatedId), state.properties);
  const lastPlace = ranked[ranked.length - 1];

  function startElimination() {
    if (!eliminatedId) return;
    dispatch({ type: 'ELIMINATE_PLAYER', playerId: eliminatedId, causingPlayerId: causingPlayerId || null });
    // Initialize auction entries for each property
    const auctions: Record<string, { winnerId: string; amount: string }> = {};
    eliminatedProps.forEach(p => { auctions[p.id] = { winnerId: '', amount: '' }; });
    setPropertyAuctions(auctions);
    setStep('properties');
  }

  function handlePropertyAuction(propId: string) {
    const entry = propertyAuctions[propId];
    if (!entry || !entry.winnerId || !entry.amount) return;
    dispatch({ type: 'RECORD_AUCTION', propertyId: propId, winnerId: entry.winnerId, amount: parseInt(entry.amount) });
    setPropertyAuctions(prev => {
      const next = { ...prev };
      delete next[propId];
      return next;
    });
  }

  function handleAllAuctionsDone() {
    if (isFirstElimination) {
      // Auto-assign to last place
      if (lastPlace) {
        dispatch({ type: 'ASSIGN_TEAM', eliminatedPlayerId: eliminatedId, acquiringPlayerId: lastPlace.id });
      }
      setStep('done');
    } else {
      setStep('team');
    }
  }

  function handleTeamAssign() {
    if (!teamAcquirerId) return;
    dispatch({ type: 'ASSIGN_TEAM', eliminatedPlayerId: eliminatedId, acquiringPlayerId: teamAcquirerId });
    setStep('done');
  }

  function reset() {
    setStep('select');
    setEliminatedId('');
    setCausingPlayerId('');
    setPropertyAuctions({});
    setTeamAcquirerId('');
  }

  const remainingAuctionProps = Object.keys(propertyAuctions);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Elimination & Team Panel</h2>

      {step === 'select' && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-red-900">
          <p className="text-gray-400 text-sm">
            Mark a player as bankrupt/eliminated. Their cash goes to the causing player,
            their properties are re-auctioned, and they join a team.
          </p>

          <div>
            <label className="text-gray-400 text-sm block mb-1">Player being eliminated</label>
            <select
              value={eliminatedId}
              onChange={e => setEliminatedId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600"
            >
              <option value="">— select player —</option>
              {activePlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (cash: {fmt$(p.cash)}, NW: {fmt$(calcNetWorth(p, state.properties))})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-1">Caused by (receives cash) — leave blank if bank/card</label>
            <select
              value={causingPlayerId}
              onChange={e => setCausingPlayerId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600"
            >
              <option value="">— bank / Chance / CC (no player) —</option>
              {activePlayers.filter(p => p.id !== eliminatedId).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {eliminatedId && (
            <div className="bg-gray-700 rounded p-3 text-sm space-y-1">
              <div className="text-white font-medium">{eliminated?.name}</div>
              <div className="text-gray-300">Cash: {fmt$(eliminated?.cash ?? 0)} → {causingPlayer ? causingPlayer.name : 'bank'}</div>
              <div className="text-gray-300">Properties ({eliminatedProps.length}): {eliminatedProps.map(p => p.name).join(', ') || 'none'}</div>
              <div className="text-blue-300 text-xs">
                {isFirstElimination
                  ? `First elimination — will auto-join ${lastPlace?.name ?? '?'} (last place)`
                  : 'Not first elimination — will be auctioned to a team'}
              </div>
            </div>
          )}

          <button
            onClick={startElimination}
            disabled={!eliminatedId}
            className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
          >
            Start Elimination Flow
          </button>
        </div>
      )}

      {step === 'properties' && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-orange-700">
          <h3 className="text-white font-semibold">Step: Auction {eliminated?.name}'s Properties</h3>
          <p className="text-gray-400 text-sm">
            Auction each property individually. Enter winner + amount and click Record for each.
          </p>

          {remainingAuctionProps.length === 0 && (
            <div className="text-green-400 text-sm">All properties auctioned!</div>
          )}

          {state.properties
            .filter(p => remainingAuctionProps.includes(p.id))
            .map(prop => (
              <div key={prop.id} className="bg-gray-700 rounded p-3 space-y-2">
                <div className="text-white font-medium text-sm">{prop.name} <span className="text-gray-400">(listed: {fmt$(prop.price)})</span></div>
                <div className="flex gap-2">
                  <select
                    value={propertyAuctions[prop.id]?.winnerId ?? ''}
                    onChange={e => setPropertyAuctions(prev => ({
                      ...prev,
                      [prop.id]: { ...prev[prop.id], winnerId: e.target.value }
                    }))}
                    className="flex-1 bg-gray-600 text-white rounded px-2 py-1.5 text-sm border border-gray-500"
                  >
                    <option value="">— winner —</option>
                    {activePlayers.filter(p => p.id !== eliminatedId).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({fmt$(p.cash)})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    placeholder="Bid $"
                    value={propertyAuctions[prop.id]?.amount ?? ''}
                    onChange={e => setPropertyAuctions(prev => ({
                      ...prev,
                      [prop.id]: { ...prev[prop.id], amount: e.target.value }
                    }))}
                    className="w-24 bg-gray-600 text-white rounded px-2 py-1.5 text-sm border border-gray-500"
                  />
                  <button
                    onClick={() => handlePropertyAuction(prop.id)}
                    disabled={!propertyAuctions[prop.id]?.winnerId || !propertyAuctions[prop.id]?.amount}
                    className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded px-3 py-1.5 text-sm font-semibold"
                  >
                    Record
                  </button>
                </div>
              </div>
            ))}

          <button
            onClick={handleAllAuctionsDone}
            className="w-full bg-orange-700 hover:bg-orange-600 text-white rounded px-4 py-2 font-semibold"
          >
            Done — Proceed to Team Assignment →
          </button>
        </div>
      )}

      {step === 'team' && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-purple-700">
          <h3 className="text-white font-semibold">Step: Team Assignment (Auction)</h3>
          <p className="text-gray-400 text-sm">
            This is elimination #{state.eliminationCount}. {eliminated?.name} is auctioned off as a teammate.
            Record which player won the team auction.
          </p>

          <div>
            <label className="text-gray-400 text-sm block mb-1">Acquiring player (team auction winner)</label>
            <select
              value={teamAcquirerId}
              onChange={e => setTeamAcquirerId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600"
            >
              <option value="">— select —</option>
              {activePlayers.filter(p => p.id !== eliminatedId).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleTeamAssign}
            disabled={!teamAcquirerId}
            className="w-full bg-purple-700 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
          >
            Assign to Team
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-green-900 border border-green-600 rounded-lg p-4 space-y-3">
          <div className="text-green-300 font-semibold">✓ Elimination complete!</div>
          <p className="text-green-200 text-sm">
            {eliminated?.name} has been eliminated and their assets have been distributed.
          </p>
          <button
            onClick={reset}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
          >
            Start New Elimination Flow
          </button>
        </div>
      )}
    </div>
  );
}
