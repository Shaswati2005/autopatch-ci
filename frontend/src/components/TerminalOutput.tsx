import React, { useState } from 'react';

interface TerminalOutputProps {
  output: string;
  passed?: boolean;
  durationSeconds?: number;
  title?: string;
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({
  output,
  passed,
  durationSeconds,
  title = 'Cloud Build Sandbox Logs',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs shadow-inner" data-testid="terminal-output">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-slate-300 font-semibold text-[11px] ml-1">{title}</span>
          {passed !== undefined && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                passed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {passed ? '✓ PASSED' : '✕ FAILED'}
            </span>
          )}
          {durationSeconds !== undefined && (
            <span className="text-slate-500 text-[10px]">{durationSeconds.toFixed(2)}s</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          data-testid="copy-logs-btn"
        >
          {copied ? '✓ Copied' : 'Copy Logs'}
        </button>
      </div>

      <pre className="p-3 text-slate-300 overflow-x-auto max-h-64 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
        {output}
      </pre>
    </div>
  );
};
