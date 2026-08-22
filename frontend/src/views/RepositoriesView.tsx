import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GitBranch, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  ShieldCheck, 
  RefreshCw,
  Terminal,
  Lock,
  Globe
} from 'lucide-react';

interface RepositoriesViewProps {
  onTriggerCheck: (repoName: string, branch: string, workflowName: string) => void;
  triggering: boolean;
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({
  onTriggerCheck,
  triggering,
}) => {
  const { user, fetchUserRepos } = useAuth();
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace(':3000', ':8000')}/api/webhooks/github`
    : 'http://localhost:8000/api/webhooks/github';

  const loadRepos = async () => {
    setLoading(true);
    try {
      const data = await fetchUserRepos();
      if (Array.isArray(data) && data.length > 0) {
        setRepos(data);
      } else {
        setRepos([
          {
            id: '1',
            name: 'Shaswati2005/autopatch-ci',
            url: 'https://github.com/Shaswati2005/autopatch-ci',
            default_branch: 'main',
            private: false,
            description: 'Autonomous DevOps CI/CD Repair & Self-Healing Agent powered by Gemini',
          }
        ]);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
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
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRepos}
            disabled={loading}
            className="btn-warp-secondary px-3 py-2 text-xs"
            title="Refresh GitHub repositories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-warp-primary px-3.5 py-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#0b0d14]" />
            Connect Webhook
          </button>
        </div>
      </div>

      {/* Repositories List */}
      <div className="space-y-3">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="warp-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-[#2e3447] transition-colors"
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
                      className="font-mono text-sm font-bold text-[#f1f1f4] hover:text-[#7553f6] flex items-center gap-1.5 transition-colors"
                    >
                      {repo.name}
                      <ExternalLink className="w-3 h-3 text-[#5f6580]" />
                    </a>
                    {repo.private ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#11141d] text-[#9aa1b3] border border-[#2e3447] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> private
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#11141d] text-[#5ee78a] border border-[#2e3447] flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> public
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9aa1b3] mt-0.5">
                    {repo.description || 'GitHub Repository protected by AutoPatch-CI'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#232838]">
              <span className="text-[11px] font-mono text-[#5f6580]">
                branch: <strong className="text-[#f1f1f4]">{repo.default_branch || 'main'}</strong>
              </span>

              <button
                onClick={() => onTriggerCheck(repo.name, repo.default_branch || 'main', 'CI / Pytest Suite')}
                disabled={triggering}
                className="btn-warp-primary text-xs"
              >
                <Zap className="w-3.5 h-3.5 text-[#0b0d14]" />
                {triggering ? 'Verifying...' : 'Run Self-Healing Check'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0d14]/80 backdrop-blur-sm animate-fade-in-up">
          <div className="warp-card max-w-lg w-full p-6 space-y-5 bg-[#161a25] border border-[#2e3447]">
            <div className="flex items-center justify-between border-b border-[#232838] pb-3">
              <h3 className="font-mono text-sm font-bold text-[#f1f1f4]">
                Install GitHub CI Webhook
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#9aa1b3] hover:text-[#f1f1f4] text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#9aa1b3]">
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-[#f1f1f4]">Payload URL</label>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#11141d] border border-[#2e3447]">
                  <input
                    readOnly
                    value={webhookUrl}
                    className="bg-transparent font-mono text-xs text-[#7553f6] w-full outline-none"
                  />
                  <button
                    onClick={copyWebhook}
                    className="p-1 rounded bg-[#1e2331] hover:bg-[#2e3447] text-[#f1f1f4] transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#5ee78a]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#11141d] border border-[#232838] space-y-1 font-mono text-[11px]">
                <p className="text-[#f1f1f4] font-bold">Quick Setup Guide:</p>
                <p>1. Open Repository ➔ <strong>Settings</strong> ➔ <strong>Webhooks</strong></p>
                <p>2. Set Content type: <strong>application/json</strong></p>
                <p>3. Select: <strong>Workflow runs</strong> and <strong>Check suites</strong></p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="btn-warp-primary text-xs"
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
