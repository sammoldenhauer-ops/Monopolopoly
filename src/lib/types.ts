// ============================================================
// Core Types for Monopoly Scorekeeper
// ============================================================

export type PropertyGroup =
  | 'Brown'
  | 'LightBlue'
  | 'Pink'
  | 'Orange'
  | 'Red'
  | 'Yellow'
  | 'Green'
  | 'DarkBlue'
  | 'Railroad'
  | 'Utility';

export type SecretVentureId =
  | 'diplomatic_immunity'
  | 'corporate_sponsor'
  | 'franchisee'
  | 'conductor'
  | 'luck_of_the_draw'
  | 'utility_provider'
  | 'slum_lord'
  | 'city_planner';

export type MarketOpportunityId =
  | 'mo_first_monopoly'
  | 'mo_own_8_properties'
  | 'mo_own_12_properties'
  | 'mo_first_house'
  | 'mo_build_3_houses'
  | 'mo_build_6_houses'
  | 'mo_first_hotel'
  | 'mo_build_3_hotels'
  | 'mo_own_4_railroads'
  | 'mo_own_both_utilities'
  | 'mo_complete_3_trades'
  | 'mo_rent_from_3_players'
  | 'mo_rent_from_6_players'
  | 'mo_draw_3_chance'
  | 'mo_draw_3_community_chest'
  | 'mo_win_3_auctions'
  | 'mo_win_6_auctions'
  | 'mo_pass_go_3_times'
  | 'mo_go_to_jail_3_times'
  | 'mo_first_free_parking';

// Modifier effect types
export type ModifierType =
  | 'rent_discount'           // landing player pays less rent (as payer)
  | 'rent_surcharge'          // landing player pays more rent (owner benefit)
  | 'passive_go_multiplier'   // multiply GO amount for owner
  | 'build_discount'          // reduce house/hotel build cost
  | 'first_house_free'        // first house on brown properties is free
  | 'jail_immunity'           // player can never go to jail
  | 'move_choice'             // player can choose single-die movement
  | 'railroad_teleport'       // player can teleport between railroads
  | 'card_skip_move'          // player can skip movement and draw a card
  | 'utility_combined_rent'   // both utilities charge combined rent
  | 'team_bonus_placeholder'; // placeholder for future team bonuses

export type Modifier = {
  sourceId: SecretVentureId | MarketOpportunityId;
  type: ModifierType;
  description: string;
  /** for rent_discount / rent_surcharge: which property group (null = all) */
  targetGroup?: PropertyGroup | null;
  /** multiplier or flat value depending on type */
  value?: number;
  /** whether this modifier applies when this player is the PAYER (true) or OWNER (false) */
  appliesAsPayer?: boolean;
};

export type Player = {
  id: string;
  name: string;
  cash: number;
  isEliminated: boolean;
  /** player id this player has been absorbed into */
  teamOf: string | null;
  /** ids of players who have joined this player's team */
  absorbedPlayers: string[];
  ownedPropertyIds: string[];
  secretVenture: SecretVentureId | null;
  /** ventures from absorbed players not yet revealed */
  pendingAbsorbedVentures: SecretVentureId[];
  activeModifiers: Modifier[];
  marketOpportunitiesClaimed: MarketOpportunityId[];
  // counters
  rentCollectedFromPlayerIds: string[]; // distinct player ids
  rentPaidToPlayerIds: string[];        // distinct player ids
  tradesCompleted: number;
  chanceDrawCount: number;
  communityChestDrawCount: number;
  auctionsWon: number;
  goPassCount: number;
  jailVisitCount: number;
  getOutOfJailFreeCards: number;
  housesBuiltCount: number;
  hotelsBuiltCount: number;
  rollAgainTokens: number;
};

export type Property = {
  id: string;
  name: string;
  group: PropertyGroup;
  price: number;
  baseRent: number;
  rentWithMonopoly: number;
  rentByHouseCount: [number, number, number, number]; // 1-4 houses
  rentWithHotel: number;
  houseCost: number;
  mortgageValue: number;
  ownerId: string | null;
  houses: number; // 0-4
  hasHotel: boolean;
  isMortgaged: boolean;
};

export type MarketOpportunity = {
  id: MarketOpportunityId;
  title: string;
  description: string;
  claimedBy: string | null; // player id
  /** For counter-based: threshold to reach */
  threshold?: number;
  /** reward type */
  rewardType: 'cash' | 'free_house' | 'goojf' | 'roll_again';
  rewardAmount?: number;
};

export type SecretVenture = {
  id: SecretVentureId;
  name: string;
  achievementDescription: string;
  effectDescription: string;
};

export type AuctionRecord = {
  propertyId: string;
  winnerId: string;
  amount: number;
  timestamp: number;
};

export type LogEntry = {
  id: string;
  timestamp: number;
  action: string;
  detail: string;
  involvedPlayerIds: string[];
};

export type GamePhase = 'setup' | 'playing' | 'ended';

export type GameState = {
  phase: GamePhase;
  players: Player[];
  properties: Property[];
  marketOpportunities: MarketOpportunity[];
  freeParkingPool: number;
  bankHouseSupply: number;
  bankHotelSupply: number;
  turnRotationCount: number;
  firstFreeParkingLanderClaimed: boolean;
  eliminationCount: number;
  log: LogEntry[];
  /** franchisee targets: playerId -> propertyGroup they are immune-discounted on */
  franchiseeTargets: Record<string, PropertyGroup>;
};
