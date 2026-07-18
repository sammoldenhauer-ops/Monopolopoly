// ============================================================
// Core Calculation Engine
// ============================================================

import type { GameState, Player, Property, PropertyGroup, Modifier } from './types';
import { GROUP_SIZES, GO_AMOUNT, RAILROAD_IDS, UTILITY_IDS } from './boardData';

// ──────────────────────────────────────────────────────────────
// Net Worth
// ──────────────────────────────────────────────────────────────

export function calcNetWorth(player: Player, properties: Property[]): number {
  const propValue = properties
    .filter(p => p.ownerId === player.id)
    .reduce((sum, p) => {
      if (p.isMortgaged) return sum + p.mortgageValue;
      const buildValue = p.hasHotel
        ? p.houseCost * 5
        : p.houses * p.houseCost;
      return sum + p.price + buildValue;
    }, 0);
  return player.cash + propValue;
}

export function rankPlayersByNetWorth(
  players: Player[],
  properties: Property[],
): Player[] {
  return [...players]
    .filter(p => !p.isEliminated && !p.teamOf)
    .sort((a, b) => calcNetWorth(b, properties) - calcNetWorth(a, properties));
}

// ──────────────────────────────────────────────────────────────
// Monopoly Detection
// ──────────────────────────────────────────────────────────────

export function ownsMonopoly(playerId: string, group: PropertyGroup, properties: Property[]): boolean {
  const groupProps = properties.filter(p => p.group === group);
  return groupProps.length > 0 && groupProps.every(p => p.ownerId === playerId);
}

export function ownsRailroads(playerId: string, properties: Property[]): number {
  return properties.filter(p => p.group === 'Railroad' && p.ownerId === playerId).length;
}

export function ownsUtilities(playerId: string, properties: Property[]): number {
  return properties.filter(p => p.group === 'Utility' && p.ownerId === playerId).length;
}

// ──────────────────────────────────────────────────────────────
// Railroad Rent
// ──────────────────────────────────────────────────────────────

function calcRailroadRent(ownedCount: number): number {
  // 1→$25, 2→$50, 3→$100, 4→$200
  return 25 * Math.pow(2, ownedCount - 1);
}

// ──────────────────────────────────────────────────────────────
// Rent Calculation
// ──────────────────────────────────────────────────────────────

export type RentCalculationResult = {
  baseAmount: number;
  finalAmount: number;
  breakdown: string[];
  diceRollNeeded: boolean; // true for utilities
};

/**
 * Calculate rent owed when `landingPlayerId` lands on `property`.
 * Pass diceRoll for utilities. Returns the final amount and breakdown.
 */
