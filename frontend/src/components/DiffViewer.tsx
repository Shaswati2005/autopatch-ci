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
      className="rounded-xl overflow-hidden text-xs"
      style={{ border: '1px solid var(--border)', background: '#0d1117' }}
      data-testid="diff-viewer"
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}
      >
        <div className="flex items-center gap-3">
          {/* macOS dots */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
          </div>
          {targetFile && (
            <span style={{ color: '#8b949e', fontFamily: "'JetBrains Mono', monospace" }}>
              {targetFile}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all"
          style={{
            background: copied ? 'rgba(34,197,94,0.15)' : '#21262d',
            color: copied ? '#22c55e' : '#8b949e',
            border: '1px solid #30363d',
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer',
          }}
          data-testid="copy-diff-btn"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {explanation && (
        <div
          className="px-4 py-2.5 text-xs"
          style={{
            background: 'rgba(124,106,245,0.08)',
            borderBottom: '1px solid rgba(124,106,245,0.2)',
            color: '#a78bfa',
            fontStyle: 'italic',
          }}
        >
          💡 {explanation}
        </div>
      )}

      {/* Diff lines */}
      <div
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: '280px', fontFamily: "'JetBrains Mono', monospace" }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isAdd = line.startsWith('+') && !line.startsWith('+++');
              const isDel = line.startsWith('-') && !line.startsWith('---');
              const isHunk = line.startsWith('@@');

              return (
                <tr
                  key={idx}
                  style={{
                    background: isAdd ? 'rgba(34,197,94,0.1)' : isDel ? 'rgba(239,68,68,0.1)' : isHunk ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}
                >
                  <td
                    className="select-none text-right pr-4 pl-4"
                    style={{ color: '#4a5568', width: '3rem', borderRight: '1px solid #21262d', userSelect: 'none' }}
                  >
                    {isHunk ? '...' : idx + 1}
                  </td>
                  <td className="px-4 py-0.5 whitespace-pre" style={{
                    color: isAdd ? '#4ade80' : isDel ? '#f87171' : isHunk ? '#60a5fa' : '#e6edf3',
                    lineHeight: '1.7',
                  }}>
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
