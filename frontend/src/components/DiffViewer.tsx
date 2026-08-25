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
    <div
      className="rounded-[10px] overflow-hidden text-[12px] bg-bg-alt border border-border font-mono"
      data-testid="diff-viewer"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-danger" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning" />
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
          </div>
          {targetFile && (
            <span className="font-mono font-bold text-[12px] text-accent">
              {targetFile}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="btn-secondary py-1 px-2.5 text-[11px] font-mono"
          data-testid="copy-diff-btn"
        >
          {copied ? '✓ Copied' : 'Copy Diff'}
        </button>
      </div>

      {/* Explanation strip */}
      {explanation && (
        <div className="px-4 py-2 text-[11px] flex items-start gap-2 bg-surface-2 border-b border-border border-l-4 border-l-accent text-text-muted font-sans leading-relaxed">
          💡 {explanation}
        </div>
      )}

      {/* Diff lines */}
      <div className="overflow-x-auto overflow-y-auto max-h-[320px] font-mono">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isAdd  = line.startsWith('+') && !line.startsWith('+++');
              const isDel  = line.startsWith('-') && !line.startsWith('---');
              const isHunk = line.startsWith('@@');
              return (
                <tr
                  key={idx}
                  className={
                    isAdd
                      ? 'bg-success/10'
                      : isDel
                      ? 'bg-danger/10'
                      : isHunk
                      ? 'bg-accent/10'
                      : 'transparent'
                  }
                >
                  <td className="select-none text-right pr-3 pl-3 font-mono text-[10px] text-text-dim w-12 border-r border-border tabular-nums">
                    {isHunk ? '…' : idx + 1}
                  </td>
                  <td
                    className={`px-3 py-0.5 whitespace-pre font-mono text-[12px] leading-relaxed ${
                      isAdd
                        ? 'text-success'
                        : isDel
                        ? 'text-danger'
                        : isHunk
                        ? 'text-accent'
                        : 'text-text-muted'
                    }`}
                  >
                    {line || '\u00a0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};