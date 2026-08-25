import React from 'react';
import { TraceStep } from '../types';
import { DiffViewer } from './DiffViewer';
import { TerminalOutput } from './TerminalOutput';

const STAGE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  INGESTED:            { icon: '📡', label: 'Event Ingested',   color: '#9aa1b3' },
  LOGS_PARSED:         { icon: '🔍', label: 'Logs Diagnosed',  color: '#7553f6' },
  PATCH_GENERATED:     { icon: '🤖', label: 'Patch Generated', color: '#8967ff' },
  VERIFYING:           { icon: '⚙️', label: 'Verifying…',     color: '#ff7a59' },
  VERIFIED:            { icon: '✅', label: 'Verified',        color: '#5ee78a' },
  VERIFICATION_PASSED: { icon: '✅', label: 'Verified',        color: '#5ee78a' },
  VERIFICATION_FAILED: { icon: '❌', label: 'Verify Failed',   color: '#f6827d' },
  PR_CREATED:          { icon: '🚀', label: 'PR Delivered',    color: '#5ee78a' },
  FAILED:              { icon: '💥', label: 'Pipeline Failed', color: '#f6827d' },
};

interface PipelineTimelineProps {
  traces: TraceStep[];
}

export const PipelineTimeline: React.FC<PipelineTimelineProps> = ({ traces }) => {
  if (traces.length === 0) return null;

  return (
    <div className="space-y-0">
      {traces.map((step, idx) => {
        const cfg = STAGE_CONFIG[step.stage] ?? {
          icon: '◆', label: step.stage,
          color: '#9aa1b3',
        };
        const isPatch        = step.stage === 'PATCH_GENERATED' && step.payload?.diff;
        const isVerification = (step.stage === 'VERIFIED' || step.stage === 'VERIFICATION_PASSED' || step.stage === 'VERIFICATION_FAILED') && step.payload?.test_output;
        const isLast         = idx === traces.length - 1;

        return (
          <div
            key={step.step_id || idx}
            className="relative flex gap-3.5"
            data-testid={`trace-step-${idx}`}
          >
            {/* Connector Line */}
            {!isLast && (
              <div
                className="absolute z-0"
                style={{
                  left: 17, top: 36, bottom: 0,
                  width: 2,
                  backgroundColor: '#232838',
                }}
              />
            )}

            {/* Stage Icon */}
            <div
              className="relative flex-shrink-0 w-9 h-9 rounded-[8px] flex items-center justify-center z-10 mt-0.5 bg-surface-2 border text-[14px]"
              style={{
                borderColor: cfg.color,
              }}
            >
              {cfg.icon}
            </div>

            {/* Content card: Warp surface pattern */}
            <div className="flex-1 pb-4">
              <div className="warp-card p-4 bg-surface border border-border">
                {/* Header row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-mono font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${cfg.color}15`,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}35`,
                      }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[13px] font-medium text-text">
                      {step.title}
                    </span>
                  </div>
                  <span className="text-[11px] hidden sm:block text-text-dim font-mono tabular-nums">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Detail text */}
                <p className="text-[12px] leading-relaxed text-text-muted">
                  {step.detail}
                </p>

                {/* Rich diff */}
                {isPatch && step.payload && (
                  <div className="mt-3">
                    <DiffViewer
                      diff={step.payload.diff!}
                      targetFile={step.payload.target_file}
                      explanation={step.payload.explanation}
                    />
                  </div>
                )}

                {/* Terminal output */}
                {isVerification && step.payload && (
                  <div className="mt-3">
                    <TerminalOutput
                      output={step.payload.test_output!}
                      passed={Boolean(step.payload.passed ?? true)}
                      durationSeconds={Number(step.payload.duration_s || 0)}
                    />
                  </div>
                )}

                {/* Generic key-value payload */}
                {!isPatch && !isVerification && step.payload && Object.keys(step.payload).length > 0 && (
                  <div className="mt-3 rounded-[8px] p-3 text-[11px] font-mono space-y-1 bg-bg-alt border border-border">
                    {Object.entries(step.payload).map(([k, v]) => (
                      <div key={k} className="flex gap-2.5 items-center">
                        <span className="text-text-dim flex-shrink-0">{k}:</span>
                        {typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://')) ? (
                          <a
                            href={v}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-accent hover:text-accent-hover transition-colors"
                            style={{ wordBreak: 'break-all' }}
                          >
                            {v} ↗
                          </a>
                        ) : (
                          <span className="text-text" style={{ wordBreak: 'break-all' }}>{String(v)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
