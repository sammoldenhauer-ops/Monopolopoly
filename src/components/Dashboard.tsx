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
import LandingPanel from '@/components/LandingPanel';
import TurnTracker from '@/components/TurnTracker';

type Tab = 'landing' | 'players' | 'board' | 'rent' | 'auction' | 'actions' | 'ventures' | 'opportunities' | 'tax' | 'parking' | 'elimination' | 'log';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'landing',       label: 'Play',          emoji: '🎯' },
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

type ConfirmKey = 'save' | 'load' | 'new' | null;

function HeaderConfirmButton({
  label,
  confirmLabel,
  colorClass,
  confirmKey,
  pendingConfirm,
  setPendingConfirm,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  colorClass: string;
  confirmKey: Exclude<ConfirmKey, null>;
  pendingConfirm: ConfirmKey;
  setPendingConfirm: (key: ConfirmKey) => void;
  onConfirm: () => void;
}) {
  const isPending = pendingConfirm === confirmKey;

  if (isPending) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => { onConfirm(); setPendingConfirm(null); }}
          className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold"
        >
          {confirmLabel}
        </button>
        <button
          onClick={() => setPendingConfirm(null)}
          className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1 rounded"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setPendingConfirm(confirmKey)}
      className={`${colorClass} text-white text-xs px-2 py-1 rounded`}
    >
      {label}
    </button>
  );
}

export default function Dashboard() {
  const { state, activePlayers, pendingOpportunities, saveGame, loadSavedGame, resetGame } = useGame();
  const [tab, setTab] = useState<Tab>('landing');
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmKey>(null);

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
          <HeaderConfirmButton
            label="Save"
            confirmLabel="Confirm Save"
            colorClass="bg-green-700 hover:bg-green-600"
            confirmKey="save"
            pendingConfirm={pendingConfirm}
            setPendingConfirm={setPendingConfirm}
            onConfirm={saveGame}
          />
          <HeaderConfirmButton
            label="Load"
            confirmLabel="Confirm Load"
            colorClass="bg-blue-700 hover:bg-blue-600"
            confirmKey="load"
            pendingConfirm={pendingConfirm}
            setPendingConfirm={setPendingConfirm}
            onConfirm={loadSavedGame}
          />
          <HeaderConfirmButton
            label="New"
            confirmLabel="Confirm New"
            colorClass="bg-gray-700 hover:bg-gray-600"
            confirmKey="new"
            pendingConfirm={pendingConfirm}
            setPendingConfirm={setPendingConfirm}
            onConfirm={resetGame}
          />
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

      {/* Turn tracker */}
      <TurnTracker onJumpToTax={() => setTab('tax')} />

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
        {tab === 'landing'       && <LandingPanel onNavigateToTax={() => setTab('tax')} />}
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
