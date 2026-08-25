import React, { useState } from 'react';

interface TerminalOutputProps {
  output: string;
  passed?: boolean;
  durationSeconds?: number;
  title?: string;
}

type LineColor = 'green' | 'red' | 'lilac' | 'amber' | 'dim' | 'default';

function getLineColor(line: string): LineColor {
  const t = line.trim();
  if (!t) return 'dim';
  if (/PASSED|passed|✓|SUCCESS|100%|all tests passed/i.test(t))  return 'green';
  if (/FAILED|failed|✕|ERROR|FAILURE|assert|traceback|exception/i.test(t)) return 'red';
  if (/warning/i.test(t))                                          return 'amber';
  if (/^running|^collecting|^installing|^fetching|^applying|^verifying|^starting/i.test(t)) return 'lilac';
  if (/^={3,}|^-{3,}|^_{3,}/.test(t))                            return 'dim';
  if (/^\$|^❯/.test(t))                                           return 'lilac';
  return 'default';
}

const LINE_COLORS: Record<LineColor, string> = {
  green:   '#5ee78a',
  red:     '#f6827d',
  lilac:   '#8967ff',
  amber:   '#ff7a59',
  dim:     '#5f6580',
  default: '#f1f1f4',
};

function parseSummary(output: string): { total: number; passed: number; failed: number } | null {
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
      className="rounded-[10px] overflow-hidden bg-bg-alt border border-border font-mono text-[12px]"
      data-testid="terminal-output"
    >
      {/* Title Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-surface border-b border-border select-none">
        {/* Left: traffic lights + session title */}
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-danger" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning" />
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
          </div>
          <span className="text-[12px] font-mono text-text-muted">
            {title} — bash
          </span>
          {passed !== undefined && (
            <span
              className={`ml-2 px-2 py-0.2 rounded text-[10px] font-bold font-mono ${
                passed ? 'bg-success/15 text-success border border-success/30' : 'bg-danger/15 text-danger border border-danger/30'
              }`}
            >
              {passed ? '✓ PASSED' : '✕ FAILED'}
            </span>
          )}
        </div>

        {/* Right: copy button */}
        <button
          onClick={handleCopy}
          className="btn-secondary py-1 px-2.5 text-[11px] font-mono"
          data-testid="copy-logs-btn"
        >
          {copied ? '✓ Copied' : 'Copy Logs'}
        </button>
      </div>

      {/* Output Area */}
      <div className="p-4 max-h-[260px] overflow-y-auto overflow-x-auto leading-relaxed text-[12px] bg-bg-alt">
        {/* Shell prompt */}
        <div className="mb-1.5 flex gap-2">
          <span className="text-success">❯</span>
          <span className="text-accent">autopatch-ci</span>
          <span className="text-text">verify --sandbox</span>
        </div>

        {/* Colorized lines */}
        {lines.map((line, i) => {
          const color = LINE_COLORS[getLineColor(line)];
          return (
            <div key={i} style={{ color }} className="min-h-[1.2em]">
              {line || '\u00A0'}
            </div>
          );
        })}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 flex items-center gap-4 text-[11px] font-mono text-text-dim bg-surface border-t border-border tabular-nums">
        {exitCode !== undefined && (
          <span className={`font-semibold ${exitCode === 0 ? 'text-success' : 'text-danger'}`}>
            exit {exitCode}
          </span>
        )}

        {summary && (
          <>
            <span className="text-success">{summary.passed} passed</span>
            {summary.failed > 0 && <span className="text-danger">{summary.failed} failed</span>}
            <span>{summary.total} total</span>
          </>
        )}

        {durationSeconds !== undefined && (
          <span className="ml-auto text-text-muted">
            {durationSeconds.toFixed(2)}s
          </span>
        )}
      </div>
    </div>
  );
};
