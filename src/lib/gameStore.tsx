'use client';

import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type {
  GameState, GameSnapshot, Player, Property, MarketOpportunityId,
  SecretVentureId, Modifier, PropertyGroup, LogEntry,
} from './types';
import {
  INITIAL_PROPERTIES, MARKET_OPPORTUNITIES, SECRET_VENTURES,
  STARTING_CASH, BANK_HOUSE_SUPPLY, BANK_HOTEL_SUPPLY, GO_AMOUNT,
  RAILROAD_IDS, UTILITY_IDS,
} from './boardData';
import {
  calcNetWorth, rankPlayersByNetWorth, ownsMonopoly, ownsRailroads,
  ownsUtilities, calculateTax, canBuildHouse, canBuildHotel,
  houseBuildCost, checkCorporateSponsor, goPayoutAmount,
  totalPropertyPurchaseValue, checkFranchisee, checkOpportunities,
} from './engine';

// ──────────────────────────────────────────────────────────────
// Initial state helpers
// ──────────────────────────────────────────────────────────────

function makePlayer(id: string, name: string): Player {
  return {
    id, name,
    cash: STARTING_CASH,
    isEliminated: false,
    teamOf: null,
    absorbedPlayers: [],
    ownedPropertyIds: [],
    secretVenture: null,
    pendingAbsorbedVentures: [],
    activeModifiers: [],
    marketOpportunitiesClaimed: [],
    rentCollectedFromPlayerIds: [],
    rentPaidToPlayerIds: [],
    tradesCompleted: 0,
    chanceDrawCount: 0,
    communityChestDrawCount: 0,
    auctionsWon: 0,
    goPassCount: 0,
    jailVisitCount: 0,
    getOutOfJailFreeCards: 0,
    housesBuiltCount: 0,
    hotelsBuiltCount: 0,
    rollAgainTokens: 0,
  };
}

const INITIAL_STATE: GameState = {
  phase: 'setup',
  players: [],
  properties: INITIAL_PROPERTIES.map(p => ({ ...p })),
  marketOpportunities: MARKET_OPPORTUNITIES.map(o => ({ ...o })),
  freeParkingPool: 0,
  bankHouseSupply: BANK_HOUSE_SUPPLY,
  bankHotelSupply: BANK_HOTEL_SUPPLY,
  turnRotationCount: 0,
  firstFreeParkingLanderClaimed: false,
  eliminationCount: 0,
  log: [],
  franchiseeTargets: {},
  undoState: null,
};

const SAVE_KEY = 'monopolopoly-save-v1';

// ──────────────────────────────────────────────────────────────
// Log helper
// ──────────────────────────────────────────────────────────────

let logCounter = 0;
function makeLog(action: string, detail: string, playerIds: string[] = []): LogEntry {
  return {
    id: `log-${++logCounter}-${Date.now()}`,
    timestamp: Date.now(),
    action,
    detail,
    involvedPlayerIds: playerIds,
  };
}

function stripUndoState(state: GameState): GameSnapshot {
  const { undoState: _undoState, ...snapshot } = state;
  return snapshot;
}

function withUndo(state: GameState, nextState: GameState): GameState {
  return {
    ...nextState,
    undoState: stripUndoState(state),
  };
}

function withUndoSnapshot(state: GameState, updater: (snapshot: GameSnapshot) => GameState): GameState {
  return withUndo(state, updater(stripUndoState(state)));
}

function loadSavedState(): GameState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GameState;
    return {
      ...INITIAL_STATE,
      ...parsed,
      undoState: parsed.undoState ?? null,
    };
  } catch {
    return null;
  }
}

