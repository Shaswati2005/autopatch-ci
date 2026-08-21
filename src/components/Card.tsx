import React from 'react';

interface CardProps {
  id: number;
  title: string;
  count: number;
}

export const Card: React.FC<CardProps> = ({ id, title, count }) => {
  return (
    <div className="rounded-xl p-4 border border-zinc-800 bg-zinc-900 text-white">
      <h3 className="font-semibold text-sm">{title} #{id}</h3>
      <span className="text-xs text-zinc-400">Count: {Number(count)}</span>
    </div>
  );
};
