import React, { useState } from 'react';
import { 
  Key, 
  Cpu, 
  Save, 
  Check, 
  ExternalLink,
  Database
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('AIzaSy...CONFIGURED');
  const [githubToken, setGithubToken] = useState('ghp_...CONFIGURED');
  const [modelName, setModelName] = useState('gemini-2.0-flash');
  const [gcpProject, setGcpProject] = useState('autopatch-ci-dev');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in-up">
      
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-mono">
          <span className="text-accent">System</span>
          <span className="text-text-dim">/</span>
          <span className="text-text-muted">Settings</span>
        </div>
        <h1 className="font-headline text-[24px] sm:text-[26px] text-text font-semibold mt-1 tracking-tight">
          Agent & Infrastructure Settings
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        {/* Gemini Card */}
        <div className="warp-card p-5 space-y-4 bg-surface border border-border">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-8 h-8 rounded-[8px] bg-surface-2 border border-border flex items-center justify-center text-accent">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-[13px] font-bold text-text">Gemini LLM Synthesis Engine</h2>
              <p className="text-[12px] text-text-dim font-mono">Powers code repair and regression unit test generation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[12px] font-mono text-text flex items-center justify-between">
                <span>GEMINI_API_KEY</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:text-accent-hover hover:underline flex items-center gap-1 text-[11px] transition-colors"
                >
                  Get Free Key <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="input-warp w-full font-mono text-[12px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-mono text-text">Model Tier</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="input-warp w-full font-mono text-[12px]"
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-low latency)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep refactor)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-mono text-text">Max Multi-Turn Retries</label>
              <input
                type="number"
                min={1}
                max={5}
                defaultValue={3}
                className="input-warp w-full font-mono text-[12px]"
              />
            </div>
          </div>
        </div>

        {/* GCP & Firestore Card */}
        <div className="warp-card p-5 space-y-4 bg-surface border border-border">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-8 h-8 rounded-[8px] bg-surface-2 border border-border flex items-center justify-center text-success">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-[13px] font-bold text-text">Google Cloud Platform & Firestore</h2>
              <p className="text-[12px] text-text-dim font-mono">Real-time trace streaming & sandbox verification</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-mono text-text">GCP_PROJECT_ID</label>
            <input
              type="text"
              value={gcpProject}
              onChange={(e) => setGcpProject(e.target.value)}
              className="input-warp w-full font-mono text-[12px]"
            />
          </div>
        </div>

        {/* GitHub Credentials Card */}
        <div className="warp-card p-5 space-y-4 bg-surface border border-border">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-8 h-8 rounded-[8px] bg-surface-2 border border-border flex items-center justify-center text-warning">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-[13px] font-bold text-text">GitHub Integration</h2>
              <p className="text-[12px] text-text-dim font-mono">Branch generation and Pull Request dispatch</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-mono text-text">GITHUB_TOKEN / OAuth Token</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="input-warp w-full font-mono text-[12px]"
            />
          </div>
        </div>

        {/* Save button in Sentry Lilac */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary py-2 px-5 text-[13px] font-medium"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5 text-bg" />
                Saved Changes
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-bg" />
                Save Settings
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
