'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { calcNetWorth, getModifierStatus } from '@/lib/engine';
import { GROUP_COLORS, GROUP_LABEL, fmt$ } from '@/lib/ui';
import type { Player, PropertyGroup } from '@/lib/types';

function PlayerCard({ player }: { player: Player }) {
  const { state } = useGame();
  const [expanded, setExpanded] = useState(false);

  const netWorth = calcNetWorth(player, state.properties);
  const ownedProps = state.properties.filter(p => p.ownerId === player.id);

  // Group properties by color
  const byGroup: Partial<Record<PropertyGroup, typeof ownedProps>> = {};
  for (const p of ownedProps) {
    if (!byGroup[p.group]) byGroup[p.group] = [];
    byGroup[p.group]!.push(p);
  }

  const absorbed = player.absorbedPlayers
    .map(id => state.players.find(p => p.id === id))
    .filter(Boolean) as Player[];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-750"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="font-bold text-white truncate">{player.name}</div>
          {absorbed.length > 0 && (
            <span className="text-xs bg-purple-700 text-purple-100 px-2 py-0.5 rounded-full shrink-0">
              Team +{absorbed.length}
            </span>
          )}
          {player.secretVenture && (
            <span className="text-xs bg-yellow-700 text-yellow-100 px-2 py-0.5 rounded-full truncate shrink-0">
              {player.secretVenture.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-2">
          <div className="text-right">
            <div className="text-green-400 font-mono font-bold">{fmt$(player.cash)}</div>
            <div className="text-gray-400 text-xs">NW: {fmt$(netWorth)}</div>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Property color dots row */}
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {(Object.keys(byGroup) as PropertyGroup[]).map(group => {
          const col = GROUP_COLORS[group];
          const props = byGroup[group]!;
          return props.map(p => (
            <span
              key={p.id}
              title={`${p.name}${p.hasHotel ? ' 🏨' : p.houses > 0 ? ` ${p.houses}🏠` : ''}${p.isMortgaged ? ' (M)' : ''}`}
              className={`${col.bg} ${col.text} text-xs px-1.5 py-0.5 rounded font-mono`}
            >
              {p.name.split(' ')[0].slice(0, 3)}{p.hasHotel ? '★' : p.houses > 0 ? `+${p.houses}` : ''}
            </span>
          ));
        })}
        {ownedProps.length === 0 && <span className="text-gray-500 text-xs italic">No properties</span>}
      </div>

      {expanded && (
        <div className="border-t border-gray-700 p-3 space-y-3 text-sm">
          {/* Counters */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Auctions Won" value={player.auctionsWon} />
            <Stat label="GO Passes" value={player.goPassCount} />
            <Stat label="Jail Visits" value={player.jailVisitCount} />
            <Stat label="Chance Draws" value={player.chanceDrawCount} />
            <Stat label="CC Draws" value={player.communityChestDrawCount} />
            <Stat label="Trades" value={player.tradesCompleted} />
            <Stat label="GOOJF Cards" value={player.getOutOfJailFreeCards} />
            <Stat label="Roll Again" value={player.rollAgainTokens} />
            <Stat label="Rent Paid To" value={player.rentPaidToPlayerIds.length} />
            <Stat label="Rent Collected From" value={player.rentCollectedFromPlayerIds.length} />
            <Stat label="Houses Built" value={player.housesBuiltCount} />
            <Stat label="Hotels Built" value={player.hotelsBuiltCount} />
          </div>

          {/* Active Modifiers */}
          {player.activeModifiers.length > 0 && (
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Active Modifiers</div>
              <ul className="space-y-1">
                {player.activeModifiers.map((m, i) => {
                  const status = getModifierStatus(m, player.id, state.properties);
                  return (
                    <li
                      key={i}
                      className={`text-xs rounded px-2 py-1 flex items-center justify-between gap-2 ${
                        status.active ? 'text-yellow-300 bg-yellow-900/30' : 'text-gray-400 bg-gray-700/40'
                      }`}
                    >
                      <span>{m.description}</span>
                      {!status.active && (
                        <span className="shrink-0 text-gray-400 bg-gray-600/60 px-1.5 py-0.5 rounded" title={status.note}>
                          Dormant
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Pending absorbed ventures */}
          {player.pendingAbsorbedVentures.length > 0 && (
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Absorbed Pending Ventures</div>
              <ul className="space-y-1">
                {player.pendingAbsorbedVentures.map(v => (
                  <li key={v} className="text-purple-300 text-xs bg-purple-900/30 rounded px-2 py-1">{v.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Absorbed team members */}
          {absorbed.length > 0 && (
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Team Members</div>
              <div className="flex flex-wrap gap-1">
                {absorbed.map(p => (
                  <span key={p.id} className="bg-purple-800 text-purple-100 text-xs px-2 py-0.5 rounded">{p.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Market Opportunities */}
          {player.marketOpportunitiesClaimed.length > 0 && (
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Market Opportunities Claimed</div>
              <div className="flex flex-wrap gap-1">
                {player.marketOpportunitiesClaimed.map(id => {
                  const opp = state.marketOpportunities.find(o => o.id === id);
                  return opp ? (
                    <span key={id} className="bg-emerald-800 text-emerald-100 text-xs px-2 py-0.5 rounded">{opp.title}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Detailed property list */}
          {ownedProps.length > 0 && (
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Properties ({ownedProps.length})</div>
              <div className="space-y-1">
                {(Object.keys(byGroup) as PropertyGroup[]).map(group => (
                  <div key={group} className="flex items-start gap-2">
                    <span className={`${GROUP_COLORS[group].bg} ${GROUP_COLORS[group].text} text-xs px-1.5 py-0.5 rounded shrink-0`}>
                      {GROUP_LABEL[group]}
                    </span>
                    <span className="text-gray-300 text-xs">
                      {byGroup[group]!.map(p =>
                        `${p.name}${p.isMortgaged ? ' [M]' : p.hasHotel ? ' [H]' : p.houses > 0 ? ` [${p.houses}h]` : ''}`
                      ).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-700 rounded p-1.5">
      <div className="text-gray-400 text-xs">{label}</div>
      <div className="text-white font-bold">{value}</div>
    </div>
  );
}

export default function PlayerOverview() {
  const { state, activePlayers } = useGame();
  const eliminated = state.players.filter(p => p.isEliminated);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Players</h2>
        <div className="text-gray-400 text-sm">
          {activePlayers.length} active{eliminated.length > 0 ? ` · ${eliminated.length} eliminated` : ''}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {activePlayers.map(p => <PlayerCard key={p.id} player={p} />)}
      </div>

      {eliminated.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Eliminated</h3>
          <div className="space-y-2 opacity-50">
            {eliminated.map(p => (
              <div key={p.id} className="bg-gray-800 rounded px-3 py-2 flex items-center justify-between">
                <span className="text-gray-400 line-through">{p.name}</span>
                {p.teamOf && (
                  <span className="text-xs text-gray-500">
                    → {state.players.find(x => x.id === p.teamOf)?.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
