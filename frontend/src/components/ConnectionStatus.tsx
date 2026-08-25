import React from 'react';

export type StreamStatus = 'connecting' | 'streaming' | 'polling' | 'disconnected' | 'idle';

const STATUS_CONFIG: Record<StreamStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  pulse: boolean;
  spin: boolean;
}> = {
  streaming: {
    label: 'LIVE',
    color: '#5ee78a',
    bg: 'rgba(94, 231, 138, 0.12)',
    border: 'rgba(94, 231, 138, 0.35)',
    dot: '#5ee78a',
    pulse: true,
    spin: false,
  },
  polling: {
    label: 'POLLING',
    color: '#ff7a59',
    bg: 'rgba(255, 122, 89, 0.10)',
    border: 'rgba(255, 122, 89, 0.30)',
    dot: '#ff7a59',
    pulse: false,
    spin: false,
  },
  connecting: {
    label: 'CONNECTING',
    color: '#7553f6',
    bg: 'rgba(117, 83, 246, 0.12)',
    border: 'rgba(117, 83, 246, 0.30)',
    dot: '#7553f6',
    pulse: false,
    spin: true,
  },
  disconnected: {
    label: 'OFFLINE',
    color: '#f6827d',
    bg: 'rgba(246, 130, 125, 0.10)',
    border: 'rgba(246, 130, 125, 0.30)',
    dot: '#f6827d',
    pulse: false,
    spin: false,
  },
  idle: {
    label: 'IDLE',
    color: '#9aa1b3',
    bg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    dot: '#9aa1b3',
    pulse: false,
    spin: false,
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
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        letterSpacing: '0.04em',
      }}
      data-testid="connection-status"
    >
      {cfg.spin ? (
        <span
          className="w-2 h-2 rounded-full border border-t-transparent animate-spin"
          style={{
            borderColor: cfg.dot,
            borderTopColor: 'transparent',
          }}
        />
      ) : (
        <span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{
            background: cfg.dot,
          }}
          data-testid={
            status === 'streaming' ? 'streaming-indicator'
            : status === 'polling' ? 'polling-indicator'
            : undefined
          }
        />
      )}

      {cfg.label}

      {status === 'streaming' && runId && (
        <span className="text-text-dim ml-0.5 text-[9px] tabular-nums">
          #{runId}
        </span>
      )}
    </div>
  );
};
