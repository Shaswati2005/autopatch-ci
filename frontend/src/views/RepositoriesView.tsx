import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GitBranch, Plus, Copy, Check, ExternalLink, Zap,
  RefreshCw, Lock, Globe, ChevronRight,
  CheckCircle2, XCircle, Clock
} from 'lucide-react';

interface RepositoriesViewProps {
  onTriggerCheck: (repoName: string, branch: string, workflowName: string, runId?: string) => void;
  triggering: boolean;
}

interface WorkflowRun {
  id: string;
  name: string;
  status: string;
  conclusion: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  html_url: string;
  created_at: string;
  actor?: { login: string; avatar_url: string } | null;
}

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)) ||
  'http://localhost:8000';

function conclusionColor(c: string) {
  switch (c) {
    case 'success': return 'text-success';
    case 'failure': return 'text-danger';
    case 'cancelled': return 'text-text-dim';
    default: return 'text-warning';
  }
}

function ConclusionIcon({ conclusion }: { conclusion: string }) {
  switch (conclusion) {
    case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
    case 'failure': return <XCircle className="w-3.5 h-3.5 text-danger" />;
    default: return <Clock className="w-3.5 h-3.5 text-warning" />;
  }
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({
  onTriggerCheck,
  triggering,
}) => {
  const { fetchUserRepos, authFetch, token } = useAuth();
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  const [repoRuns, setRepoRuns] = useState<Record<string, WorkflowRun[]>>({});
  const [loadingRuns, setLoadingRuns] = useState<Record<string, boolean>>({});

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin.replace(':3000', ':8000')}/api/webhooks/github`
      : 'http://localhost:8000/api/webhooks/github';

  const loadRepos = async () => {
    setLoading(true);
    try {
      const data = await fetchUserRepos();
      if (Array.isArray(data)) {
        setRepos(data);
      } else {
        setRepos([]);
      }
    } catch {
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRunsForRepo = useCallback(async (repoName: string) => {
    const [owner, repo] = repoName.split('/');
    if (!owner || !repo) return;
    setLoadingRuns(prev => ({ ...prev, [repoName]: true }));
    try {
      const res = await authFetch(
        `${API_BASE}/api/github/repos/${owner}/${repo}/actions/runs?per_page=10${token ? `&token=${encodeURIComponent(token)}` : ''}`
      );
      if (res.ok) {
        const data = await res.json();
        setRepoRuns(prev => ({ ...prev, [repoName]: data.workflow_runs || [] }));
      }
    } catch { /* silent */ } finally {
      setLoadingRuns(prev => ({ ...prev, [repoName]: false }));
    }
  }, [authFetch, token]);

  useEffect(() => { loadRepos(); }, []);

  useEffect(() => {
    if (expandedRepo) loadRunsForRepo(expandedRepo);
  }, [expandedRepo, loadRunsForRepo]);

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const toggleRepo = (repoName: string) => {
    setExpandedRepo(prev => prev === repoName ? null : repoName);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono">
            <span className="text-accent">GitHub Integration</span>
            <span className="text-text-dim">/</span>
            <span className="text-text-muted">Repositories</span>
          </div>
          <h1 className="font-headline text-[24px] sm:text-[26px] text-text font-semibold mt-1 tracking-tight">
            Connected Repositories
          </h1>
          <p className="text-[12px] text-text-dim font-mono mt-0.5">
            Click a repository to inspect GitHub Actions runs and trigger AutoPatch on failures
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={loadRepos} disabled={loading} className="btn-secondary text-[12px]" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-[12px]">
            <Plus className="w-3.5 h-3.5 text-bg" />
            Connect Webhook
          </button>
        </div>
      </div>

      {/* Repositories list */}
      <div className="space-y-3">
        {repos.length === 0 && !loading && (
          <div className="warp-card p-8 text-center space-y-3 bg-surface border border-border">
            <div className="w-12 h-12 rounded-[10px] bg-accent-soft/20 border border-border flex items-center justify-center mx-auto text-accent-soft">
              <GitBranch className="w-6 h-6" />
            </div>
            <h3 className="font-mono text-[14px] font-semibold text-text">No Repositories Found</h3>
            <p className="text-[12px] text-text-muted font-sans max-w-sm mx-auto">
              Your GitHub account does not have any repositories yet or access was not granted.
            </p>
          </div>
        )}

        {repos.map((repo) => {
          const isExpanded = expandedRepo === repo.name;
          const runs: WorkflowRun[] = repoRuns[repo.name] || [];
          const isLoadingRuns = loadingRuns[repo.name];
          const failingRuns = runs.filter(r => r.conclusion === 'failure');
          const successRuns = runs.filter(r => r.conclusion === 'success');

          return (
            <div key={repo.id} className="warp-card overflow-hidden hover:border-border-strong transition-colors">
              {/* Repo header row */}
              <div
                className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => toggleRepo(repo.name)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] bg-surface-2 border border-border flex items-center justify-center text-accent">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="font-mono text-[14px] font-bold text-text hover:text-accent flex items-center gap-1.5 transition-colors"
                        >
                          {repo.name}
                          <ExternalLink className="w-3 h-3 text-text-dim" />
                        </a>
                        {repo.private
                          ? <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-bg-alt text-text-muted border border-border flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> private</span>
                          : <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-bg-alt text-success border border-border flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> public</span>
                        }
                      </div>
                      <p className="text-[12px] text-text-muted mt-0.5">{repo.description || 'GitHub Repository'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-border">
                  {/* Run summary badges */}
                  {runs.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {failingRuns.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20 tabular-nums">
                          <XCircle className="w-2.5 h-2.5" />{failingRuns.length}
                        </span>
                      )}
                      {successRuns.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-success bg-success/10 px-2 py-0.5 rounded border border-success/20 tabular-nums">
                          <CheckCircle2 className="w-2.5 h-2.5" />{successRuns.length}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-[11px] font-mono text-text-dim">
                    branch: <strong className="text-text">{repo.default_branch || 'main'}</strong>
                  </span>
                  <ChevronRight className={`w-4 h-4 text-text-dim transition-transform ${isExpanded ? 'rotate-90 text-accent' : ''}`} />
                </div>
              </div>

              {/* Expanded: live GitHub Actions runs */}
              {isExpanded && (
                <div className="border-t border-border bg-bg-alt">
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold">
                      GitHub Actions Runs
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-[10px] font-mono text-success">live</span>
                      <button
                        onClick={() => loadRunsForRepo(repo.name)}
                        disabled={isLoadingRuns}
                        className="p-1 rounded hover:bg-surface-2 text-text-dim hover:text-text transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingRuns ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isLoadingRuns ? (
                    <div className="px-4 pb-4 flex items-center gap-2 text-[12px] font-mono text-text-dim">
                      <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Fetching runs from GitHub Actions API...
                    </div>
                  ) : runs.length === 0 ? (
                    <div className="px-4 pb-4 text-[12px] font-mono text-text-dim">
                      No GitHub Actions runs found for this repository.
                    </div>
                  ) : (
                    <div className="px-4 pb-4 space-y-2 max-h-72 overflow-y-auto">
                      {runs.map(run => {
                        const isFailing = run.conclusion === 'failure';
                        return (
                          <div
                            key={run.id}
                            className={`p-3 rounded-[8px] border flex items-center justify-between gap-3 transition-colors ${
                              isFailing
                                ? 'bg-danger/5 border-danger/30'
                                : 'bg-surface border-border'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ConclusionIcon conclusion={run.conclusion} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] font-mono font-bold text-text truncate max-w-[180px]">
                                    {run.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-text-dim flex-shrink-0">#{run.id.slice(-6)}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono text-text-dim">{run.branch}</span>
                                  {run.commit_sha && (
                                    <span className="text-[10px] font-mono text-text-dim bg-bg-alt px-1.5 py-0.2 rounded">{run.commit_sha}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[10px] font-mono font-bold ${conclusionColor(run.conclusion)}`}>
                                {run.conclusion === 'in_progress' ? 'running' : run.conclusion}
                              </span>

                              {isFailing && (
                                <button
                                  onClick={() => onTriggerCheck(repo.name, run.branch, run.name, run.id)}
                                  disabled={triggering}
                                  className="btn-primary py-1 px-2.5 text-[10px] font-mono font-bold"
                                  title="Trigger Google ADK AutoPatch agent on this failing run"
                                >
                                  <Zap className="w-2.5 h-2.5 text-bg" />
                                  {triggering ? 'Fixing...' : 'Fix Run'}
                                </button>
                              )}

                              {run.html_url && (
                                <a
                                  href={run.html_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded hover:bg-surface-2 text-text-dim hover:text-text transition-colors"
                                  title="View on GitHub"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick trigger button for the whole repo */}
                  <div className="px-4 pb-4 pt-2 border-t border-border">
                    <button
                      onClick={() => onTriggerCheck(repo.name, repo.default_branch || 'main', 'CI / Pytest Suite')}
                      disabled={triggering}
                      className="w-full btn-secondary py-2 text-[12px] font-mono flex items-center justify-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5 text-accent" />
                      {triggering ? 'AutoPatch Running...' : 'Run Self-Healing Check on Repo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Webhook Modal with modal-warp elevation */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="modal-warp max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-mono text-[14px] font-bold text-text">Install GitHub CI Webhook</h3>
              <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text text-[12px] font-mono">✕</button>
            </div>
            <div className="space-y-3 text-[12px] text-text-muted">
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-text font-medium">Payload URL</label>
                <div className="flex items-center gap-2 p-2 rounded-[8px] bg-bg-alt border border-border-strong">
                  <input readOnly value={webhookUrl} className="bg-transparent font-mono text-[12px] text-accent w-full outline-none" />
                  <button onClick={copyWebhook} className="p-1.5 rounded-[6px] bg-surface-2 hover:bg-surface text-text transition-colors">
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-[8px] bg-bg-alt border border-border space-y-1 font-mono text-[11px]">
                <p className="text-text font-bold">Quick Setup Guide:</p>
                <p>1. Open Repository → <strong>Settings</strong> → <strong>Webhooks</strong></p>
                <p>2. Content type: <strong>application/json</strong></p>
                <p>3. Events: <strong>Workflow runs</strong> and <strong>Check suites</strong></p>
                <p>4. AutoPatch will auto-trigger on any <strong>workflow_run failure</strong></p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="btn-primary text-[12px]">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
