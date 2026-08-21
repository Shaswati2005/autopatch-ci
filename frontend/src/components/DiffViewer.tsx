import React, { useState } from 'react';

interface DiffViewerProps {
  diff: string;
  targetFile?: string;
  explanation?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, targetFile, explanation }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diff.split('\n');

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/90 overflow-hidden font-mono text-xs shadow-inner" data-testid="diff-viewer">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">📝 Patch Diff:</span>
          {targetFile && <span className="text-slate-400 text-[11px] bg-slate-800 px-2 py-0.5 rounded">{targetFile}</span>}
        </div>
        <button
          onClick={handleCopy}
          className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          data-testid="copy-diff-btn"
        >
          {copied ? '✓ Copied' : 'Copy Diff'}
        </button>
      </div>

      {explanation && (
        <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-800/80 text-slate-300 text-xs italic">
          💡 {explanation}
        </div>
      )}

      <div className="p-3 overflow-x-auto max-h-72 leading-relaxed space-y-0.5">
        {lines.map((line, idx) => {
          let lineStyle = 'text-slate-400';
          let bgStyle = '';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineStyle = 'text-emerald-400';
            bgStyle = 'bg-emerald-950/30';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineStyle = 'text-rose-400';
            bgStyle = 'bg-rose-950/30';
          } else if (line.startsWith('@@')) {
            lineStyle = 'text-sky-400 font-semibold';
            bgStyle = 'bg-sky-950/20';
          }

          return (
            <div key={idx} className={`flex font-mono px-2 py-0.5 rounded ${bgStyle}`}>
              <span className="w-8 select-none text-slate-600 text-right pr-3">{idx + 1}</span>
              <span className={`${lineStyle} whitespace-pre`}>{line || ' '}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
