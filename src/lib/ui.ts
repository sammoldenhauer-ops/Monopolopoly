import type { PropertyGroup } from '@/lib/types';

export const GROUP_COLORS: Record<PropertyGroup, { bg: string; text: string; border: string }> = {
  Brown:    { bg: 'bg-amber-900',   text: 'text-white',   border: 'border-amber-900' },
  LightBlue:{ bg: 'bg-sky-300',     text: 'text-sky-900', border: 'border-sky-300' },
  Pink:     { bg: 'bg-pink-400',    text: 'text-white',   border: 'border-pink-400' },
  Orange:   { bg: 'bg-orange-500',  text: 'text-white',   border: 'border-orange-500' },
  Red:      { bg: 'bg-red-600',     text: 'text-white',   border: 'border-red-600' },
  Yellow:   { bg: 'bg-yellow-400',  text: 'text-yellow-900', border: 'border-yellow-400' },
  Green:    { bg: 'bg-green-600',   text: 'text-white',   border: 'border-green-600' },
  DarkBlue: { bg: 'bg-blue-800',    text: 'text-white',   border: 'border-blue-800' },
  Railroad: { bg: 'bg-gray-700',    text: 'text-white',   border: 'border-gray-700' },
  Utility:  { bg: 'bg-teal-600',    text: 'text-white',   border: 'border-teal-600' },
};

export const GROUP_LABEL: Record<PropertyGroup, string> = {
  Brown: 'Brown', LightBlue: 'Light Blue', Pink: 'Pink', Orange: 'Orange',
  Red: 'Red', Yellow: 'Yellow', Green: 'Green', DarkBlue: 'Dark Blue',
  Railroad: 'Railroad', Utility: 'Utility',
};

export function fmt$(n: number) {
  return `$${n.toLocaleString()}`;
}

export function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
