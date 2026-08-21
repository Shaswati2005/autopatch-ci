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
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        background: '#0d1017',
        backdropFilter: 'blur(12px)',
      }}
      data-testid="diff-viewer"
    >
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: '#111722',
          borderBottom: '1px solid rgba(139,92,246,0.15)',
          position: 'relative',
        }}
      >
        {/* Purple left accent stripe */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
            background: 'linear-gradient(to bottom, #a78bfa, #7c3aed)',
            borderRadius: '12px 0 0 0',
          }}
        />
        <div className="flex items-center gap-3 pl-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57', boxShadow: '0 0 4px rgba(255,95,87,0.5)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e', boxShadow: '0 0 4px rgba(254,188,46,0.4)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28c840', boxShadow: '0 0 4px rgba(40,200,64,0.4)' }} />
          </div>
          {targetFile && (
            <span style={{ color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              {targetFile}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
          style={{
            background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
            color: copied ? '#4ade80' : '#6b7280',
            border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          data-testid="copy-diff-btn"
          onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#c084fc'; }}
          onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* ── Explanation strip ─────────────────────────────────────────────── */}
      {explanation && (
        <div
          className="px-4 py-2.5 text-xs flex items-start gap-2"
          style={{
            background: 'rgba(139,92,246,0.06)',
            borderBottom: '1px solid rgba(139,92,246,0.15)',
            borderLeft: '3px solid #7c3aed',
            color: '#c084fc',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          💡 {explanation}
        </div>
      )}

      {/* ── Diff lines ───────────────────────────────────────────────────── */}
      <div
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: '280px', fontFamily: "'JetBrains Mono', monospace" }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isAdd  = line.startsWith('+') && !line.startsWith('+++');
              const isDel  = line.startsWith('-') && !line.startsWith('---');
              const isHunk = line.startsWith('@@');
              return (
                <tr
                  key={idx}
                  style={{
                    background: isAdd
                      ? 'rgba(74,222,128,0.08)'
                      : isDel
                      ? 'rgba(248,113,113,0.08)'
                      : isHunk
                      ? 'rgba(96,165,250,0.06)'
                      : 'transparent',
                  }}
                >
                  <td
                    className="select-none text-right pr-4 pl-4"
                    style={{ color: '#2a2f3a', width: '3rem', borderRight: '1px solid rgba(255,255,255,0.04)', userSelect: 'none', fontSize: 10 }}
                  >
                    {isHunk ? '…' : idx + 1}
                  </td>
                  <td
                    className="px-4 py-0.5 whitespace-pre"
                    style={{
                      color: isAdd ? '#4ade80' : isDel ? '#f87171' : isHunk ? '#60a5fa' : '#c9d1d9',
                      lineHeight: '1.75',
                    }}
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