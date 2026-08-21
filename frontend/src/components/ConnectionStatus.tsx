import React from 'react';

export type StreamStatus = 'connecting' | 'streaming' | 'polling' | 'disconnected' | 'idle';

interface ConnectionStatusProps {
  status: StreamStatus;
  runId?: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, runId }) => {
  return (
    <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border bg-slate-900/90 border-slate-800 shadow-sm" data-testid="connection-status">
      {status === 'streaming' && (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" data-testid="streaming-indicator"></span>
          <span className="text-emerald-400 font-semibold">SSE LIVE STREAM</span>
          {runId && <span className="text-slate-500">#{runId}</span>}
        </>
      )}
      {status === 'polling' && (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" data-testid="polling-indicator"></span>
          <span className="text-amber-400 font-medium">POLLING MODE (2s)</span>
        </>
      )}
      {status === 'connecting' && (
        <>
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          <span className="text-sky-400 font-medium">CONNECTING SSE...</span>
        </>
      )}
      {status === 'disconnected' && (
        <>
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span className="text-rose-400 font-medium">OFFLINE / RETRYING</span>
        </>
      )}
      {status === 'idle' && (
        <>
          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          <span className="text-slate-400 font-medium">IDLE</span>
        </>
      )}
    </div>
  );
};
