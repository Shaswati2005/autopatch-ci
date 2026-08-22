import React, { useState } from 'react';
import { 
  GitBranch, 
  ShieldCheck, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Settings, 
  RefreshCw,
  Terminal,
  AlertCircle
} from 'lucide-react';

interface Repository {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
  workflowName: string;
  active: boolean;
  lastChecked: string;
  status: 'protected' | 'paused' | 'pending';
}

const INITIAL_REPOS: Repository[] = [
  {
    id: 'repo-1',
    name: 'Shaswati2005/autopatch-ci',
    url: 'https://github.com/Shaswati2005/autopatch-ci',
    defaultBranch: 'main',
    workflowName: 'AutoPatch-CI Build & Verification Pipeline',
    active: true,
    lastChecked: '2 mins ago',
    status: 'protected',
  },
  {
    id: 'repo-2',
    name: 'dasbidyendu/billing-core',
    url: 'https://github.com/dasbidyendu/billing-core',
    defaultBranch: 'main',
    workflowName: 'CI / Pytest Suite',
    active: true,
    lastChecked: '14 mins ago',
    status: 'protected',
  },
  {
    id: 'repo-3',
    name: 'acme/auth-service',
    url: 'https://github.com/acme/auth-service',
    defaultBranch: 'develop',
    workflowName: 'CI / Auth Integration',
    active: true,
    lastChecked: '1 hour ago',
    status: 'protected',
  },
];

interface RepositoriesViewProps {
  onTriggerCheck: (repoName: string, branch: string, workflowName: string) => void;
  triggering: boolean;
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({
  onTriggerCheck,
  triggering,
}) => {
  const [repos, setRepos] = useState<Repository[]>(INITIAL_REPOS);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin.replace(':3000', ':8000')}/api/webhooks/github` 
    : 'http://localhost:8000/api/webhooks/github';
  const webhookSecret = 'autopatch_live_sec_8921x';

  const toggleRepo = (id: string) => {
    setRepos(repos.map((r) => r.id === id ? { ...r, active: !r.active, status: !r.active ? 'protected' : 'paused' } : r));
  };

  const copyToClipboard = (text: string, isSecret = false) => {
    navigator.clipboard.writeText(text);
    if (isSecret) {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#f0faf4]">
            Connected GitHub Repositories
          </h1>
          <p className="text-xs sm:text-sm text-[#94b8a3] mt-1">
            AutoPatch-CI monitors GitHub Actions workflows on these repositories and initiates autonomous healing on failure.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn-solarpunk-primary px-4 py-2.5 text-xs font-display flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#041208]" />
          Connect Repository
        </button>
      </div>

      {/* Repositories List */}
      <div className="grid grid-cols-1 gap-4">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="solar-card rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#1b3022] hover:border-[#2d543a] transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00f59b]/10 border border-[#00f59b]/30 flex items-center justify-center text-[#00f59b]">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-display font-bold text-base text-[#f0faf4] hover:text-[#00f59b] transition-colors flex items-center gap-1.5"
                    >
                      {repo.name}
                      <ExternalLink className="w-3.5 h-3.5 text-[#557562]" />
                    </a>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                      repo.active
                        ? 'bg-[#00f59b]/15 text-[#00f59b] border-[#00f59b]/30'
                        : 'bg-[#ff5c5c]/10 text-[#ff5c5c] border-[#ff5c5c]/30'
                    }`}>
                      {repo.active ? '● LIVE PROTECTION' : '○ PAUSED'}
                    </span>
                  </div>
                  <p className="text-xs text-[#94b8a3] font-mono mt-0.5">
                    CI Workflow: <strong className="text-[#f0faf4]">{repo.workflowName}</strong> • Branch: <strong className="text-[#f5b700]">{repo.defaultBranch}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#1b3022]">
              <button
                onClick={() => onTriggerCheck(repo.name, repo.defaultBranch, repo.workflowName)}
                disabled={triggering}
                className="btn-solarpunk-primary px-4 py-2 text-xs font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-[#041208]" />
                {triggering ? 'Verifying...' : 'Test CI Workflow'}
              </button>

              <button
                onClick={() => toggleRepo(repo.id)}
                className={`px-3 py-2 rounded-xl text-xs font-mono transition-all border ${
                  repo.active
                    ? 'bg-[#0b140e] border-[#1b3022] text-[#94b8a3] hover:text-[#ff5c5c]'
                    : 'bg-[#00f59b]/10 border-[#00f59b]/30 text-[#00f59b]'
                }`}
              >
                {repo.active ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Connect Repository Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060b08]/80 backdrop-blur-md animate-fade-in-up">
          <div className="solar-card rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 border border-[#00f59b]/30 shadow-[0_0_50px_rgba(0,245,155,0.15)] bg-[#0b140e]">
            
            <div className="flex items-center justify-between border-b border-[#1b3022] pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#00f59b]" />
                <h3 className="font-display font-bold text-lg text-[#f0faf4]">
                  Connect GitHub Webhook
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#94b8a3] hover:text-[#f0faf4] font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#94b8a3]">
              <p>
                Add this webhook to your GitHub repository to enable autonomous failure interception:
              </p>

              {/* Webhook URL Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#f0faf4]">Payload URL</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#060b08] border border-[#1b3022]">
                  <input
                    readOnly
                    value={webhookUrl}
                    className="bg-transparent font-mono text-xs text-[#00f59b] w-full outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="p-1.5 rounded-lg bg-[#15261b] hover:bg-[#00f59b]/20 text-[#00f59b] transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Secret Token */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#f0faf4]">Secret (HMAC-SHA256)</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#060b08] border border-[#1b3022]">
                  <input
                    readOnly
                    value={webhookSecret}
                    className="bg-transparent font-mono text-xs text-[#f5b700] w-full outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookSecret, true)}
                    className="p-1.5 rounded-lg bg-[#15261b] hover:bg-[#f5b700]/20 text-[#f5b700] transition-colors"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Setup steps */}
              <div className="p-3.5 rounded-xl bg-[#060b08] border border-[#1b3022] space-y-1.5 text-[11px] font-mono">
                <p className="text-[#f0faf4] font-semibold">GitHub Setup Checklist:</p>
                <p>1. Go to Repo ➔ <strong>Settings</strong> ➔ <strong>Webhooks</strong> ➔ <strong>Add webhook</strong></p>
                <p>2. Set Content type to <strong>application/json</strong></p>
                <p>3. Select: <strong>Workflow runs</strong> and <strong>Check runs</strong></p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="btn-solarpunk-primary px-5 py-2.5 text-xs font-mono"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
