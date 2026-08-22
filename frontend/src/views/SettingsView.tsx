import React, { useState } from 'react';
import { 
  Key, 
  Cpu, 
  Save, 
  Check, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('AIzaSy...CONFIGURED');
  const [githubToken, setGithubToken] = useState('ghp_...CONFIGURED');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in-up">
      
      {/* Header */}
      <div className="pb-4 border-b border-[#232838]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#7553f6]">System</span>
          <span className="text-[#5f6580] font-mono text-xs">/</span>
          <span className="font-mono text-xs text-[#9aa1b3]">Settings</span>
        </div>
        <h1 className="font-headline text-2xl sm:text-3xl text-[#f1f1f4] mt-1">
          Agent & Infrastructure Settings
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        {/* Gemini Card */}
        <div className="warp-card p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#232838]">
            <Cpu className="w-5 h-5 text-[#7553f6]" />
            <div>
              <h2 className="font-mono text-sm font-bold text-[#f1f1f4]">Gemini LLM Synthesis Engine</h2>
              <p className="text-xs text-[#5f6580] font-mono">Powers code repair and regression unit test generation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-mono text-[#f1f1f4] flex items-center justify-between">
                <span>GEMINI_API_KEY</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#7553f6] hover:underline flex items-center gap-1 text-[11px]"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="warp-input w-full font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#f1f1f4]">Model Tier</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="warp-input w-full font-mono text-xs"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-low latency)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (High reasoning)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep refactor)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#f1f1f4]">Max Multi-Turn Retries</label>
              <input
                type="number"
                min={1}
                max={5}
                defaultValue={3}
                className="warp-input w-full font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* GitHub Credentials Card */}
        <div className="warp-card p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#232838]">
            <Key className="w-5 h-5 text-[#ff7a59]" />
            <div>
              <h2 className="font-mono text-sm font-bold text-[#f1f1f4]">GitHub Integration</h2>
              <p className="text-xs text-[#5f6580] font-mono">Branch generation and Pull Request dispatch</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#f1f1f4]">GITHUB_TOKEN / OAuth Token</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="warp-input w-full font-mono text-xs"
            />
          </div>
        </div>

        {/* Save button in Sentry lilac */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-warp-primary px-5 py-2.5 text-xs font-medium"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#0b0d14]" />
                Saved Changes
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-[#0b0d14]" />
                Save Settings
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
