import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Key, 
  ShieldCheck, 
  Cpu, 
  Save, 
  Check, 
  ExternalLink,
  Layers
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('AIzaSy...DEMO_CONFIGURED_KEY');
  const [githubToken, setGithubToken] = useState('ghp_...DEMO_CONFIGURED_PAT');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [strategy, setStrategy] = useState('mock');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#f0faf4]">
          Agent & Infrastructure Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#94b8a3] mt-1">
          Configure API credentials, Gemini model tiers, and sandbox execution environments.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Gemini Configuration Card */}
        <div className="solar-card rounded-2xl p-6 sm:p-8 space-y-5 border border-[#1b3022]">
          <div className="flex items-center gap-3 border-b border-[#1b3022] pb-4">
            <div className="w-9 h-9 rounded-xl bg-[#00f59b]/10 border border-[#00f59b]/30 flex items-center justify-center text-[#00f59b]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[#f0faf4]">Gemini LLM Engine Settings</h2>
              <p className="text-xs text-[#557562] font-mono">Powers code repair & regression test synthesis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-mono text-[#f0faf4] flex items-center justify-between">
                <span>GEMINI_API_KEY</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00f59b] hover:underline flex items-center gap-1 text-[11px]"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b08] border border-[#1b3022] focus:border-[#00f59b] outline-none text-xs font-mono text-[#f0faf4] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#f0faf4]">Model Selection</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b08] border border-[#1b3022] focus:border-[#00f59b] outline-none text-xs font-mono text-[#f0faf4]"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-low latency)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (High reasoning)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep refactor)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#f0faf4]">Max Self-Healing Retries</label>
              <input
                type="number"
                min={1}
                max={5}
                defaultValue={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b08] border border-[#1b3022] outline-none text-xs font-mono text-[#f0faf4]"
              />
            </div>
          </div>
        </div>

        {/* GitHub Integration Card */}
        <div className="solar-card rounded-2xl p-6 sm:p-8 space-y-5 border border-[#1b3022]">
          <div className="flex items-center gap-3 border-b border-[#1b3022] pb-4">
            <div className="w-9 h-9 rounded-xl bg-[#f5b700]/10 border border-[#f5b700]/30 flex items-center justify-center text-[#f5b700]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[#f0faf4]">GitHub Integration & Credentials</h2>
              <p className="text-xs text-[#557562] font-mono">Enables branch creation and Pull Request delivery</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#f0faf4]">GITHUB_TOKEN (Personal Access Token)</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b08] border border-[#1b3022] focus:border-[#00f59b] outline-none text-xs font-mono text-[#f0faf4]"
              />
              <p className="text-[11px] text-[#557562]">Requires <code>repo</code> and <code>workflow</code> permissions.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#f0faf4]">Verification Sandbox Strategy</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {[
                  { id: 'mock', label: 'Simulated Sandbox', desc: 'Instant local validation' },
                  { id: 'local_docker', label: 'Local Docker', desc: 'Local container runner' },
                  { id: 'cloud_build', label: 'GCP Cloud Build', desc: 'Isolated Google Cloud container' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStrategy(s.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      strategy === s.id
                        ? 'bg-[#15261b] border-[#00f59b]/40 text-[#f0faf4]'
                        : 'bg-[#060b08] border-[#1b3022] text-[#94b8a3]'
                    }`}
                  >
                    <p className="font-mono text-xs font-bold">{s.label}</p>
                    <p className="text-[10px] text-[#557562] mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="btn-solarpunk-primary px-6 py-3 text-xs font-display flex items-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-[#041208]" />
                Saved Configuration
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#041208]" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
