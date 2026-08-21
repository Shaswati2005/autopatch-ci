import React, { useState } from 'react';

interface TerminalOutputProps {
  output: string;
  passed?: boolean;
  durationSeconds?: number;
  title?: string;
}

/* ─── Line colorizer — interprets real CI/test output ─────────────────────── */
type LineColor = 'green' | 'red' | 'cyan' | 'amber' | 'blue' | 'dim' | 'default';

function getLineColor(line: string): LineColor {
  const t = line.trim();
  if (!t) return 'dim';
  if (/PASSED|passed|✓|SUCCESS|100%|all tests passed/i.test(t))  return 'green';
  if (/FAILED|failed|✕|ERROR|FAILURE|assert|traceback|exception/i.test(t)) return 'red';
  if (/warning/i.test(t))                                          return 'amber';
  if (/^running|^collecting|^installing|^fetching|^applying|^verifying|^starting/i.test(t)) return 'cyan';
  if (/^={3,}|^-{3,}|^_{3,}/.test(t))                            return 'dim';
  if (/^\$|^❯/.test(t))                                           return 'blue';
  return 'default';
}

const LINE_COLORS: Record<LineColor, string> = {
  green:   '#3fb950',
  red:     '#f85149',
  cyan:    '#58a6ff',
  amber:   '#d29922',
  blue:    '#79c0ff',
  dim:     '#484f58',
  default: '#c9d1d9',
};

/* ─── Parse summary from output for the status bar ───────────────────────── */
function parseSummary(output: string): { total: number; passed: number; failed: number } | null {
  // Matches: "5 passed", "3 failed", "5 passed, 2 failed"
  const passed = output.match(/(\d+)\s+passed/i)?.[1];
  const failed = output.match(/(\d+)\s+failed/i)?.[1];
  if (!passed && !failed) return null;
  const p = parseInt(passed ?? '0', 10);
  const f = parseInt(failed ?? '0', 10);
  return { total: p + f, passed: p, failed: f };
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({
  output,
  passed,
  durationSeconds,
  title = 'sandbox-verify',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines  = output.split('\n');
  const summary = parseSummary(output);
  const exitCode = passed === undefined ? undefined : passed ? 0 : 1;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: '#0a0a0a',
        border: '1px solid #1c1c1c',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: '12px',
      }}
      data-testid="terminal-output"
    >
      {/* ── Title Bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#161616',
          borderBottom: '1px solid #222',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        {/* Left: traffic lights + session title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', boxShadow: '0 0 4px rgba(255,95,87,0.6)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', boxShadow: '0 0 4px rgba(254,188,46,0.5)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', boxShadow: '0 0 4px rgba(40,200,64,0.5)' }} />
          </div>
          <span style={{ color: '#555', fontSize: 11, letterSpacing: '0.02em' }}>
            {title} — bash
          </span>
          {/* Inline PASSED/FAILED badge */}
          {passed !== undefined && (
            <span style={{
              marginLeft: 6,
              padding: '1px 8px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              background: passed ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)',
              color:       passed ? '#3fb950'              : '#f85149',
              border:      `1px solid ${passed ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
            }}>
              {passed ? '✓ PASSED' : '✕ FAILED'}
            </span>
          )}
        </div>

        {/* Right: copy button */}
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'rgba(63,185,80,0.10)' : 'transparent',
            color:       copied ? '#3fb950'             : '#484f58',
            border:      `1px solid ${copied ? 'rgba(63,185,80,0.3)' : '#2a2a2a'}`,
            borderRadius: 5,
            padding: '2px 10px',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          data-testid="copy-logs-btn"
          onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#888'; }}
          onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#484f58'; }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* ── Output Area ────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        {/* Subtle scanline overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)',
          }}
        />
        <pre
          style={{
            margin: 0,
            padding: '14px 16px',
            maxHeight: '240px',
            overflowY: 'auto',
            overflowX: 'auto',
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            position: 'relative',
            zIndex: 0,
          }}
        >
          {/* Shell invocation prompt */}
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: '#3fb950' }}>❯</span>
            <span style={{ color: '#58a6ff' }}> autopatch-ci</span>
            <span style={{ color: '#c9d1d9' }}> verify --sandbox</span>
          </div>

          {/* Colorized output lines */}
          {lines.map((line, i) => {
            const color = LINE_COLORS[getLineColor(line)];
            return (
              <div key={i} style={{ color, minHeight: '1em' }}>
                {line || '\u00A0'}
              </div>
            );
          })}

          {/* Blinking block cursor */}
          <span style={{
            display: 'inline-block',
            width: 8, height: '1em',
            background: '#c9d1d9',
            verticalAlign: 'text-bottom',
            marginLeft: 2,
            animation: 'termBlink 1.1s step-start infinite',
          }} aria-hidden="true" />
        </pre>
      </div>

      {/* ── Status Bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#111',
          borderTop: '1px solid #1e1e1e',
          padding: '5px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 10,
          color: '#484f58',
          letterSpacing: '0.04em',
        }}
      >
        {/* Exit code */}
        {exitCode !== undefined && (
          <span style={{ color: exitCode === 0 ? '#3fb950' : '#f85149' }}>
            exit {exitCode}
          </span>
        )}

        {/* Test summary */}
        {summary && (
          <>
            <span style={{ color: '#3fb950' }}>{summary.passed} passed</span>
            {summary.failed > 0 && <span style={{ color: '#f85149' }}>{summary.failed} failed</span>}
            <span>{summary.total} total</span>
          </>
        )}

        {/* Duration */}
        {durationSeconds !== undefined && (
          <span style={{ marginLeft: 'auto' }}>
            {durationSeconds.toFixed(2)}s
          </span>
        )}
      </div>
    </div>
  );
};

