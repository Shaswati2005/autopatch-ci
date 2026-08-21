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
      className="relative rounded-2xl p-6 overflow-hidden animate-fade-in-up"
      style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(124,106,245,0.08) 100%)',
        border: '1px solid rgba(34,197,94,0.25)',
        boxShadow: '0 0 40px rgba(34,197,94,0.08), 0 0 80px rgba(124,106,245,0.05)',
      }}
      data-testid="pr-card"
    >
      {/* Glow blobs */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,106,245,0.1) 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        {/* Left */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-base"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              🎉
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Pull Request Delivered
                {prNumber && (
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded-md font-mono"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}
                  >
                    #{prNumber}
                  </span>
                )}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Code fix and regression tests verified in sandbox and pushed to GitHub.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-10">
            {repo && (
              <div
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                {repo}
              </div>
            )}
            {branch && (
              <div
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                style={{
                  background: 'var(--accent-glow)',
                  border: '1px solid rgba(124,106,245,0.25)',
                  color: 'var(--accent)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                ⎇ {branch}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <a
          href={prUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: 'var(--green)',
            color: '#000',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
          }}
          data-testid="view-pr-btn"
        >
          View on GitHub
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </a>
      </div>
    </div>
  );
};
