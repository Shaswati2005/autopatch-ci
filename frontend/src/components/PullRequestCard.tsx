import React from 'react';
import { CheckCircle2, GitPullRequest, ExternalLink } from 'lucide-react';

interface PullRequestCardProps {
  prUrl: string;
  prNumber?: number | string;
  branch?: string;
  repo?: string;
}

export const PullRequestCard: React.FC<PullRequestCardProps> = ({ prUrl, prNumber, branch, repo }) => {
  return (
    <div
      className="rounded-[10px] p-5 bg-surface border border-success/30 font-sans"
      data-testid="pr-card"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left content */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] flex items-center justify-center text-success bg-success/15 border border-success/30 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-[14px] tracking-tight text-text">
                  Pull Request Delivered
                </h3>
                {prNumber && (
                  <span className="text-[11px] px-2 py-0.2 rounded font-mono font-bold bg-bg-alt text-success border border-success/30 tabular-nums">
                    #{String(prNumber)}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-text-muted">
                AI-generated fix verified in sandbox and pushed to GitHub.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            {repo && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-bg-alt border border-border text-text">
                <GitPullRequest className="w-3 h-3 text-text-dim" />
                {repo}
              </div>
            )}
            {branch && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-surface-2 border border-border-strong text-accent font-medium">
                ⎇ {branch}
              </div>
            )}
          </div>
        </div>

        {/* CTA button */}
        <a
          href={prUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary py-2 px-4 text-[12px] font-medium shrink-0 flex items-center gap-1.5"
          data-testid="view-pr-btn"
        >
          View on GitHub
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
