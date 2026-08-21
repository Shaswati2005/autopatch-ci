import React from 'react';

interface PullRequestCardProps {
  prUrl: string;
  prNumber?: number | string;
  branch?: string;
  repo?: string;
}

export const PullRequestCard: React.FC<PullRequestCardProps> = ({
  prUrl,
  prNumber,
  branch,
  repo,
}) => {
  return (
    <div
      className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-xl p-6 shadow-xl"
      data-testid="pr-card"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <h3 className="text-base font-bold text-emerald-300">
              Autonomous Pull Request Delivered
            </h3>
            {prNumber && (
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-500/30">
                #{prNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300">
            Source fix & regression unit tests successfully verified in sandbox and pushed to GitHub.
          </p>
          {(branch || repo) && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
              {repo && <span>Repo: <span className="text-slate-200">{repo}</span></span>}
              {branch && <span>Branch: <span className="text-emerald-400">{branch}</span></span>}
            </div>
          )}
        </div>
        <a
          href={prUrl}
          target="_blank"
          rel="noreferrer"
          className="whitespace-nowrap bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center gap-1.5"
          data-testid="view-pr-btn"
        >
          View PR on GitHub ↗
        </a>
      </div>
    </div>
  );
};