export function calculateRent(
  property: Property,
  landingPlayerId: string,
  state: GameState,
  diceRoll?: number,
): RentCalculationResult {
  const { players, properties } = state;
  const owner = players.find(p => p.id === property.ownerId);
  if (!owner || property.isMortgaged) {
    return { baseAmount: 0, finalAmount: 0, breakdown: ['Property unowned or mortgaged — no rent.'], diceRollNeeded: false };
  }
  if (property.ownerId === landingPlayerId) {
    return { baseAmount: 0, finalAmount: 0, breakdown: ['Player owns this property — no rent.'], diceRollNeeded: false };
  }

  const breakdown: string[] = [];
  let base = 0;

  if (property.group === 'Railroad') {
    const ownedRailroads = ownsRailroads(owner.id, properties);
    base = calcRailroadRent(ownedRailroads);
    breakdown.push(`Railroad rent (${ownedRailroads} owned): $${base}`);
  } else if (property.group === 'Utility') {
    // Check if Utility Provider venture is active on the owner
    const hasUtilityProvider = owner.activeModifiers.some(m => m.type === 'utility_combined_rent');
    const ownedUtils = ownsUtilities(owner.id, properties);
    const multiplier = hasUtilityProvider ? 10 : (ownedUtils === 2 ? 10 : 4);
    if (!diceRoll) {
      return {
        baseAmount: 0,
        finalAmount: 0,
        breakdown: ['Utility — dice roll required to compute rent.'],
        diceRollNeeded: true,
      };
    }
    base = multiplier * diceRoll;
    breakdown.push(`Utility rent (${multiplier}× dice roll of ${diceRoll}): $${base}`);
  } else {
    // Standard property
    if (property.hasHotel) {
      base = property.rentWithHotel;
      breakdown.push(`Hotel rent: $${base}`);
    } else if (property.houses > 0) {
      base = property.rentByHouseCount[property.houses - 1];
      breakdown.push(`${property.houses}-house rent: $${base}`);
    } else if (ownsMonopoly(owner.id, property.group, properties)) {
      base = property.rentWithMonopoly;
      breakdown.push(`Monopoly (no houses) rent: $${base}`);
    } else {
      base = property.baseRent;
      breakdown.push(`Base rent: $${base}`);
    }
  }

  let final = base;

  // Apply modifiers from the landing player (e.g., Franchisee discount)
  const landingPlayer = players.find(p => p.id === landingPlayerId);
  if (landingPlayer) {
    for (const mod of landingPlayer.activeModifiers) {
      if (mod.type === 'rent_discount' && mod.appliesAsPayer) {
        if (!mod.targetGroup || mod.targetGroup === property.group) {
          const discount = mod.value ?? 0.5;
          final = Math.floor(final * (1 - discount));
          breakdown.push(`${mod.description}: −${Math.round(discount * 100)}% → $${final}`);
        }
      }
    }
  }

  // Apply modifiers from the owner (e.g., rent surcharge)
  for (const mod of owner.activeModifiers) {
    if (mod.type === 'rent_surcharge' && !mod.appliesAsPayer) {
      if (!mod.targetGroup || mod.targetGroup === property.group) {
        const surcharge = mod.value ?? 1;
        final = Math.floor(final * surcharge);
        breakdown.push(`${mod.description}: surcharge → $${final}`);
      }
    }
  }

  return { baseAmount: base, finalAmount: final, breakdown, diceRollNeeded: false };
}

// ──────────────────────────────────────────────────────────────
// Tax Calculation
// ──────────────────────────────────────────────────────────────

export type TaxEntry = {
  player: Player;
  netWorth: number;
  taxRate: number;
  taxOwed: number;
  cashAfter: number;
  shortfall: number; // > 0 means they can't afford it
};

export function calculateTax(state: GameState): TaxEntry[] {
  const { players, properties } = state;
  const ranked = rankPlayersByNetWorth(players, properties);
  return ranked.map((player, idx) => {
    const rate = idx === 0 ? 0.10 : idx === 1 ? 0.08 : idx === 2 ? 0.06 : 0.05;
    const nw = calcNetWorth(player, properties);
    const taxOwed = Math.floor(nw * rate);
    const cashAfter = player.cash - taxOwed;
    return {
      player,
      netWorth: nw,
      taxRate: rate,
      taxOwed,
      cashAfter,
      shortfall: cashAfter < 0 ? Math.abs(cashAfter) : 0,
    };
  });
}

// ──────────────────────────────────────────────────────────────
// Building Rules
// ──────────────────────────────────────────────────────────────

export type BuildCheckResult = {
  allowed: boolean;
  reason?: string;
};

export function canBuildHouse(
  property: Property,
  state: GameState,
): BuildCheckResult {
  const { players, properties } = state;

  if (property.group === 'Railroad' || property.group === 'Utility') {
    return { allowed: false, reason: 'Cannot build on Railroads or Utilities.' };
  }
  if (!property.ownerId) {
    return { allowed: false, reason: 'Property is unowned.' };
  }
  if (!ownsMonopoly(property.ownerId, property.group, properties)) {
    return { allowed: false, reason: 'Must own the full monopoly before building.' };
  }
  if (property.hasHotel) {
    return { allowed: false, reason: 'Property already has a hotel.' };
  }
  if (property.houses >= 4) {
    return { allowed: false, reason: 'Property already has 4 houses — build a hotel instead.' };
  }
  if (state.bankHouseSupply <= 0) {
    return { allowed: false, reason: 'No houses left in the bank.' };
  }

  // Even building rule: can't build if any sibling has fewer houses
  const siblings = properties.filter(
    p => p.group === property.group && p.id !== property.id
  );
  for (const sib of siblings) {
    if (!sib.hasHotel && sib.houses < property.houses) {
      return { allowed: false, reason: `Even-building rule violated: ${sib.name} has only ${sib.houses} house(s).` };
    }
  }

  return { allowed: true };
}

