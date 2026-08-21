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
  title = 'Sandbox Verification Logs',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-xl overflow-hidden text-xs"
      style={{ border: '1px solid #1a1a1a', background: '#0c0c0c' }}
      data-testid="terminal-output"
    >
      {/* Terminal header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: '#111111', borderBottom: '1px solid #1f1f1f' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
          </div>
          <span style={{ color: '#444', fontFamily: "'JetBrains Mono', monospace" }}>{title}</span>

          <div className="flex items-center gap-2 ml-2">
            {passed !== undefined && (
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{
                  background: passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: passed ? '#22c55e' : '#ef4444',
                  border: `1px solid ${passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {passed ? '✓ PASSED' : '✕ FAILED'}
              </span>
            )}
            {durationSeconds !== undefined && (
              <span style={{ color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>
                {durationSeconds.toFixed(2)}s
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all"
          style={{
            background: copied ? 'rgba(34,197,94,0.1)' : '#1a1a1a',
            color: copied ? '#22c55e' : '#555',
            border: '1px solid #222',
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer',
          }}
          data-testid="copy-logs-btn"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Output */}
      <pre
        className="p-4 overflow-auto"
        style={{
          maxHeight: '220px',
          color: '#33ff33',
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: '1.7',
          fontSize: '11px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: 0,
        }}
      >
        <span style={{ color: '#555' }}>$ </span>{output}
      </pre>
    </div>
  );
};
