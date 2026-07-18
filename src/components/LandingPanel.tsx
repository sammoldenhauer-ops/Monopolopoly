'use client';
import { useState, useMemo } from 'react';
import { useGame } from '@/lib/gameStore';
import { calculateRent, goPayoutAmount } from '@/lib/engine';
import { GROUP_COLORS, GROUP_LABEL, fmt$ } from '@/lib/ui';
import type { PropertyGroup } from '@/lib/types';

const GROUP_ORDER: PropertyGroup[] = [
  'Brown', 'LightBlue', 'Pink', 'Orange', 'Red', 'Yellow', 'Green', 'DarkBlue', 'Railroad', 'Utility',
];

type SpaceSelection =
  | { kind: 'property'; propertyId: string }
  | { kind: 'go' }
  | { kind: 'jail' }
  | { kind: 'free_parking' }
  | { kind: 'chance' }
  | { kind: 'community_chest' }
  | null;

export default function LandingPanel({ onNavigateToTax }: { onNavigateToTax: () => void }) {
  const { state, dispatch, activePlayers } = useGame();
  const [playerId, setPlayerId] = useState<string>('');
  const [space, setSpace] = useState<SpaceSelection>(null);
  const [diceRoll, setDiceRoll] = useState('');
  const [auctionWinnerId, setAuctionWinnerId] = useState('');
  const [auctionAmount, setAuctionAmount] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Default the landing player to the current active player, but allow override
  const effectivePlayerId = playerId || state.activePlayerId || '';
  const landingPlayer = state.players.find(p => p.id === effectivePlayerId);

  const selectedProp = space?.kind === 'property'
    ? state.properties.find(p => p.id === space.propertyId) ?? null
    : null;

  const rentResult = useMemo(() => {
    if (!selectedProp || !effectivePlayerId || !selectedProp.ownerId || selectedProp.ownerId === effectivePlayerId) return null;
    const dice = diceRoll ? parseInt(diceRoll) : undefined;
    return calculateRent(selectedProp, effectivePlayerId, state, dice);
  }, [selectedProp, effectivePlayerId, diceRoll, state]);

  function resetSpace() {
    setSpace(null);
    setDiceRoll('');
    setAuctionWinnerId('');
    setAuctionAmount('');
  }

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }

  function handleConfirmRent() {
    if (!rentResult || !selectedProp || !effectivePlayerId) return;
    dispatch({
      type: 'PAY_RENT',
      propertyId: selectedProp.id,
      payerId: effectivePlayerId,
      amount: rentResult.finalAmount,
      diceRoll: diceRoll ? parseInt(diceRoll) : undefined,
    });
    flash(`✓ Rent paid: ${fmt$(rentResult.finalAmount)}`);
    resetSpace();
  }

  function handleAuction() {
    if (!selectedProp || !auctionWinnerId || !auctionAmount) return;
    const amt = parseInt(auctionAmount);
    if (isNaN(amt) || amt < 0) return;
    dispatch({ type: 'RECORD_AUCTION', propertyId: selectedProp.id, winnerId: auctionWinnerId, amount: amt });
    flash(`✓ Auction recorded: ${selectedProp.name} → ${fmt$(amt)}`);
    resetSpace();
  }

  function handlePassGo() {
    if (!effectivePlayerId) return;
    dispatch({ type: 'PASS_GO', playerId: effectivePlayerId });
    flash('✓ Passed GO recorded');
    resetSpace();
  }

  function handleJail() {
    if (!effectivePlayerId) return;
    dispatch({ type: 'GO_TO_JAIL', playerId: effectivePlayerId });
    flash('✓ Sent to Jail');
    resetSpace();
  }

  function handleFreeParking() {
    if (!effectivePlayerId) return;
    dispatch({
      type: 'FREE_PARKING_PAYOUT',
      playerId: effectivePlayerId,
      isFirstEverLanding: !state.firstFreeParkingLanderClaimed,
    });
    flash('✓ Free Parking pool paid out');
    resetSpace();
  }

  function handleDrawCard(cardType: 'chance' | 'community_chest') {
    if (!effectivePlayerId) return;
    dispatch({ type: 'DRAW_CARD', playerId: effectivePlayerId, cardType });
    flash(`✓ ${cardType === 'chance' ? 'Chance' : 'Community Chest'} draw recorded`);
    resetSpace();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Landing — Quick Action</h2>
      <p className="text-gray-400 text-sm">
        Pick who landed, then pick the space. The right action (rent, auction, GO, jail, free parking, card draw) shows automatically.
      </p>

      {/* Player selector */}
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <label className="text-gray-400 text-sm block mb-1">Player who landed</label>
        <select
          value={effectivePlayerId}
          onChange={e => { setPlayerId(e.target.value); resetSpace(); }}
          className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          <option value="">— select player —</option>
          {activePlayers.map(p => (
            <option key={p.id} value={p.id}>{p.name} (cash: {fmt$(p.cash)})</option>
          ))}
        </select>
      </div>

      {/* Special spaces */}
      <div className="flex flex-wrap gap-2">
        {[
          { kind: 'go' as const, label: '➡️ GO' },
          { kind: 'jail' as const, label: '🚔 Go to Jail' },
          { kind: 'free_parking' as const, label: '🅿️ Free Parking' },
          { kind: 'chance' as const, label: '❓ Chance' },
          { kind: 'community_chest' as const, label: '📦 Community Chest' },
        ].map(s => (
          <button
            key={s.kind}
            onClick={() => setSpace(space?.kind === s.kind ? null : { kind: s.kind })}
            disabled={!effectivePlayerId}
            className={`text-sm px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              space?.kind === s.kind ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Property grid grouped by color */}
      <div className="space-y-2">
        {GROUP_ORDER.map(group => {
          const props = state.properties.filter(p => p.group === group);
          return (
            <div key={group} className="flex items-center gap-1.5 flex-wrap">
              <span className={`${GROUP_COLORS[group].bg} ${GROUP_COLORS[group].text} text-xs px-1.5 py-0.5 rounded shrink-0 w-20 text-center`}>
                {GROUP_LABEL[group]}
              </span>
              {props.map(p => {
                const isSelected = space?.kind === 'property' && space.propertyId === p.id;
                const owner = p.ownerId ? state.players.find(pl => pl.id === p.ownerId) : null;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSpace(isSelected ? null : { kind: 'property', propertyId: p.id })}
                    disabled={!effectivePlayerId}
                    className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : owner
                        ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-800 border-dashed border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                    title={owner ? `Owned by ${owner.name}` : 'Unowned'}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Contextual action card */}
      {space?.kind === 'property' && selectedProp && (
        <div className="bg-gray-800 rounded-lg p-4 border border-blue-700 space-y-3">
          <div className="text-white font-semibold">{selectedProp.name}</div>

          {!selectedProp.ownerId && (
            <div className="space-y-2">
              <div className="text-gray-400 text-sm">Unowned — record auction result</div>
              <select
                value={auctionWinnerId}
                onChange={e => setAuctionWinnerId(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600"
              >
                <option value="">— auction winner —</option>
                {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({fmt$(p.cash)})</option>)}
              </select>
              <input
                type="number"
                min={0}
                value={auctionAmount}
                onChange={e => setAuctionAmount(e.target.value)}
                placeholder="Winning bid $"
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600"
              />
              <button
                onClick={handleAuction}
                disabled={!auctionWinnerId || !auctionAmount}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
              >
                Record Auction
              </button>
            </div>
          )}

          {selectedProp.ownerId === effectivePlayerId && (
            <div className="text-green-400 text-sm">✓ {landingPlayer?.name} already owns this — no rent due.</div>
          )}

          {selectedProp.ownerId && selectedProp.ownerId !== effectivePlayerId && (
            <div className="space-y-2">
              {selectedProp.group === 'Utility' && (
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={diceRoll}
                  onChange={e => setDiceRoll(e.target.value)}
                  placeholder="Dice roll total (e.g. 7)"
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600"
                />
              )}
              {rentResult && (
                <>
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">Amount owed</div>
                    <div className="text-3xl font-bold text-white">{fmt$(rentResult.finalAmount)}</div>
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    {rentResult.breakdown.map((line, i) => <div key={i} className="font-mono">{line}</div>)}
                  </div>
                  {rentResult.diceRollNeeded && (
                    <div className="text-yellow-400 text-xs text-center">⚠ Enter dice roll to calculate.</div>
                  )}
                  {!rentResult.diceRollNeeded && rentResult.finalAmount > 0 && (
                    <button
                      onClick={handleConfirmRent}
                      className="w-full bg-green-600 hover:bg-green-500 text-white rounded px-4 py-2 font-semibold"
                    >
                      ✓ Confirm — Transfer {fmt$(rentResult.finalAmount)}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {space?.kind === 'go' && (
        <div className="bg-gray-800 rounded-lg p-4 border border-green-700 space-y-2">
          <div className="text-gray-300 text-sm">
            {landingPlayer?.name} passes GO and collects{' '}
            <span className="text-green-400 font-bold">{fmt$(landingPlayer ? goPayoutAmount(landingPlayer) : 200)}</span>
          </div>
          <button onClick={handlePassGo} className="w-full bg-green-700 hover:bg-green-600 text-white rounded px-4 py-2 font-semibold">
            Confirm Pass GO
          </button>
        </div>
      )}

      {space?.kind === 'jail' && (
        <div className="bg-gray-800 rounded-lg p-4 border border-red-800 space-y-2">
          <div className="text-gray-300 text-sm">Send {landingPlayer?.name} to Jail (blocked automatically if they have Diplomatic Immunity).</div>
          <button onClick={handleJail} className="w-full bg-red-800 hover:bg-red-700 text-white rounded px-4 py-2 font-semibold">
            Confirm Go to Jail
          </button>
        </div>
      )}

      {space?.kind === 'free_parking' && (
        <div className="bg-gray-800 rounded-lg p-4 border border-yellow-700 space-y-2">
          <div className="text-gray-300 text-sm">
            {landingPlayer?.name} collects the Free Parking pool:{' '}
            <span className="text-yellow-400 font-bold">{fmt$(state.freeParkingPool)}</span>
            {!state.firstFreeParkingLanderClaimed && <span className="text-blue-300"> + $100 bank bonus (first-ever landing)</span>}
          </div>
          <button onClick={handleFreeParking} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white rounded px-4 py-2 font-semibold">
            Confirm Free Parking Payout
          </button>
        </div>
      )}

      {(space?.kind === 'chance' || space?.kind === 'community_chest') && (
        <div className="bg-gray-800 rounded-lg p-4 border border-purple-700 space-y-2">
          <div className="text-gray-300 text-sm">
            Record {landingPlayer?.name} drawing a {space.kind === 'chance' ? 'Chance' : 'Community Chest'} card.
          </div>
          <button
            onClick={() => handleDrawCard(space.kind === 'chance' ? 'chance' : 'community_chest')}
            className="w-full bg-purple-700 hover:bg-purple-600 text-white rounded px-4 py-2 font-semibold"
          >
            Confirm Card Draw
          </button>
        </div>
      )}

      {message && (
        <div className="bg-green-900 border border-green-600 rounded-lg px-4 py-2 text-green-300 text-sm text-center">
          {message}
        </div>
      )}

      {state.rotationReadyForTax && (
        <button
          onClick={onNavigateToTax}
          className="w-full bg-yellow-700 hover:bg-yellow-600 text-white rounded px-3 py-2 text-sm font-semibold"
        >
          ⚡ Full rotation complete — Go run Net-Worth Tax →
        </button>
      )}
    </div>
  );
}