export function canBuildHotel(
  property: Property,
  state: GameState,
): BuildCheckResult {
  if (property.group === 'Railroad' || property.group === 'Utility') {
    return { allowed: false, reason: 'Cannot build on Railroads or Utilities.' };
  }
  if (!property.ownerId) {
    return { allowed: false, reason: 'Property is unowned.' };
  }
  if (!ownsMonopoly(property.ownerId, property.group, property.ownerId ? state.properties : [])) {
    return { allowed: false, reason: 'Must own the full monopoly before building.' };
  }
  if (property.hasHotel) {
    return { allowed: false, reason: 'Property already has a hotel.' };
  }
  if (property.houses < 4) {
    return { allowed: false, reason: 'Must have 4 houses before building a hotel.' };
  }
  if (state.bankHotelSupply <= 0) {
    return { allowed: false, reason: 'No hotels left in the bank.' };
  }

  // Even building rule for hotels: all siblings must have 4 houses or a hotel
  const siblings = state.properties.filter(
    p => p.group === property.group && p.id !== property.id
  );
  for (const sib of siblings) {
    if (!sib.hasHotel && sib.houses < 4) {
      return { allowed: false, reason: `Even-building rule violated: ${sib.name} only has ${sib.houses} house(s).` };
    }
  }

  return { allowed: true };
}

/** Cost to build a house, accounting for Slum Lord venture discount */
export function houseBuildCost(property: Property, owner: Player): number {
  let cost = property.houseCost;

  // Slum Lord: first house on each Brown property is free
  const slumLordActive = owner.activeModifiers.some(m => m.sourceId === 'slum_lord');
  if (slumLordActive) {
    if (property.group === 'Brown' && property.houses === 0) {
      return 0;
    }
    cost = Math.floor(cost * 0.5);
  }
  return cost;
}

// ──────────────────────────────────────────────────────────────
// Corporate Sponsor auto-completion check
// ──────────────────────────────────────────────────────────────

/**
 * Returns true if the player has collected rent from all remaining (non-eliminated)
 * players, or if the only remaining uncollected player is eliminated (impossible to complete otherwise).
 */
export function checkCorporateSponsor(player: Player, allPlayers: Player[]): boolean {
  const others = allPlayers.filter(p => p.id !== player.id);
  const uncollected = others.filter(p => !player.rentCollectedFromPlayerIds.includes(p.id));
  if (uncollected.length === 0) return true;
  // If all uncollected are eliminated → auto-complete
  if (uncollected.every(p => p.isEliminated)) return true;
  return false;
}

// ──────────────────────────────────────────────────────────────
// GO payout amount (with Corporate Sponsor multiplier)
// ──────────────────────────────────────────────────────────────

export function goPayoutAmount(player: Player): number {
  let amount = GO_AMOUNT;
  for (const mod of player.activeModifiers) {
    if (mod.type === 'passive_go_multiplier') {
      amount = Math.floor(amount * (mod.value ?? 1.5));
    }
  }
  return amount;
}

// ──────────────────────────────────────────────────────────────
// Property value sum (for City Planner venture check)
// ──────────────────────────────────────────────────────────────

export function totalPropertyPurchaseValue(playerId: string, properties: Property[]): number {
  return properties
    .filter(p => p.ownerId === playerId)
    .reduce((sum, p) => sum + p.price, 0);
}

