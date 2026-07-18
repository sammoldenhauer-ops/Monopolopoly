'use client';
import { useState } from 'react';
import { useGame } from '@/lib/gameStore';
import { ownsMonopoly } from '@/lib/engine';
import { GROUP_COLORS, GROUP_LABEL, fmt$ } from '@/lib/ui';
import type { PropertyGroup } from '@/lib/types';

const GROUP_ORDER: PropertyGroup[] = [
  'Brown', 'LightBlue', 'Pink', 'Orange', 'Red', 'Yellow', 'Green', 'DarkBlue', 'Railroad', 'Utility',
];

export default function PropertyBoard() {
  const { state, dispatch } = useGame();
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [buildMode, setBuildMode] = useState<'house' | 'hotel' | null>(null);

  function handleBuild(propId: string, mode: 'house' | 'hotel') {
    if (mode === 'house') dispatch({ type: 'BUILD_HOUSE', propertyId: propId });
    else dispatch({ type: 'BUILD_HOTEL', propertyId: propId });
    setBuildMode(null);
    setSelectedPropId(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Property Board</h2>
        <div className="flex gap-3 text-sm text-gray-400">
          <span>🏠 Houses: {state.bankHouseSupply}/32</span>
          <span>🏨 Hotels: {state.bankHotelSupply}/12</span>
        </div>
      </div>

      {GROUP_ORDER.map(group => {
        const props = state.properties.filter(p => p.group === group);
        return (
          <div key={group} className="rounded-lg overflow-hidden border border-gray-700">
            <div className={`${GROUP_COLORS[group].bg} ${GROUP_COLORS[group].text} px-3 py-1.5 text-sm font-semibold`}>
              {GROUP_LABEL[group]}
            </div>
            <div className="divide-y divide-gray-700">
              {props.map(prop => {
                const owner = prop.ownerId ? state.players.find(p => p.id === prop.ownerId) : null;
                const isMonopoly = owner && ownsMonopoly(owner.id, prop.group, state.properties);
                const isSelected = selectedPropId === prop.id;

                return (
                  <div
                    key={prop.id}
                    className={`bg-gray-800 hover:bg-gray-750 cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                    onClick={() => setSelectedPropId(isSelected ? null : prop.id)}
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${GROUP_COLORS[group].bg}`} />
                        <span className="text-white text-sm truncate">{prop.name}</span>
                        {prop.isMortgaged && (
                          <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded shrink-0">MORT</span>
                        )}
                        {isMonopoly && !prop.isMortgaged && (
                          <span className="text-xs text-yellow-400 shrink-0">★</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {/* Houses / Hotel */}
                        <div className="text-center min-w-[40px]">
                          {prop.hasHotel
                            ? <span className="text-red-400 font-bold text-sm">🏨</span>
                            : prop.houses > 0
                            ? <span className="text-green-400 text-xs">{'🏠'.repeat(prop.houses)}</span>
                            : <span className="text-gray-600 text-xs">—</span>
                          }
                        </div>
                        {/* Owner */}
                        <div className="text-right min-w-[80px]">
                          {owner
                            ? <span className="text-blue-300 text-xs font-medium">{owner.name}</span>
                            : <span className="text-gray-500 text-xs">Unowned</span>
                          }
                        </div>
                        {/* Price / current rent */}
                        <div className="text-right min-w-[60px]">
                          <div className="text-gray-300 text-xs">{fmt$(prop.price)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail row */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-1 bg-gray-750 border-t border-gray-700 text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300">
                          {prop.group !== 'Railroad' && prop.group !== 'Utility' && (
                            <>
                              <span>Base rent: {fmt$(prop.baseRent)}</span>
                              <span>Monopoly rent: {fmt$(prop.rentWithMonopoly)}</span>
                              <span>1 house: {fmt$(prop.rentByHouseCount[0])}</span>
                              <span>2 houses: {fmt$(prop.rentByHouseCount[1])}</span>
                              <span>3 houses: {fmt$(prop.rentByHouseCount[2])}</span>
                              <span>4 houses: {fmt$(prop.rentByHouseCount[3])}</span>
                              <span>Hotel: {fmt$(prop.rentWithHotel)}</span>
                              <span>House cost: {fmt$(prop.houseCost)}</span>
                            </>
                          )}
                          {prop.group === 'Railroad' && (
                            <>
                              <span>1 RR: $25</span>
                              <span>2 RR: $50</span>
                              <span>3 RR: $100</span>
                              <span>4 RR: $200</span>
                            </>
                          )}
                          {prop.group === 'Utility' && (
                            <>
                              <span>1 utility: 4× dice roll</span>
                              <span>2 utilities: 10× dice roll</span>
                            </>
                          )}
                          <span>Mortgage value: {fmt$(prop.mortgageValue)}</span>
                        </div>

                        {/* Build / mortgage actions */}
                        {owner && !prop.isMortgaged && prop.group !== 'Railroad' && prop.group !== 'Utility' && isMonopoly && (
                          <div className="flex gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); handleBuild(prop.id, 'house'); }}
                              className="bg-green-700 hover:bg-green-600 text-white text-xs px-2 py-1 rounded"
                            >
                              + House
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleBuild(prop.id, 'hotel'); }}
                              className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                            >
                              + Hotel
                            </button>
                          </div>
                        )}
                        {owner && !prop.isMortgaged && (prop.houses === 0 && !prop.hasHotel) && (
                          <button
                            onClick={e => { e.stopPropagation(); dispatch({ type: 'MORTGAGE_PROPERTY', propertyId: prop.id }); }}
                            className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1 rounded"
                          >
                            Mortgage (+{fmt$(prop.mortgageValue)})
                          </button>
                        )}
                        {owner && prop.isMortgaged && (
                          <button
                            onClick={e => { e.stopPropagation(); dispatch({ type: 'UNMORTGAGE_PROPERTY', propertyId: prop.id }); }}
                            className="bg-yellow-700 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded"
                          >
                            Unmortgage (−{fmt$(Math.floor(prop.mortgageValue * 1.1))})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
