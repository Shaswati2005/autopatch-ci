import React from 'react';

interface PullRequestCardProps {
  prUrl: string;
  prNumber?: number | string;
  branch?: string;
  repo?: string;
}

export const PullRequestCard: React.FC<PullRequestCardProps> = ({ prUrl, prNumber, branch, repo }) => {
  return (
    <div
      className="relative rounded-2xl p-6 overflow-hidden animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, rgba(74,222,128,0.05) 0%, rgba(139,92,246,0.07) 60%, rgba(74,222,128,0.04) 100%)',
        border: '1px solid rgba(74,222,128,0.2)',
        boxShadow: '0 0 50px rgba(74,222,128,0.07), 0 0 100px rgba(139,92,246,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      data-testid="pr-card"
    >
      {/* Ambient glow blobs */}
      <div className="absolute pointer-events-none" aria-hidden="true"
        style={{ top: '-30%', right: '-10%', width: '50%', height: '150%',
          background: 'radial-gradient(ellipse, rgba(74,222,128,0.10) 0%, transparent 70%)', filter: 'blur(20px)' }} />
      <div className="absolute pointer-events-none" aria-hidden="true"
        style={{ bottom: '-30%', left: '-10%', width: '50%', height: '150%',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.10) 0%, transparent 70%)', filter: 'blur(20px)' }} />

      {/* Top accent line */}
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.5), rgba(139,92,246,0.4), transparent)' }} />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        {/* Left content */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.3)', boxShadow: '0 0 20px rgba(74,222,128,0.2)' }}>
              {String.fromCodePoint(0x1F389)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm"
                  style={{ color: 'var(--text-primary)', fontFamily: "\'Syne\', sans-serif", fontWeight: 700 }}>
                  Pull Request Delivered
                </h3>
                {prNumber && (
                  <span className="text-xs px-2 py-0.5 rounded-md font-mono"
                    style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80',
                      border: '1px solid rgba(74,222,128,0.3)', boxShadow: '0 0 8px rgba(74,222,128,0.15)' }}>
                    #{String(prNumber)}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                AI-generated fix verified in sandbox and pushed to GitHub.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {repo && (
              <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-secondary)', fontFamily: "\'JetBrains Mono\', monospace" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                {repo}
              </div>
            )}
            {branch && (
              <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.25)',
                  color: 'var(--accent-neon)', fontFamily: "\'JetBrains Mono\', monospace" }}>
                {String.fromCodePoint(0x2387)} {branch}
              </div>
            )}
          </div>
        </div>

        {/* CTA button */}
        <a href={prUrl} target="_blank" rel="noreferrer"
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shimmer-btn"
          style={{
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: '#000',
            textDecoration: 'none',
            boxShadow: '0 4px 24px rgba(34,197,94,0.35), 0 0 0 1px rgba(74,222,128,0.2)',
            fontFamily: "\'Syne\', sans-serif",
            fontWeight: 700,
            transition: 'all 0.2s var(--ease-spring)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(34,197,94,0.5), 0 0 0 1px rgba(74,222,128,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(34,197,94,0.35), 0 0 0 1px rgba(74,222,128,0.2)';
          }}
          data-testid="view-pr-btn">
          View on GitHub
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </a>
      </div>
    </div>
  );
};