// ──────────────────────────────────────────────────────────────
// Franchisee board-side check
// ──────────────────────────────────────────────────────────────
// Board sides:
// Side 1 (Brown, LightBlue), Side 2 (Pink, Orange), Side 3 (Red, Yellow), Side 4 (Green, DarkBlue)
const BOARD_SIDES_GROUPS: PropertyGroup[][] = [
  ['Brown', 'LightBlue'],
  ['Pink', 'Orange'],
  ['Red', 'Yellow'],
  ['Green', 'DarkBlue'],
];

export function checkFranchisee(playerId: string, properties: Property[]): boolean {
  return BOARD_SIDES_GROUPS.every(side => {
    const sideProps = properties.filter(p => side.includes(p.group) && p.ownerId === playerId);
    return sideProps.length >= 2;
  });
}

// ──────────────────────────────────────────────────────────────
// Market Opportunity threshold checks
// ──────────────────────────────────────────────────────────────

export type OpportunityCheckResult = {
  opportunityId: string;
  playerId: string;
  playerName: string;
};

/**
 * After any state mutation, call this to find newly-eligible unclaimed opportunities.
 * Returns a list of (opportunityId, playerId) pairs ready to be claimed/confirmed.
 */
export function checkOpportunities(state: GameState): OpportunityCheckResult[] {
  const { players, properties, marketOpportunities } = state;
  const results: OpportunityCheckResult[] = [];

  for (const player of players.filter(p => !p.isEliminated && !p.teamOf)) {
    for (const opp of marketOpportunities) {
      if (opp.claimedBy) continue; // already claimed

      let qualified = false;
      switch (opp.id) {
        case 'mo_first_monopoly': {
          const groups = [...new Set(properties.filter(p => p.ownerId === player.id).map(p => p.group))];
          qualified = groups.some(g => ownsMonopoly(player.id, g, properties));
          break;
        }
        case 'mo_own_8_properties':
          qualified = player.ownedPropertyIds.length >= 8;
          break;
        case 'mo_own_12_properties':
          qualified = player.ownedPropertyIds.length >= 12;
          break;
        case 'mo_first_house': {
          const anyHouse = properties.some(p => (p.houses > 0 || p.hasHotel) && p.ownerId === player.id);
          qualified = anyHouse;
          break;
        }
        case 'mo_build_3_houses':
          qualified = player.housesBuiltCount >= 3;
          break;
        case 'mo_build_6_houses':
          qualified = player.housesBuiltCount >= 6;
          break;
        case 'mo_first_hotel': {
          const anyHotel = properties.some(p => p.hasHotel && p.ownerId === player.id);
          qualified = anyHotel;
          break;
        }
        case 'mo_build_3_hotels':
          qualified = player.hotelsBuiltCount >= 3;
          break;
        case 'mo_own_4_railroads':
          qualified = ownsRailroads(player.id, properties) >= 4;
          break;
        case 'mo_own_both_utilities':
          qualified = ownsUtilities(player.id, properties) >= 2;
          break;
        case 'mo_complete_3_trades':
          qualified = player.tradesCompleted >= 3;
          break;
        case 'mo_rent_from_3_players':
          qualified = player.rentCollectedFromPlayerIds.length >= 3;
          break;
        case 'mo_rent_from_6_players':
          qualified = player.rentCollectedFromPlayerIds.length >= 6;
          break;
        case 'mo_draw_3_chance':
          qualified = player.chanceDrawCount >= 3;
          break;
        case 'mo_draw_3_community_chest':
          qualified = player.communityChestDrawCount >= 3;
          break;
        case 'mo_win_3_auctions':
          qualified = player.auctionsWon >= 3;
          break;
        case 'mo_win_6_auctions':
          qualified = player.auctionsWon >= 6;
          break;
        case 'mo_pass_go_3_times':
          qualified = player.goPassCount >= 3;
          break;
        case 'mo_go_to_jail_3_times':
          qualified = player.jailVisitCount >= 3;
          break;
        // mo_first_free_parking is handled inline in Free Parking action
      }

      if (qualified) {
        results.push({ opportunityId: opp.id, playerId: player.id, playerName: player.name });
      }
    }
  }

  return results;
}