function persistState(state: GameState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

// ──────────────────────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'START_GAME'; playerNames: string[] }
  | { type: 'RESET_GAME' }
  | { type: 'LOAD_GAME'; state: GameSnapshot }
  | { type: 'UNDO_LAST_ACTION' }
  | { type: 'RECORD_AUCTION'; propertyId: string; winnerId: string; amount: number }
  | { type: 'PAY_RENT'; propertyId: string; payerId: string; amount: number; diceRoll?: number }
  | { type: 'PASS_GO'; playerId: string }
  | { type: 'GO_TO_JAIL'; playerId: string }
  | { type: 'DRAW_CARD'; playerId: string; cardType: 'chance' | 'community_chest' }
  | { type: 'COMPLETE_TRADE'; playerAId: string; playerBId: string; propertyIdsAtoB: string[]; propertyIdsBtoA: string[]; cashAtoB: number; cashBtoA: number }
  | { type: 'BUILD_HOUSE'; propertyId: string }
  | { type: 'BUILD_HOTEL'; propertyId: string }
  | { type: 'ASSIGN_SECRET_VENTURE'; playerId: string; ventureId: SecretVentureId; franchiseeTargetGroup?: PropertyGroup }
  | { type: 'CLAIM_MARKET_OPPORTUNITY'; opportunityId: MarketOpportunityId; playerId: string; freeHousePropertyId?: string }
  | { type: 'PREVIEW_TAX' } // no-op in reducer, handled in UI
  | { type: 'APPLY_TAX' }
  | { type: 'FREE_PARKING_PAYOUT'; playerId: string; isFirstEverLanding: boolean }
  | { type: 'MORTGAGE_PROPERTY'; propertyId: string }
  | { type: 'UNMORTGAGE_PROPERTY'; propertyId: string }
  | { type: 'BANK_CASH'; playerId: string; amount: number; reason: string }  // give cash from bank
  | { type: 'PAY_BANK'; playerId: string; amount: number; reason: string }   // pay cash to bank
  | { type: 'TRANSFER_CASH'; fromId: string; toId: string; amount: number; reason: string }
  | { type: 'ELIMINATE_PLAYER'; playerId: string; causingPlayerId: string | null }
  | { type: 'ASSIGN_TEAM'; eliminatedPlayerId: string; acquiringPlayerId: string }
  | { type: 'TRANSFER_PROPERTY'; propertyId: string; fromId: string | null; toId: string }
  | { type: 'INCREMENT_TURN_ROTATION' }
  | { type: 'USE_GOOJF'; playerId: string }
  | { type: 'GIVE_GOOJF'; playerId: string }
  | { type: 'USE_ROLL_AGAIN'; playerId: string }
  | { type: 'ADD_TO_FREE_PARKING_POOL'; amount: number; reason: string }
  | { type: 'ADD_LOG'; action: string; detail: string; playerIds?: string[] };

// ──────────────────────────────────────────────────────────────
// Venture modifier factory
// ──────────────────────────────────────────────────────────────

function ventureModifiers(ventureId: SecretVentureId, franchiseeTarget?: PropertyGroup): Modifier[] {
  switch (ventureId) {
    case 'diplomatic_immunity':
      return [{ sourceId: ventureId, type: 'jail_immunity', description: 'Diplomatic Immunity: cannot be sent to Jail' }];
    case 'corporate_sponsor':
      return [{ sourceId: ventureId, type: 'passive_go_multiplier', value: 1.5, description: 'Corporate Sponsor: 1.5× GO payout' }];
    case 'franchisee':
      return franchiseeTarget
        ? [{
            sourceId: ventureId,
            type: 'rent_discount',
            appliesAsPayer: true,
            targetGroup: franchiseeTarget,
            value: 0.5,
            description: `Franchisee: 50% rent discount on ${franchiseeTarget}`,
          }]
        : [];
    case 'conductor':
      return [{ sourceId: ventureId, type: 'railroad_teleport', description: 'Conductor: may teleport between Railroads' }];
    case 'luck_of_the_draw':
      return [{ sourceId: ventureId, type: 'card_skip_move', description: 'Luck of the Draw: may skip move and draw a card' }];
    case 'utility_provider':
      return [{ sourceId: ventureId, type: 'utility_combined_rent', description: 'Utility Provider: all utility landings charge combined (10×) rent' }];
    case 'slum_lord':
      return [
        { sourceId: ventureId, type: 'first_house_free', description: 'Slum Lord: first house on each Brown property is free' },
        { sourceId: ventureId, type: 'build_discount', value: 0.5, description: 'Slum Lord: all house/hotel construction costs 50% off' },
      ];
    case 'city_planner':
      return [{ sourceId: ventureId, type: 'move_choice', description: 'City Planner: may choose to move one die or both dice' }];
    default:
      return [];
  }
}

// ──────────────────────────────────────────────────────────────
// Post-action opportunity check helper
// ──────────────────────────────────────────────────────────────

function applyPendingOpportunityReward(
  state: GameState,
  opportunityId: MarketOpportunityId,
  playerId: string,
  freeHousePropertyId?: string,
): GameState {
  const opp = state.marketOpportunities.find(o => o.id === opportunityId);
  if (!opp || opp.claimedBy) return state;

  let newState = {
    ...state,
    marketOpportunities: state.marketOpportunities.map(o =>
      o.id === opportunityId ? { ...o, claimedBy: playerId } : o
    ),
    players: state.players.map(p =>
      p.id === playerId
        ? { ...p, marketOpportunitiesClaimed: [...p.marketOpportunitiesClaimed, opportunityId] }
        : p
    ),
  };

  const player = newState.players.find(p => p.id === playerId)!;

  if (opp.rewardType === 'cash' && opp.rewardAmount) {
    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === playerId ? { ...p, cash: p.cash + opp.rewardAmount! } : p
      ),
      log: [...newState.log, makeLog('Market Opportunity', `${player.name} claimed "${opp.title}" — +$${opp.rewardAmount}`, [playerId])],
    };
  } else if (opp.rewardType === 'goojf') {
    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === playerId ? { ...p, getOutOfJailFreeCards: p.getOutOfJailFreeCards + 1 } : p
      ),
      log: [...newState.log, makeLog('Market Opportunity', `${player.name} claimed "${opp.title}" — +1 GOOJF card`, [playerId])],
    };
  } else if (opp.rewardType === 'roll_again') {
    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === playerId ? { ...p, rollAgainTokens: p.rollAgainTokens + 1 } : p
      ),
      log: [...newState.log, makeLog('Market Opportunity', `${player.name} claimed "${opp.title}" — +1 Roll Again token`, [playerId])],
    };
  } else if (opp.rewardType === 'free_house' && freeHousePropertyId) {
    const prop = newState.properties.find(p => p.id === freeHousePropertyId);
    if (prop && newState.bankHouseSupply > 0) {
      newState = {
        ...newState,
        bankHouseSupply: newState.bankHouseSupply - 1,
        properties: newState.properties.map(p =>
          p.id === freeHousePropertyId ? { ...p, houses: p.houses + 1 } : p
        ),
        log: [...newState.log, makeLog('Market Opportunity', `${player.name} claimed "${opp.title}" — free house on ${prop.name}`, [playerId])],
      };
    }
  }

  return newState;
}

