'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { goPayoutAmount } from '@/lib/engine';
import { fmt$ } from '@/lib/ui';

export default function ActionsPanel() {
  const { state, dispatch, activePlayers } = useGame();
  const [tab, setTab] = useState<'go' | 'jail' | 'cards' | 'trade' | 'cash' | 'misc'>('go');

  // GO
  const [goPlayerId, setGoPlayerId] = useState('');
  // Jail
  const [jailPlayerId, setJailPlayerId] = useState('');
  const [goojfPlayerId, setGoojfPlayerId] = useState('');
  // Cards
  const [cardPlayerId, setCardPlayerId] = useState('');
  const [cardType, setCardType] = useState<'chance' | 'community_chest'>('chance');
  // Trade
  const [tradeA, setTradeA] = useState('');
  const [tradeB, setTradeB] = useState('');
  const [cashAtoB, setCashAtoB] = useState('');
  const [cashBtoA, setCashBtoA] = useState('');
  const [propsAtoB, setPropsAtoB] = useState<string[]>([]);
  const [propsBtoA, setPropsBtoA] = useState<string[]>([]);
  // Cash
  const [cashPlayerId, setCashPlayerId] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashReason, setCashReason] = useState('');
  const [cashDirection, setCashDirection] = useState<'bank_to_player' | 'player_to_bank' | 'player_to_player'>('bank_to_player');
  const [cashToPlayerId, setCashToPlayerId] = useState('');

  const goPlayer = activePlayers.find(p => p.id === goPlayerId);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">Quick Actions</h2>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['go', 'jail', 'cards', 'trade', 'cash', 'misc'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t === 'go' ? 'Pass GO' : t === 'jail' ? 'Jail' : t === 'cards' ? 'Cards' : t === 'trade' ? 'Trade' : t === 'cash' ? 'Cash' : 'Misc'}
          </button>
        ))}
      </div>

      {tab === 'go' && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Player passing GO</label>
            <select value={goPlayerId} onChange={e => setGoPlayerId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
              <option value="">— select player —</option>
              {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {goPlayer && (
            <div className="bg-gray-700 rounded p-2 text-sm text-gray-300">
              Payout: <span className="text-green-400 font-bold">{fmt$(goPayoutAmount(goPlayer))}</span>
              {goPayoutAmount(goPlayer) !== 200 && <span className="text-yellow-300 text-xs ml-2">(includes Corporate Sponsor bonus)</span>}
            </div>
          )}
          <button
            onClick={() => { dispatch({ type: 'PASS_GO', playerId: goPlayerId }); setGoPlayerId(''); }}
            disabled={!goPlayerId}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
          >
            Record Pass GO
          </button>
        </div>
      )}

      {tab === 'jail' && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
          <div className="space-y-2">
            <h3 className="text-white text-sm font-semibold">Go to Jail</h3>
            <select value={jailPlayerId} onChange={e => setJailPlayerId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
              <option value="">— select player —</option>
              {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              onClick={() => { dispatch({ type: 'GO_TO_JAIL', playerId: jailPlayerId }); setJailPlayerId(''); }}
              disabled={!jailPlayerId}
              className="w-full bg-red-800 hover:bg-red-700 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
            >
              Go to Jail (increments counter)
            </button>
          </div>
          <div className="space-y-2 border-t border-gray-700 pt-3">
            <h3 className="text-white text-sm font-semibold">Use Get Out of Jail Free</h3>
            <select value={goojfPlayerId} onChange={e => setGoojfPlayerId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
              <option value="">— select player —</option>
              {activePlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name} (cards: {p.getOutOfJailFreeCards})</option>
              ))}
            </select>
            <button
              onClick={() => { dispatch({ type: 'USE_GOOJF', playerId: goojfPlayerId }); setGoojfPlayerId(''); }}
              disabled={!goojfPlayerId || (activePlayers.find(p => p.id === goojfPlayerId)?.getOutOfJailFreeCards ?? 0) <= 0}
              className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
            >
              Use GOOJF Card
            </button>
          </div>
        </div>
      )}

      {tab === 'cards' && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Player drawing card</label>
            <select value={cardPlayerId} onChange={e => setCardPlayerId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
              <option value="">— select player —</option>
              {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Card type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCardType('chance')}
                className={`flex-1 rounded px-3 py-2 text-sm font-semibold border ${cardType === 'chance' ? 'bg-orange-700 border-orange-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
              >
                Chance
              </button>
              <button
                onClick={() => setCardType('community_chest')}
                className={`flex-1 rounded px-3 py-2 text-sm font-semibold border ${cardType === 'community_chest' ? 'bg-blue-700 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
              >
                Community Chest
              </button>
            </div>
          </div>
          <button
            onClick={() => { dispatch({ type: 'DRAW_CARD', playerId: cardPlayerId, cardType }); setCardPlayerId(''); }}
            disabled={!cardPlayerId}
            className="w-full bg-purple-700 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
          >
            Record Card Draw
          </button>
          <div className="border-t border-gray-700 pt-3">
            <h3 className="text-white text-sm font-semibold mb-2">Use Roll Again Token</h3>
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) { dispatch({ type: 'USE_ROLL_AGAIN', playerId: e.target.value }); e.target.value = ''; } }}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
              <option value="">— select player to use token —</option>
              {activePlayers.filter(p => p.rollAgainTokens > 0).map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.rollAgainTokens} tokens)</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {tab === 'trade' && (
        <TradeForm players={activePlayers} dispatch={dispatch} state={state} />
      )}

      {tab === 'cash' && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Direction</label>
            <select value={cashDirection} onChange={e => setCashDirection(e.target.value as typeof cashDirection)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
              <option value="bank_to_player">Bank → Player</option>
              <option value="player_to_bank">Player → Bank</option>
              <option value="player_to_player">Player → Player</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">{cashDirection === 'player_to_player' ? 'From player' : 'Player'}</label>
            <select value={cashPlayerId} onChange={e => setCashPlayerId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
              <option value="">— select —</option>
              {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({fmt$(p.cash)})</option>)}
            </select>
          </div>
          {cashDirection === 'player_to_player' && (
            <div>
              <label className="text-gray-400 text-sm block mb-1">To player</label>
              <select value={cashToPlayerId} onChange={e => setCashToPlayerId(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
                <option value="">— select —</option>
                {activePlayers.filter(p => p.id !== cashPlayerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-gray-400 text-sm block mb-1">Amount</label>
            <input type="number" min={0} value={cashAmount} onChange={e => setCashAmount(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600" placeholder="e.g. 200" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Reason</label>
            <input value={cashReason} onChange={e => setCashReason(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600" placeholder="e.g. Chance card" />
          </div>
          <button
            disabled={!cashPlayerId || !cashAmount || (cashDirection === 'player_to_player' && !cashToPlayerId)}
            onClick={() => {
              const amt = parseInt(cashAmount);
              if (isNaN(amt)) return;
              if (cashDirection === 'bank_to_player') dispatch({ type: 'BANK_CASH', playerId: cashPlayerId, amount: amt, reason: cashReason });
              else if (cashDirection === 'player_to_bank') dispatch({ type: 'PAY_BANK', playerId: cashPlayerId, amount: amt, reason: cashReason });
              else dispatch({ type: 'TRANSFER_CASH', fromId: cashPlayerId, toId: cashToPlayerId, amount: amt, reason: cashReason });
              setCashPlayerId(''); setCashAmount(''); setCashReason(''); setCashToPlayerId('');
            }}
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold"
          >
            Apply Cash Transfer
          </button>
        </div>
      )}

      {tab === 'misc' && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
          <div>
            <h3 className="text-white text-sm font-semibold mb-2">Give Get Out of Jail Free Card</h3>
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) { dispatch({ type: 'GIVE_GOOJF', playerId: e.target.value }); e.target.value = ''; } }}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600">
              <option value="">— select player —</option>
              {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="border-t border-gray-700 pt-3">
            <h3 className="text-white text-sm font-semibold mb-2">Increment Turn Rotation (manual)</h3>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Current: #{state.turnRotationCount}</span>
              <button
                onClick={() => dispatch({ type: 'INCREMENT_TURN_ROTATION' })}
                className="bg-gray-600 hover:bg-gray-500 text-white rounded px-3 py-1.5 text-sm"
              >
                +1 Rotation
              </button>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-3">
            <h3 className="text-white text-sm font-semibold mb-2">City Planner / Conductor reminder</h3>
            {activePlayers.filter(p => p.activeModifiers.some(m => m.type === 'move_choice' || m.type === 'railroad_teleport' || m.type === 'card_skip_move')).map(p => (
              <div key={p.id} className="text-yellow-300 text-xs mb-1">
                {p.name}: {p.activeModifiers.filter(m => ['move_choice', 'railroad_teleport', 'card_skip_move'].includes(m.type)).map(m => m.description).join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import type { Player, GameState } from '@/lib/types';
import type { GameAction } from '@/lib/gameStore';

function TradeForm({ players, dispatch, state }: { players: Player[]; dispatch: React.Dispatch<GameAction>; state: GameState }) {
  const [pA, setPa] = useState('');
  const [pB, setPb] = useState('');
  const [cashAtoB, setCashAtoB] = useState('');
  const [cashBtoA, setCashBtoA] = useState('');
  const [propsAtoB, setPropsAtoB] = useState<string[]>([]);
  const [propsBtoA, setPropsBtoA] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const playerA = players.find(p => p.id === pA);
  const playerB = players.find(p => p.id === pB);
  const propsOfA = state.properties.filter(p => p.ownerId === pA);
  const propsOfB = state.properties.filter(p => p.ownerId === pB);

  function toggle(arr: string[], setArr: (v: string[]) => void, val: string) {
    if (arr.includes(val)) setArr(arr.filter(x => x !== val));
    else setArr([...arr, val]);
  }

  function handleTrade() {
    dispatch({
      type: 'COMPLETE_TRADE',
      playerAId: pA, playerBId: pB,
      propertyIdsAtoB: propsAtoB, propertyIdsBtoA: propsBtoA,
      cashAtoB: parseInt(cashAtoB) || 0,
      cashBtoA: parseInt(cashBtoA) || 0,
    });
    setPa(''); setPb(''); setCashAtoB(''); setCashBtoA(''); setPropsAtoB([]); setPropsBtoA([]);
    setDone(true); setTimeout(() => setDone(false), 3000);
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Player A</label>
          <select value={pA} onChange={e => { setPa(e.target.value); setPropsAtoB([]); }}
            className="w-full bg-gray-700 text-white rounded px-2 py-1.5 text-sm border border-gray-600">
            <option value="">— select —</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Player B</label>
          <select value={pB} onChange={e => { setPb(e.target.value); setPropsBtoA([]); }}
            className="w-full bg-gray-700 text-white rounded px-2 py-1.5 text-sm border border-gray-600">
            <option value="">— select —</option>
            {players.filter(p => p.id !== pA).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Cash A→B</label>
          <input type="number" min={0} value={cashAtoB} onChange={e => setCashAtoB(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-2 py-1.5 text-sm border border-gray-600" placeholder="$0" />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Cash B→A</label>
          <input type="number" min={0} value={cashBtoA} onChange={e => setCashBtoA(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-2 py-1.5 text-sm border border-gray-600" placeholder="$0" />
        </div>
      </div>
      {playerA && propsOfA.length > 0 && (
        <div>
          <label className="text-gray-400 text-xs block mb-1">{playerA.name}'s properties going to {playerB?.name ?? '?'}</label>
          <div className="flex flex-wrap gap-1">
            {propsOfA.map(p => (
              <button key={p.id} onClick={() => toggle(propsAtoB, setPropsAtoB, p.id)}
                className={`text-xs px-2 py-0.5 rounded border ${propsAtoB.includes(p.id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {playerB && propsOfB.length > 0 && (
        <div>
          <label className="text-gray-400 text-xs block mb-1">{playerB.name}'s properties going to {playerA?.name ?? '?'}</label>
          <div className="flex flex-wrap gap-1">
            {propsOfB.map(p => (
              <button key={p.id} onClick={() => toggle(propsBtoA, setPropsBtoA, p.id)}
                className={`text-xs px-2 py-0.5 rounded border ${propsBtoA.includes(p.id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button onClick={handleTrade} disabled={!pA || !pB}
        className="w-full bg-teal-700 hover:bg-teal-600 disabled:bg-gray-600 text-white rounded px-4 py-2 font-semibold">
        Complete Trade
      </button>
      {done && <div className="text-green-400 text-sm text-center">✓ Trade recorded!</div>}
    </div>
  );
}
