'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { SECRET_VENTURES } from '@/lib/boardData';
import type { SecretVentureId, PropertyGroup } from '@/lib/types';

const PROPERTY_GROUPS: PropertyGroup[] = ['Brown', 'LightBlue', 'Pink', 'Orange', 'Red', 'Yellow', 'Green', 'DarkBlue'];

export default function SecretVenturesPanel() {
  const { state, dispatch, activePlayers } = useGame();
  const [assignPlayerId, setAssignPlayerId] = useState('');
  const [ventureId, setVentureId] = useState<SecretVentureId | ''>('');
  const [franchiseeTarget, setFranchiseeTarget] = useState<PropertyGroup | ''>('');
  const [done, setDone] = useState(false);

  // Which ventures are already assigned?
  const assignedVentures = new Set(state.players.map(p => p.secretVenture).filter(Boolean));
  const assignedPending = new Set(state.players.flatMap(p => p.pendingAbsorbedVentures));

  function handleAssign() {
    if (!assignPlayerId || !ventureId) return;
    if (ventureId === 'franchisee' && !franchiseeTarget) return;
    dispatch({
      type: 'ASSIGN_SECRET_VENTURE',
      playerId: assignPlayerId,
      ventureId: ventureId as SecretVentureId,
      franchiseeTargetGroup: franchiseeTarget ? franchiseeTarget as PropertyGroup : undefined,
    });
    setAssignPlayerId('');
    setVentureId('');
    setFranchiseeTarget('');
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Secret Business Ventures</h2>
      <p className="text-gray-400 text-sm">
        Ventures are revealed one at a time when a player achieves or claims theirs. Select player + venture to activate its modifier.
      </p>

      {/* Assign form */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
        <h3 className="text-white font-semibold text-sm">Assign / Reveal a Venture</h3>

        <div>
          <label className="text-gray-400 text-sm block mb-1">Player</label>
          <select
            value={assignPlayerId}
            onChange={e => setAssignPlayerId(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">— select player —</option>
            {activePlayers.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.secretVenture ? ` (has: ${p.secretVenture})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">Venture</label>
          <select
            value={ventureId}
            onChange={e => { setVentureId(e.target.value as SecretVentureId | ''); setFranchiseeTarget(''); }}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">— select venture —</option>
            {SECRET_VENTURES.map(v => {
              const alreadyUsed = assignedVentures.has(v.id) || assignedPending.has(v.id);
              return (
                <option key={v.id} value={v.id} disabled={alreadyUsed}>
                  {v.name}{alreadyUsed ? ' [already assigned]' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {ventureId === 'franchisee' && (
          <div>
            <label className="text-gray-400 text-sm block mb-1">
              Franchisee target monopoly (opposing group where rent is halved for this player)
            </label>
            <select
              value={franchiseeTarget}
              onChange={e => setFranchiseeTarget(e.target.value as PropertyGroup | '')}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              <option value="">— select target group —</option>
              {PROPERTY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        <button
          onClick={handleAssign}
          disabled={!assignPlayerId || !ventureId || (ventureId === 'franchisee' && !franchiseeTarget)}
          className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded px-4 py-2 font-semibold transition-colors"
        >
          Reveal & Activate Venture
        </button>
      </div>

      {done && (
        <div className="bg-green-900 border border-green-600 rounded-lg px-4 py-2 text-green-300 text-sm text-center">
          ✓ Venture activated!
        </div>
      )}

      {/* All ventures reference */}
      <div className="space-y-2">
        <h3 className="text-gray-400 text-xs uppercase tracking-wide">All 8 Ventures</h3>
        {SECRET_VENTURES.map(v => {
          const assignedTo = state.players.find(p => p.secretVenture === v.id);
          const pendingOn = state.players.find(p => p.pendingAbsorbedVentures.includes(v.id));
          return (
            <div key={v.id} className={`bg-gray-800 rounded-lg p-3 border ${assignedTo ? 'border-yellow-600' : 'border-gray-700'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-white text-sm">{v.name}</div>
                {assignedTo && (
                  <span className="text-xs bg-yellow-700 text-yellow-100 px-2 py-0.5 rounded shrink-0">
                    {assignedTo.name}
                  </span>
                )}
                {pendingOn && !assignedTo && (
                  <span className="text-xs bg-purple-700 text-purple-100 px-2 py-0.5 rounded shrink-0">
                    Pending: {pendingOn.name}
                  </span>
                )}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                <span className="text-gray-500">Achieve: </span>{v.achievementDescription}
              </div>
              <div className="text-yellow-300 text-xs mt-1">
                <span className="text-gray-500">Effect: </span>{v.effectDescription}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
