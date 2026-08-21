import React from 'react';

export type StreamStatus = 'connecting' | 'streaming' | 'polling' | 'disconnected' | 'idle';


const STATUS_CONFIG: Record<StreamStatus, { label: string; color: string; bg: string; border: string; dot: string; pulse: boolean }> = {
  streaming: {
    label: 'LIVE',
    color: 'var(--green)',
    bg: 'var(--green-dim)',
    border: 'rgba(34,197,94,0.25)',
    dot: 'var(--green)',
    pulse: true,
  },
  polling: {
    label: 'POLLING',
    color: 'var(--amber)',
    bg: 'var(--amber-dim)',
    border: 'rgba(245,158,11,0.25)',
    dot: 'var(--amber)',
    pulse: false,
  },
  connecting: {
    label: 'CONNECTING',
    color: 'var(--blue)',
    bg: 'var(--blue-dim)',
    border: 'rgba(59,130,246,0.25)',
    dot: 'var(--blue)',
    pulse: false,
  },
  disconnected: {
    label: 'OFFLINE',
    color: 'var(--red)',
    bg: 'var(--red-dim)',
    border: 'rgba(239,68,68,0.25)',
    dot: 'var(--red)',
    pulse: false,
  },
  idle: {
    label: 'IDLE',
    color: 'var(--text-muted)',
    bg: 'transparent',
    border: 'var(--border)',
    dot: 'var(--text-muted)',
    pulse: false,
  },
};

interface ConnectionStatusProps {
  status: StreamStatus;
  runId?: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, runId }) => {
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontFamily: "'JetBrains Mono', monospace",
        transition: 'all 0.2s',
      }}
      data-testid="connection-status"
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: cfg.dot,
          boxShadow: cfg.pulse ? `0 0 0 0 ${cfg.dot}` : undefined,
          animation: cfg.pulse ? 'pulse-ring 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite' : undefined,
        }}
        data-testid={status === 'streaming' ? 'streaming-indicator' : status === 'polling' ? 'polling-indicator' : undefined}
      />
      {cfg.label}
      {status === 'streaming' && runId && (
        <span style={{ color: 'var(--text-muted)', marginLeft: 2 }}>#{runId}</span>
      )}
    </div>
  );
};
