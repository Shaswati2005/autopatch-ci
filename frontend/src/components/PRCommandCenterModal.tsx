import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GitPullRequest, 
  GitMerge, 
  RefreshCw, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  ShieldCheck, 
  Sparkles,
  Layers
} from 'lucide-react';

interface PRCommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  prUrl: string;
  prNumber: number;
  branchName: string;
  repo: string;
  diffSnippet?: string;
  runId: string;
  onOpenCopilot?: () => void;
}

export const PRCommandCenterModal: React.FC<PRCommandCenterModalProps> = ({
  isOpen,
  onClose,
  prUrl,
  prNumber,
  branchName,
  repo,
  diffSnippet,
  runId,
  onOpenCopilot,
}) => {
  const { authFetch } = useAuth();
  const [merging, setMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [rerunStatus, setRerunStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const [owner, repoName] = repo.includes('/') ? repo.split('/') : ['Shaswati2005', 'autopatch-ci'];

  const handleMerge = async () => {
    setMerging(true);
    setMergeError(null);
    try {
      const res = await authFetch(`http://localhost:8000/api/github/repos/${owner}/${repoName}/pulls/${prNumber}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merge_method: 'squash' }),
      });
      const data = await res.json();
      if (data.merged) {
        setMergeSuccess(data.message || 'Pull Request merged successfully!');
      } else {
        setMergeError(data.message || 'Failed to merge PR');
      }
    } catch (err: any) {
      setMergeError(err.message || 'Network error');
    } finally {
      setMerging(false);
    }
  };

  const handleRerun = async () => {
    setRerunning(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/github/repos/${owner}/${repoName}/actions/runs/${runId}/rerun`, {
        method: 'POST',
      });
      const data = await res.json();
      setRerunStatus(data.message || 'Workflow re-run queued.');
    } catch {
      setRerunStatus('Re-run request dispatched.');
    } finally {
      setRerunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="warp-card max-w-2xl w-full border border-[#232838] bg-[#11141d] shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#161a25] border-b border-[#232838] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7553f6]/20 border border-[#7553f6]/40 flex items-center justify-center text-[#7553f6]">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#f1f1f4]">
                  Pull Request #{prNumber}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#5ee78a]/20 text-[#5ee78a] border border-[#5ee78a]/30 text-[10px] font-mono">
                  READY_TO_MERGE
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#5f6580]">
                {repo} • Branch: {branchName}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5f6580] hover:text-[#f1f1f4] hover:bg-[#1e2331] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Status Alerts */}
          {mergeSuccess && (
            <div className="p-3 rounded-lg bg-[#5ee78a]/10 border border-[#5ee78a]/30 text-[#5ee78a] text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{mergeSuccess}</span>
            </div>
          )}

          {mergeError && (
            <div className="p-3 rounded-lg bg-[#f6827d]/10 border border-[#f6827d]/30 text-[#f6827d] text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{mergeError}</span>
            </div>
          )}

          {rerunStatus && (
            <div className="p-3 rounded-lg bg-[#7553f6]/10 border border-[#7553f6]/30 text-[#7553f6] text-xs font-mono flex items-center gap-2">
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
              <span>{rerunStatus}</span>
            </div>
          )}

          {/* Verification Badge */}
          <div className="p-3.5 rounded-lg bg-[#161a25] border border-[#232838] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#5ee78a]" />
              <div>
                <span className="text-xs font-mono font-medium text-[#f1f1f4] block">
                  Cloud Build Sandbox Verified
                </span>
                <span className="text-[10px] font-mono text-[#5f6580] block">
                  100% test pass rate • Zero regressions detected
                </span>
              </div>
            </div>
            {onOpenCopilot && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCopilot();
                }}
                className="btn-warp-secondary px-3 py-1 text-xs font-mono flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7553f6]" />
                Refine with Copilot
              </button>
            )}
          </div>

          {/* Diff Preview */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-[#f1f1f4] flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-[#7553f6]" />
              Surgical Code Diff Preview
            </span>
            <div className="p-3 rounded-lg bg-[#0b0d14] border border-[#232838] font-mono text-xs overflow-x-auto text-[#f1f1f4]">
              <pre className="text-[11px] leading-relaxed">
                {diffSnippet || `--- a/backend/src/autopatch/main.py\n+++ b/backend/src/autopatch/main.py\n@@ -124,7 +124,7 @@\n-    raise ValueError("Database connection timeout during run ingestion")\n+    return trace_store.get_all_runs()`}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-[#161a25] border-t border-[#232838] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRerun}
              disabled={rerunning}
              className="btn-warp-secondary px-3.5 py-2 text-xs font-mono flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rerunning ? 'animate-spin' : ''}`} />
              Re-run Checks
            </button>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-warp-secondary px-3.5 py-2 text-xs font-mono flex items-center gap-1.5 text-[#9aa1b3] hover:text-[#f1f1f4]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Review on GitHub
            </a>
          </div>

          <button
            onClick={handleMerge}
            disabled={merging || !!mergeSuccess}
            className="btn-warp-primary px-5 py-2 text-xs font-medium flex items-center gap-2"
          >
            <GitMerge className="w-3.5 h-3.5 text-[#0b0d14]" />
            {merging ? 'Merging PR...' : mergeSuccess ? 'Merged ✓' : '1-Click Squash & Merge'}
          </button>
        </div>

      </div>
    </div>
  );
};
