'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { fmt$ } from '@/lib/ui';
import PlayerOverview from '@/components/PlayerOverview';
import PropertyBoard from '@/components/PropertyBoard';
import RentCalculator from '@/components/RentCalculator';
import AuctionPanel from '@/components/AuctionPanel';
import SecretVenturesPanel from '@/components/SecretVenturesPanel';
import MarketOpportunitiesPanel from '@/components/MarketOpportunitiesPanel';
import TaxPanel from '@/components/TaxPanel';
import FreeParkingPanel from '@/components/FreeParkingPanel';
import EliminationPanel from '@/components/EliminationPanel';
import GameLog from '@/components/GameLog';
import ActionsPanel from '@/components/ActionsPanel';

type Tab = 'players' | 'board' | 'rent' | 'auction' | 'actions' | 'ventures' | 'opportunities' | 'tax' | 'parking' | 'elimination' | 'log';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'players',       label: 'Players',       emoji: '👥' },
  { id: 'board',         label: 'Board',          emoji: '🏘' },
  { id: 'rent',          label: 'Rent',           emoji: '💰' },
  { id: 'auction',       label: 'Auction',        emoji: '🔨' },
  { id: 'actions',       label: 'Actions',        emoji: '⚡' },
  { id: 'ventures',      label: 'Ventures',       emoji: '🃏' },
  { id: 'opportunities', label: 'Opportunities',  emoji: '📋' },
  { id: 'tax',           label: 'Tax',            emoji: '🏦' },
  { id: 'parking',       label: 'Parking',        emoji: '🅿️' },
  { id: 'elimination',   label: 'Eliminate',      emoji: '💀' },
  { id: 'log',           label: 'Log',            emoji: '📜' },
];

export default function Dashboard() {
  const { state, activePlayers, pendingOpportunities } = useGame();
  const [tab, setTab] = useState<Tab>('players');

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold text-lg">🎲 Monopoly Scorekeeper</h1>
          <span className="text-gray-400 text-sm">Rotation #{state.turnRotationCount}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">🏠 {state.bankHouseSupply}/32</span>
          <span className="text-gray-400">🏨 {state.bankHotelSupply}/12</span>
          <span className="text-yellow-400 font-bold">🅿️ {fmt$(state.freeParkingPool)}</span>
          {pendingOpportunities.length > 0 && (
            <button
              onClick={() => setTab('opportunities')}
              className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full animate-pulse"
            >
              ⚡ {pendingOpportunities.length} pending
            </button>
          )}
        </div>
      </header>

      {/* Tab nav */}
      <nav className="bg-gray-800 border-b border-gray-700 px-2 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max py-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        {tab === 'players'       && <PlayerOverview />}
        {tab === 'board'         && <PropertyBoard />}
        {tab === 'rent'          && <RentCalculator />}
        {tab === 'auction'       && <AuctionPanel />}
        {tab === 'actions'       && <ActionsPanel />}
        {tab === 'ventures'      && <SecretVenturesPanel />}
        {tab === 'opportunities' && <MarketOpportunitiesPanel />}
        {tab === 'tax'           && <TaxPanel />}
        {tab === 'parking'       && <FreeParkingPanel />}
        {tab === 'elimination'   && <EliminationPanel />}
        {tab === 'log'           && <GameLog />}
      </main>
    </div>
  );
}
