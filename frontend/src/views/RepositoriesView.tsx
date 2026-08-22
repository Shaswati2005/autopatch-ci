import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GitBranch, Plus, Copy, Check, ExternalLink, Zap, ShieldCheck,
  RefreshCw, Lock, Globe, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, Activity, AlertTriangle
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
    case 'success': return 'text-[#5ee78a]';
    case 'failure': return 'text-[#ff7a59]';
    case 'cancelled': return 'text-[#9aa1b3]';
    default: return 'text-[#f59e0b]';
  }
}

function ConclusionIcon({ conclusion }: { conclusion: string }) {
  switch (conclusion) {
    case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-[#5ee78a]" />;
    case 'failure': return <XCircle className="w-3.5 h-3.5 text-[#ff7a59]" />;
    default: return <Clock className="w-3.5 h-3.5 text-[#f59e0b] animate-pulse" />;
  }
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({
  onTriggerCheck,
  triggering,
}) => {
  const { user, fetchUserRepos, authFetch, token } = useAuth();
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
      if (Array.isArray(data) && data.length > 0) {
        setRepos(data);
      } else {
        setRepos([{
          id: '1', name: 'Shaswati2005/autopatch-ci',
          url: 'https://github.com/Shaswati2005/autopatch-ci',
          default_branch: 'main', private: false,
          description: 'Autonomous DevOps CI/CD Repair & Self-Healing Agent',
        }]);
      }
    } catch { /* silent */ } finally {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232838]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#7553f6]">GitHub Integration</span>
            <span className="text-[#5f6580] font-mono text-xs">/</span>
            <span className="font-mono text-xs text-[#9aa1b3]">Repositories</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#f1f1f4] mt-1">
            Connected Repositories
          </h1>
          <p className="text-xs text-[#5f6580] font-mono mt-1">
            Click a repo to see live GitHub Actions runs — trigger AutoPatch on any failure
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadRepos} disabled={loading} className="btn-warp-secondary px-3 py-2 text-xs" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-warp-primary px-3.5 py-2 text-xs">
            <Plus className="w-3.5 h-3.5 text-[#0b0d14]" />
            Connect Webhook
          </button>
        </div>
      </div>

      {/* Repositories list */}
      <div className="space-y-3">
        {repos.map((repo) => {
          const isExpanded = expandedRepo === repo.name;
          const runs: WorkflowRun[] = repoRuns[repo.name] || [];
          const isLoadingRuns = loadingRuns[repo.name];
          const failingRuns = runs.filter(r => r.conclusion === 'failure');
          const successRuns = runs.filter(r => r.conclusion === 'success');

          return (
            <div key={repo.id} className="warp-card border border-[#232838] overflow-hidden hover:border-[#2e3447] transition-colors">
              {/* Repo header row */}
              <div
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => toggleRepo(repo.name)}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#11141d] border border-[#232838] flex items-center justify-center text-[#7553f6]">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="font-mono text-sm font-bold text-[#f1f1f4] hover:text-[#7553f6] flex items-center gap-1.5 transition-colors"
                        >
                          {repo.name}
                          <ExternalLink className="w-3 h-3 text-[#5f6580]" />
                        </a>
                        {repo.private
                          ? <span className="px-1.5 rounded text-[10px] font-mono bg-[#11141d] text-[#9aa1b3] border border-[#2e3447] flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> private</span>
                          : <span className="px-1.5 rounded text-[10px] font-mono bg-[#11141d] text-[#5ee78a] border border-[#2e3447] flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> public</span>
                        }
                      </div>
                      <p className="text-xs text-[#9aa1b3] mt-0.5">{repo.description || 'GitHub Repository'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#232838]">
                  {/* Run summary badges */}
                  {runs.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {failingRuns.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#ff7a59] bg-[#ff7a59]/10 px-1.5 py-0.5 rounded border border-[#ff7a59]/20">
                          <XCircle className="w-2.5 h-2.5" />{failingRuns.length}
                        </span>
                      )}
                      {successRuns.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#5ee78a] bg-[#5ee78a]/10 px-1.5 py-0.5 rounded border border-[#5ee78a]/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />{successRuns.length}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-[11px] font-mono text-[#5f6580]">
                    branch: <strong className="text-[#f1f1f4]">{repo.default_branch || 'main'}</strong>
                  </span>
                  <ChevronRight className={`w-4 h-4 text-[#5f6580] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded: live GitHub Actions runs */}
              {isExpanded && (
                <div className="border-t border-[#232838] bg-[#11141d]">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#9aa1b3] uppercase tracking-wider font-semibold">
                      GitHub Actions Runs
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5ee78a] animate-pulse" />
                      <span className="text-[10px] font-mono text-[#5ee78a]">live</span>
                      <button
                        onClick={() => loadRunsForRepo(repo.name)}
                        disabled={isLoadingRuns}
                        className="p-1 rounded hover:bg-[#1e2331] text-[#5f6580] hover:text-[#f1f1f4] transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingRuns ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isLoadingRuns ? (
                    <div className="px-5 pb-4 flex items-center gap-2 text-xs font-mono text-[#5f6580]">
                      <div className="w-3 h-3 border border-[#7553f6] border-t-transparent rounded-full animate-spin" />
                      Fetching runs from GitHub Actions API...
                    </div>
                  ) : runs.length === 0 ? (
                    <div className="px-5 pb-4 text-xs font-mono text-[#5f6580]">
                      No GitHub Actions runs found for this repository.
                    </div>
                  ) : (
                    <div className="px-4 pb-4 space-y-1.5 max-h-72 overflow-y-auto">
                      {runs.map(run => {
                        const isFailing = run.conclusion === 'failure';
                        return (
                          <div
                            key={run.id}
                            className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                              isFailing
                                ? 'bg-[#ff7a59]/5 border-[#ff7a59]/20 hover:border-[#ff7a59]/40'
                                : 'bg-[#161a25] border-[#232838] hover:border-[#2e3447]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ConclusionIcon conclusion={run.conclusion} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-[#f1f1f4] truncate max-w-[180px]">
                                    {run.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#5f6580] flex-shrink-0">#{run.id.slice(-6)}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono text-[#5f6580]">{run.branch}</span>
                                  {run.commit_sha && (
                                    <span className="text-[10px] font-mono text-[#5f6580] bg-[#0b0d14] px-1 rounded">{run.commit_sha}</span>
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
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold bg-[#7553f6] hover:bg-[#8967ff] text-white transition-colors disabled:opacity-50"
                                  title="Trigger Google ADK AutoPatch agent on this failing run"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  {triggering ? 'Fixing...' : 'Fix This Run'}
                                </button>
                              )}

                              {run.html_url && (
                                <a
                                  href={run.html_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded hover:bg-[#1e2331] text-[#5f6580] hover:text-[#f1f1f4] transition-colors"
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

                  {/* Quick-trigger button for the whole repo */}
                  <div className="px-4 pb-4 pt-2 border-t border-[#232838]">
                    <button
                      onClick={() => onTriggerCheck(repo.name, repo.default_branch || 'main', 'CI / Pytest Suite')}
                      disabled={triggering}
                      className="w-full btn-warp-secondary py-2 text-xs font-mono flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#7553f6]" />
                      {triggering ? 'AutoPatch Running...' : 'Run Full Self-Healing Check on Repo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Webhook Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0d14]/80 backdrop-blur-sm animate-fade-in-up">
          <div className="warp-card max-w-lg w-full p-6 space-y-5 bg-[#161a25] border border-[#2e3447]">
            <div className="flex items-center justify-between border-b border-[#232838] pb-3">
              <h3 className="font-mono text-sm font-bold text-[#f1f1f4]">Install GitHub CI Webhook</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#9aa1b3] hover:text-[#f1f1f4] text-xs font-mono">✕</button>
            </div>
            <div className="space-y-3 text-xs text-[#9aa1b3]">
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-[#f1f1f4]">Payload URL</label>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#11141d] border border-[#2e3447]">
                  <input readOnly value={webhookUrl} className="bg-transparent font-mono text-xs text-[#7553f6] w-full outline-none" />
                  <button onClick={copyWebhook} className="p-1 rounded bg-[#1e2331] hover:bg-[#2e3447] text-[#f1f1f4] transition-colors">
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#5ee78a]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#11141d] border border-[#232838] space-y-1 font-mono text-[11px]">
                <p className="text-[#f1f1f4] font-bold">Quick Setup Guide:</p>
                <p>1. Open Repository → <strong>Settings</strong> → <strong>Webhooks</strong></p>
                <p>2. Content type: <strong>application/json</strong></p>
                <p>3. Events: <strong>Workflow runs</strong> and <strong>Check suites</strong></p>
                <p>4. AutoPatch will auto-trigger on any <strong>workflow_run failure</strong></p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="btn-warp-primary text-xs">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
