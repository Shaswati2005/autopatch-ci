import React from 'react';

export type StreamStatus = 'connecting' | 'streaming' | 'polling' | 'disconnected' | 'idle';


const STATUS_CONFIG: Record<StreamStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  glow: string;
  pulse: boolean;
  spin: boolean;
}> = {
  streaming: {
    label: 'LIVE',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.06)',
    border: 'rgba(74,222,128,0.25)',
    dot: '#4ade80',
    glow: 'rgba(74,222,128,0.5)',
    pulse: true,
    spin: false,
  },
  polling: {
    label: 'POLLING',
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.20)',
    dot: 'var(--amber)',
    glow: 'rgba(245,158,11,0.4)',
    pulse: false,
    spin: false,
  },
  connecting: {
    label: 'CONNECTING',
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.20)',
    dot: '#60a5fa',
    glow: 'rgba(59,130,246,0.5)',
    pulse: false,
    spin: true,
  },
  disconnected: {
    label: 'OFFLINE',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.06)',
    border: 'rgba(248,113,113,0.20)',
    dot: '#f87171',
    glow: 'rgba(248,113,113,0.4)',
    pulse: false,
    spin: false,
  },
  idle: {
    label: 'IDLE',
    color: 'var(--text-muted)',
    bg: 'transparent',
    border: 'rgba(255,255,255,0.07)',
    dot: 'var(--text-muted)',
    glow: 'transparent',
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
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontFamily: "'JetBrains Mono', monospace",
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s var(--ease-spring)',
        letterSpacing: '0.06em',
        fontSize: 10,
      }}
      data-testid="connection-status"
    >
      {cfg.spin ? (
        /* Spinning arc for CONNECTING */
        <span
          className="w-2 h-2 rounded-full border border-t-transparent animate-spin-slow"
          style={{
            borderColor: cfg.dot,
            borderTopColor: 'transparent',
          }}
          data-testid={status === 'connecting' ? undefined : undefined}
        />
      ) : (
        /* Dot with optional pulse ring */
        <span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{
            background: cfg.dot,
            boxShadow: cfg.pulse ? `0 0 6px ${cfg.glow}` : 'none',
            animation: cfg.pulse
              ? 'pulseRing 1.8s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite'
              : undefined,
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
        <span style={{ color: 'var(--text-muted)', marginLeft: 2, fontSize: 9 }}>
          #{runId}
        </span>
      )}
    </div>
  );
};

