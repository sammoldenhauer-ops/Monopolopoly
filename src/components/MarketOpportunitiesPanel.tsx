'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { fmt$ } from '@/lib/ui';
import type { MarketOpportunityId } from '@/lib/types';

export default function MarketOpportunitiesPanel() {
  const { state, dispatch, activePlayers, pendingOpportunities } = useGame();
  const [claimOppId, setClaimOppId] = useState<MarketOpportunityId | null>(null);
  const [claimPlayerId, setClaimPlayerId] = useState('');
  const [freeHousePropId, setFreeHousePropId] = useState('');

  function handleClaim() {
    if (!claimOppId || !claimPlayerId) return;
    const opp = state.marketOpportunities.find(o => o.id === claimOppId);
    dispatch({
      type: 'CLAIM_MARKET_OPPORTUNITY',
      opportunityId: claimOppId,
      playerId: claimPlayerId,
      freeHousePropertyId: opp?.rewardType === 'free_house' ? freeHousePropId : undefined,
    });
    setClaimOppId(null);
    setClaimPlayerId('');
    setFreeHousePropId('');
  }

  // Per-player counters for display
  function counterFor(playerId: string, oppId: MarketOpportunityId): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return 0;
    switch (oppId) {
      case 'mo_own_8_properties':
      case 'mo_own_12_properties': return player.ownedPropertyIds.length;
      case 'mo_build_3_houses':
      case 'mo_build_6_houses': return player.housesBuiltCount;
      case 'mo_build_3_hotels': return player.hotelsBuiltCount;
      case 'mo_complete_3_trades': return player.tradesCompleted;
      case 'mo_rent_from_3_players':
      case 'mo_rent_from_6_players': return player.rentCollectedFromPlayerIds.length;
      case 'mo_draw_3_chance': return player.chanceDrawCount;
      case 'mo_draw_3_community_chest': return player.communityChestDrawCount;
      case 'mo_win_3_auctions':
      case 'mo_win_6_auctions': return player.auctionsWon;
      case 'mo_pass_go_3_times': return player.goPassCount;
      case 'mo_go_to_jail_3_times': return player.jailVisitCount;
      default: return 0;
    }
  }

  const pendingOppIds = new Set(pendingOpportunities.map(p => p.opportunityId));
  const freeHouseProps = state.properties.filter(p =>
    claimPlayerId && p.ownerId === claimPlayerId && !p.hasHotel && p.houses < 4 && p.group !== 'Railroad' && p.group !== 'Utility'
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Market Opportunities</h2>
      <p className="text-gray-400 text-sm">
        First-come-first-served. Once claimed by any player, no one else can claim it.
        Pending claims (threshold reached but not yet confirmed) are highlighted.
      </p>

      {/* Pending alerts */}
      {pendingOpportunities.length > 0 && (
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-3 space-y-2">
          <div className="text-yellow-300 font-semibold text-sm">⚡ Pending Opportunity Claims</div>
          {pendingOpportunities.map((p, i) => {
            const opp = state.marketOpportunities.find(o => o.id === p.opportunityId);
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-yellow-100 text-sm">
                  <strong>{p.playerName}</strong> qualifies for: {opp?.title}
                </span>
                <button
                  onClick={() => { setClaimOppId(p.opportunityId as MarketOpportunityId); setClaimPlayerId(p.playerId); }}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-3 py-1 rounded shrink-0"
                >
                  Confirm Claim
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim modal */}
      {claimOppId && (
        <div className="bg-gray-800 border border-blue-600 rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold">Confirm Claim</h3>
          <div className="text-gray-300 text-sm">
            Opportunity: <strong>{state.marketOpportunities.find(o => o.id === claimOppId)?.title}</strong>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Claiming player</label>
            <select
              value={claimPlayerId}
              onChange={e => setClaimPlayerId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600"
            >
              <option value="">— select —</option>
              {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {state.marketOpportunities.find(o => o.id === claimOppId)?.rewardType === 'free_house' && (
            <div>
              <label className="text-gray-400 text-sm block mb-1">Place free house on (lowest-value monopoly property)</label>
              <select
                value={freeHousePropId}
                onChange={e => setFreeHousePropId(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600"
              >
                <option value="">— select property —</option>
                {freeHouseProps.map(p => <option key={p.id} value={p.id}>{p.name} ({p.houses}h)</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleClaim}
              disabled={!claimPlayerId}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded px-3 py-2 text-sm font-semibold"
            >
              ✓ Apply Reward
            </button>
            <button
              onClick={() => { setClaimOppId(null); setClaimPlayerId(''); setFreeHousePropId(''); }}
              className="bg-gray-600 hover:bg-gray-500 text-white rounded px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {state.marketOpportunities.map(opp => {
          const claimer = opp.claimedBy ? state.players.find(p => p.id === opp.claimedBy) : null;
          const isPending = pendingOppIds.has(opp.id);
          const hasThreshold = opp.threshold !== undefined;

          return (
            <div
              key={opp.id}
              className={`bg-gray-800 rounded-lg p-3 border transition-colors ${
                claimer ? 'border-gray-600 opacity-60' : isPending ? 'border-yellow-500' : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${claimer ? 'text-gray-400 line-through' : 'text-white'}`}>
                      {opp.title}
                    </span>
                    {opp.rewardType === 'cash' && opp.rewardAmount && (
                      <span className="text-xs bg-green-800 text-green-200 px-1.5 py-0.5 rounded shrink-0">
                        +{fmt$(opp.rewardAmount)}
                      </span>
                    )}
                    {opp.rewardType === 'goojf' && (
                      <span className="text-xs bg-blue-800 text-blue-200 px-1.5 py-0.5 rounded shrink-0">GOOJF</span>
                    )}
                    {opp.rewardType === 'roll_again' && (
                      <span className="text-xs bg-purple-800 text-purple-200 px-1.5 py-0.5 rounded shrink-0">Roll Again</span>
                    )}
                    {opp.rewardType === 'free_house' && (
                      <span className="text-xs bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded shrink-0">Free House</span>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">{opp.description}</div>
                </div>
                <div className="text-right shrink-0">
                  {claimer ? (
                    <span className="text-emerald-400 text-xs font-medium">{claimer.name} ✓</span>
                  ) : (
                    <button
                      onClick={() => setClaimOppId(opp.id)}
                      className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>

              {/* Per-player counters */}
              {hasThreshold && !claimer && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {activePlayers.map(p => {
                    const count = counterFor(p.id, opp.id);
                    const pct = Math.min(100, Math.round((count / opp.threshold!) * 100));
                    return (
                      <div key={p.id} className="flex items-center gap-1 text-xs bg-gray-700 rounded px-2 py-0.5">
                        <span className="text-gray-300">{p.name}:</span>
                        <span className={count >= opp.threshold! ? 'text-green-400 font-bold' : 'text-white'}>
                          {count}/{opp.threshold}
                        </span>
                        {pct > 0 && pct < 100 && (
                          <div className="w-12 h-1 bg-gray-600 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