// ──────────────────────────────────────────────────────────────
// Reducer
// ──────────────────────────────────────────────────────────────

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const players = action.playerNames.map((name, i) => makePlayer(`player-${i + 1}`, name));
      return {
        ...INITIAL_STATE,
        phase: 'playing',
        players,
        properties: INITIAL_PROPERTIES.map(p => ({ ...p })),
        marketOpportunities: MARKET_OPPORTUNITIES.map(o => ({ ...o })),
        log: [makeLog('Game Started', `${players.length} players: ${players.map(p => p.name).join(', ')}`)],
      };
    }

    case 'RECORD_AUCTION': {
      const { propertyId, winnerId, amount } = action;
      const prop = state.properties.find(p => p.id === propertyId);
      const winner = state.players.find(p => p.id === winnerId);
      if (!prop || !winner) return state;

      let newState: GameState = {
        ...state,
        players: state.players.map(p =>
          p.id === winnerId
            ? {
                ...p,
                cash: p.cash - amount,
                ownedPropertyIds: [...p.ownedPropertyIds, propertyId],
                auctionsWon: p.auctionsWon + 1,
              }
            : p
        ),
        properties: state.properties.map(p =>
          p.id === propertyId ? { ...p, ownerId: winnerId } : p
        ),
        log: [...state.log, makeLog('Auction', `${winner.name} won ${prop.name} for $${amount}`, [winnerId])],
      };

      return newState;
    }

    case 'PAY_RENT': {
      const { propertyId, payerId, amount, diceRoll } = action;
      const prop = state.properties.find(p => p.id === propertyId);
      if (!prop || !prop.ownerId) return state;
      const payer = state.players.find(p => p.id === payerId);
      const owner = state.players.find(p => p.id === prop.ownerId);
      if (!payer || !owner) return state;

      const newRentPaidTo = payer.rentPaidToPlayerIds.includes(owner.id)
        ? payer.rentPaidToPlayerIds
        : [...payer.rentPaidToPlayerIds, owner.id];

      const newRentCollectedFrom = owner.rentCollectedFromPlayerIds.includes(payerId)
        ? owner.rentCollectedFromPlayerIds
        : [...owner.rentCollectedFromPlayerIds, payerId];

      let newState: GameState = {
        ...state,
        players: state.players.map(p => {
          if (p.id === payerId) return { ...p, cash: p.cash - amount, rentPaidToPlayerIds: newRentPaidTo };
          if (p.id === owner.id) return { ...p, cash: p.cash + amount, rentCollectedFromPlayerIds: newRentCollectedFrom };
          return p;
        }),
        log: [...state.log, makeLog('Rent', `${payer.name} paid $${amount} rent to ${owner.name} for ${prop.name}${diceRoll ? ` (dice: ${diceRoll})` : ''}`, [payerId, owner.id])],
      };

      return newState;
    }

    case 'PASS_GO': {
      const { playerId } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      const amount = goPayoutAmount(player);
      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? { ...p, cash: p.cash + amount, goPassCount: p.goPassCount + 1 }
            : p
        ),
        log: [...state.log, makeLog('Pass GO', `${player.name} passed GO, collected $${amount}`, [playerId])],
      };
    }

    case 'GO_TO_JAIL': {
      const { playerId } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      const hasImmunity = player.activeModifiers.some(m => m.type === 'jail_immunity');
      if (hasImmunity) {
        return {
          ...state,
          log: [...state.log, makeLog('Jail Blocked', `${player.name} was sent to Jail but has Diplomatic Immunity!`, [playerId])],
        };
      }
      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, jailVisitCount: p.jailVisitCount + 1 } : p
        ),
        log: [...state.log, makeLog('Go to Jail', `${player.name} went to Jail`, [playerId])],
      };
    }

    case 'DRAW_CARD': {
      const { playerId, cardType } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...p,
                chanceDrawCount: cardType === 'chance' ? p.chanceDrawCount + 1 : p.chanceDrawCount,
                communityChestDrawCount: cardType === 'community_chest' ? p.communityChestDrawCount + 1 : p.communityChestDrawCount,
              }
            : p
        ),
        log: [...state.log, makeLog('Card Draw', `${player.name} drew a ${cardType === 'chance' ? 'Chance' : 'Community Chest'} card`, [playerId])],
      };
    }

    case 'COMPLETE_TRADE': {
      const { playerAId, playerBId, propertyIdsAtoB, propertyIdsBtoA, cashAtoB, cashBtoA } = action;
      const pA = state.players.find(p => p.id === playerAId);
      const pB = state.players.find(p => p.id === playerBId);
      if (!pA || !pB) return state;

      const netCash = cashAtoB - cashBtoA; // pA loses netCash, pB gains netCash
      const aPropIds = pA.ownedPropertyIds
        .filter(id => !propertyIdsAtoB.includes(id))
        .concat(propertyIdsBtoA);
      const bPropIds = pB.ownedPropertyIds
        .filter(id => !propertyIdsBtoA.includes(id))
        .concat(propertyIdsAtoB);

      return {
        ...state,
        players: state.players.map(p => {
          if (p.id === playerAId) return { ...p, cash: p.cash - netCash, ownedPropertyIds: aPropIds, tradesCompleted: p.tradesCompleted + 1 };
          if (p.id === playerBId) return { ...p, cash: p.cash + netCash, ownedPropertyIds: bPropIds, tradesCompleted: p.tradesCompleted + 1 };
          return p;
        }),
        properties: state.properties.map(p => {
          if (propertyIdsAtoB.includes(p.id)) return { ...p, ownerId: playerBId };
          if (propertyIdsBtoA.includes(p.id)) return { ...p, ownerId: playerAId };
          return p;
        }),
        log: [...state.log, makeLog('Trade', `${pA.name} ↔ ${pB.name} completed a trade`, [playerAId, playerBId])],
      };
    }

    case 'BUILD_HOUSE': {
      const { propertyId } = action;
      const prop = state.properties.find(p => p.id === propertyId);
      if (!prop || !prop.ownerId) return state;
      const owner = state.players.find(p => p.id === prop.ownerId);
      if (!owner) return state;

      const check = canBuildHouse(prop, state);
      if (!check.allowed) {
        return { ...state, log: [...state.log, makeLog('Build Error', check.reason ?? 'Cannot build', [owner.id])] };
      }

      const cost = houseBuildCost(prop, owner);
      return {
        ...state,
        players: state.players.map(p =>
          p.id === owner.id ? { ...p, cash: p.cash - cost, housesBuiltCount: p.housesBuiltCount + 1 } : p
        ),
        properties: state.properties.map(p =>
          p.id === propertyId ? { ...p, houses: p.houses + 1 } : p
        ),
        bankHouseSupply: state.bankHouseSupply - 1,
        log: [...state.log, makeLog('Build', `${owner.name} built a house on ${prop.name} for $${cost}`, [owner.id])],
      };
    }

    case 'BUILD_HOTEL': {
      const { propertyId } = action;
      const prop = state.properties.find(p => p.id === propertyId);
      if (!prop || !prop.ownerId) return state;
      const owner = state.players.find(p => p.id === prop.ownerId);
      if (!owner) return state;

      const check = canBuildHotel(prop, state);
      if (!check.allowed) {
        return { ...state, log: [...state.log, makeLog('Build Error', check.reason ?? 'Cannot build', [owner.id])] };
      }

      const hotelCost = houseBuildCost(prop, owner); // same discount for owner
      return {
        ...state,
        players: state.players.map(p =>
          p.id === owner.id ? { ...p, cash: p.cash - hotelCost, hotelsBuiltCount: p.hotelsBuiltCount + 1 } : p
        ),
        properties: state.properties.map(p =>
          p.id === propertyId ? { ...p, houses: 0, hasHotel: true } : p
        ),
        bankHouseSupply: state.bankHouseSupply + 4, // 4 houses returned
        bankHotelSupply: state.bankHotelSupply - 1,
        log: [...state.log, makeLog('Build', `${owner.name} built a hotel on ${prop.name} for $${hotelCost}`, [owner.id])],
      };
    }

    case 'ASSIGN_SECRET_VENTURE': {
      const { playerId, ventureId, franchiseeTargetGroup } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      const venture = SECRET_VENTURES.find(v => v.id === ventureId);
      if (!venture) return state;

      const mods = ventureModifiers(ventureId, franchiseeTargetGroup);
      const newFranchiseeTargets = franchiseeTargetGroup && ventureId === 'franchisee'
        ? { ...state.franchiseeTargets, [playerId]: franchiseeTargetGroup }
        : state.franchiseeTargets;

      return {
        ...state,
        franchiseeTargets: newFranchiseeTargets,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...p,
                secretVenture: ventureId,
                activeModifiers: [
                  ...p.activeModifiers.filter(m => m.sourceId !== ventureId),
                  ...mods,
                ],
              }
            : p
        ),
        log: [...state.log, makeLog('Secret Venture', `${player.name} revealed: ${venture.name}`, [playerId])],
      };
    }

    case 'CLAIM_MARKET_OPPORTUNITY': {
      const { opportunityId, playerId, freeHousePropertyId } = action;
      return applyPendingOpportunityReward(state, opportunityId, playerId, freeHousePropertyId);
    }

    case 'APPLY_TAX': {
      const taxEntries = calculateTax(state);
      const totalCollected = taxEntries.reduce((sum, e) => sum + Math.min(e.taxOwed, e.player.cash), 0);

      let newState: GameState = { ...state, freeParkingPool: state.freeParkingPool + totalCollected };
      for (const entry of taxEntries) {
        const deducted = Math.min(entry.taxOwed, entry.player.cash);
        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === entry.player.id ? { ...p, cash: p.cash - deducted } : p
          ),
        };
      }
      return {
        ...newState,
        turnRotationCount: state.turnRotationCount + 1,
        log: [...newState.log, makeLog('Net Worth Tax', `Rotation ${state.turnRotationCount + 1}: $${totalCollected} collected into Free Parking pool`)],
      };
    }

    case 'FREE_PARKING_PAYOUT': {
      const { playerId, isFirstEverLanding } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      const poolAmount = state.freeParkingPool;
      let bonusAmount = 0;
      let logs: LogEntry[] = [];

      // First-ever landing bonus (MO #20)
      if (isFirstEverLanding && !state.firstFreeParkingLanderClaimed) {
        bonusAmount = 100;
        logs.push(makeLog('Market Opportunity', `${player.name} claimed MO #20 — First Free Parking Landing! +$100 from bank`, [playerId]));
      }

      return {
        ...state,
        firstFreeParkingLanderClaimed: isFirstEverLanding ? true : state.firstFreeParkingLanderClaimed,
        freeParkingPool: 0,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, cash: p.cash + poolAmount + bonusAmount } : p
        ),
        marketOpportunities: isFirstEverLanding && !state.firstFreeParkingLanderClaimed
          ? state.marketOpportunities.map(o => o.id === 'mo_first_free_parking' ? { ...o, claimedBy: playerId } : o)
          : state.marketOpportunities,
        log: [
          ...state.log,
          makeLog('Free Parking', `${player.name} collected Free Parking pool: $${poolAmount}${bonusAmount ? ` + $${bonusAmount} bank bonus` : ''}`, [playerId]),
          ...logs,
        ],
      };
    }

    case 'MORTGAGE_PROPERTY': {
      const prop = state.properties.find(p => p.id === action.propertyId);
      if (!prop || !prop.ownerId || prop.isMortgaged) return state;
      const owner = state.players.find(p => p.id === prop.ownerId);
      if (!owner) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === prop.ownerId ? { ...p, cash: p.cash + prop.mortgageValue } : p
        ),
        properties: state.properties.map(p =>
          p.id === action.propertyId ? { ...p, isMortgaged: true } : p
        ),
        log: [...state.log, makeLog('Mortgage', `${owner.name} mortgaged ${prop.name} for $${prop.mortgageValue}`, [owner.id])],
      };
    }

    case 'UNMORTGAGE_PROPERTY': {
      const prop = state.properties.find(p => p.id === action.propertyId);
      if (!prop || !prop.ownerId || !prop.isMortgaged) return state;
      const owner = state.players.find(p => p.id === prop.ownerId);
      if (!owner) return state;
      const cost = Math.floor(prop.mortgageValue * 1.1);
      return {
        ...state,
        players: state.players.map(p =>
          p.id === prop.ownerId ? { ...p, cash: p.cash - cost } : p
        ),
        properties: state.properties.map(p =>
          p.id === action.propertyId ? { ...p, isMortgaged: false } : p
        ),
        log: [...state.log, makeLog('Unmortgage', `${owner.name} unmortgaged ${prop.name} for $${cost}`, [owner.id])],
      };
    }

    case 'BANK_CASH': {
      const { playerId, amount, reason } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      return {
        ...state,
        players: state.players.map(p => p.id === playerId ? { ...p, cash: p.cash + amount } : p),
        log: [...state.log, makeLog('Bank → Player', `${player.name} received $${amount} from bank: ${reason}`, [playerId])],
      };
    }

    case 'PAY_BANK': {
      const { playerId, amount, reason } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      return {
        ...state,
        players: state.players.map(p => p.id === playerId ? { ...p, cash: p.cash - amount } : p),
        log: [...state.log, makeLog('Player → Bank', `${player.name} paid $${amount} to bank: ${reason}`, [playerId])],
      };
    }

    case 'TRANSFER_CASH': {
      const { fromId, toId, amount, reason } = action;
      const from = state.players.find(p => p.id === fromId);
      const to = state.players.find(p => p.id === toId);
      if (!from || !to) return state;
      return {
        ...state,
        players: state.players.map(p => {
          if (p.id === fromId) return { ...p, cash: p.cash - amount };
          if (p.id === toId) return { ...p, cash: p.cash + amount };
          return p;
        }),
        log: [...state.log, makeLog('Transfer', `${from.name} paid $${amount} to ${to.name}: ${reason}`, [fromId, toId])],
      };
    }

    case 'ELIMINATE_PLAYER': {
      const { playerId, causingPlayerId } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      const causer = causingPlayerId ? state.players.find(p => p.id === causingPlayerId) : null;

      // Cash goes to causer, properties will be handled via RECORD_AUCTION actions
      let newState: GameState = {
        ...state,
        eliminationCount: state.eliminationCount + 1,
        players: state.players.map(p => {
          if (p.id === playerId) return { ...p, isEliminated: true, cash: 0 };
          if (causer && p.id === causingPlayerId) return { ...p, cash: p.cash + player.cash };
          return p;
        }),
        // All their properties become unowned
        properties: state.properties.map(p =>
          p.ownerId === playerId ? { ...p, ownerId: null, houses: 0, hasHotel: false, isMortgaged: false } : p
        ),
        log: [...state.log, makeLog(
          'Elimination',
          `${player.name} was eliminated.${causer ? ` $${player.cash} cash transferred to ${causer.name}.` : ''} Properties returned to bank.`,
          [playerId, ...(causingPlayerId ? [causingPlayerId] : [])]
        )],
      };

      // Remove properties from player's list
      newState = {
        ...newState,
        players: newState.players.map(p =>
          p.id === playerId ? { ...p, ownedPropertyIds: [] } : p
        ),
      };

      return newState;
    }

    case 'ASSIGN_TEAM': {
      const { eliminatedPlayerId, acquiringPlayerId } = action;
      const eliminated = state.players.find(p => p.id === eliminatedPlayerId);
      const acquiring = state.players.find(p => p.id === acquiringPlayerId);
      if (!eliminated || !acquiring) return state;

      // Transfer active modifiers from eliminated to acquiring
      const transferredMods = eliminated.activeModifiers.map(m => ({ ...m }));
      const pendingVentures = eliminated.secretVenture && !eliminated.activeModifiers.some(m => m.sourceId === eliminated.secretVenture)
        ? [...acquiring.pendingAbsorbedVentures, eliminated.secretVenture]
        : acquiring.pendingAbsorbedVentures;

      return {
        ...state,
        players: state.players.map(p => {
          if (p.id === acquiringPlayerId) {
            return {
              ...p,
              absorbedPlayers: [...p.absorbedPlayers, eliminatedPlayerId],
              activeModifiers: [...p.activeModifiers, ...transferredMods],
              pendingAbsorbedVentures: pendingVentures,
            };
          }
          if (p.id === eliminatedPlayerId) {
            return { ...p, teamOf: acquiringPlayerId };
          }
          return p;
        }),
        log: [...state.log, makeLog('Team', `${eliminated.name} joined ${acquiring.name}'s team`, [eliminatedPlayerId, acquiringPlayerId])],
      };
    }

    case 'TRANSFER_PROPERTY': {
      const { propertyId, fromId, toId } = action;
      const prop = state.properties.find(p => p.id === propertyId);
      if (!prop) return state;
      return {
        ...state,
        players: state.players.map(p => {
          if (p.id === fromId) return { ...p, ownedPropertyIds: p.ownedPropertyIds.filter(id => id !== propertyId) };
          if (p.id === toId) return { ...p, ownedPropertyIds: [...p.ownedPropertyIds, propertyId] };
          return p;
        }),
        properties: state.properties.map(p =>
          p.id === propertyId ? { ...p, ownerId: toId } : p
        ),
      };
    }

    case 'INCREMENT_TURN_ROTATION': {
      return { ...state, turnRotationCount: state.turnRotationCount + 1 };
    }

    case 'USE_GOOJF': {
      const { playerId } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player || player.getOutOfJailFreeCards <= 0) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, getOutOfJailFreeCards: p.getOutOfJailFreeCards - 1 } : p
        ),
        log: [...state.log, makeLog('GOOJF', `${player.name} used a Get Out of Jail Free card`, [playerId])],
      };
    }

    case 'GIVE_GOOJF': {
      const { playerId } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, getOutOfJailFreeCards: p.getOutOfJailFreeCards + 1 } : p
        ),
        log: [...state.log, makeLog('GOOJF', `${player.name} received a Get Out of Jail Free card`, [playerId])],
      };
    }

    case 'USE_ROLL_AGAIN': {
      const { playerId } = action;
      const player = state.players.find(p => p.id === playerId);
      if (!player || player.rollAgainTokens <= 0) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, rollAgainTokens: p.rollAgainTokens - 1 } : p
        ),
        log: [...state.log, makeLog('Roll Again', `${player.name} used a Roll Again token`, [playerId])],
      };
    }

    case 'ADD_TO_FREE_PARKING_POOL': {
      return {
        ...state,
        freeParkingPool: state.freeParkingPool + action.amount,
        log: [...state.log, makeLog('Free Parking', `$${action.amount} added to pool: ${action.reason}`)],
      };
    }

    case 'ADD_LOG': {
      return {
        ...state,
        log: [...state.log, makeLog(action.action, action.detail, action.playerIds ?? [])],
      };
    }

    default:
      return state;
  }
}

function undoableGameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESET_GAME') {
    return {
      ...INITIAL_STATE,
      undoState: null,
    };
  }

  if (action.type === 'LOAD_GAME') {
    return {
      ...action.state,
      undoState: null,
    };
  }

  if (action.type === 'UNDO_LAST_ACTION') {
    if (!state.undoState) return state;
    return {
      ...state.undoState,
      undoState: null,
    };
  }

  const nextState = gameReducer(state, action);
  if (nextState === state) return state;

  return {
    ...nextState,
    undoState: stripUndoState(state),
  };
}

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────

type GameContextValue = {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  saveGame: () => void;
  loadSavedGame: () => void;
  resetGame: () => void;
  // convenience selectors
  activePlayers: Player[];
  pendingOpportunities: ReturnType<typeof checkOpportunities>;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(undoableGameReducer, undefined, () => loadSavedState() ?? INITIAL_STATE);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const saveGame = () => persistState(state);
  const loadSavedGame = () => {
    const saved = loadSavedState();
    if (saved) {
      dispatch({ type: 'LOAD_GAME', state: saved });
    }
  };
  const resetGame = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SAVE_KEY);
    }
    dispatch({ type: 'RESET_GAME' });
  };

  const activePlayers = state.players.filter(p => !p.isEliminated && !p.teamOf);
  const pendingOpportunities = checkOpportunities(state);

  return (
    <GameContext.Provider value={{ state, dispatch, saveGame, loadSavedGame, resetGame, activePlayers, pendingOpportunities }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

// Re-export engine helpers for convenience in components
export { calcNetWorth, rankPlayersByNetWorth, calculateRent, calculateTax, canBuildHouse, canBuildHotel, ownsMonopoly, ownsRailroads, ownsUtilities, houseBuildCost, goPayoutAmount, checkOpportunities, checkCorporateSponsor } from './engine';
