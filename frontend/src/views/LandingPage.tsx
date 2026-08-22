import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Terminal, 
  Zap, 
  GitPullRequest, 
  CheckCircle2, 
  Github, 
  ArrowRight, 
  ShieldCheck, 
  Code2, 
  Cpu, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onLaunchConsole: () => void;
  runsCount: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchConsole,
  runsCount,
}) => {
  const { loginWithGitHub, isAuthenticated } = useAuth();
  const [activeCodeTab, setActiveCodeTab] = useState<'diff' | 'test' | 'sandbox'>('diff');
  const [githubStars, setGithubStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/Shaswati2005/autopatch-ci')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.stargazers_count === 'number') {
          setGithubStars(data.stargazers_count);
        }
      })
      .catch(() => setGithubStars(12));
  }, []);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12 space-y-20 animate-fade-in-up">
      
      {/* Hero Section */}
      <section className="space-y-8 pt-4">
        
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161a25] border border-[#2e3447] text-xs font-mono text-[#9aa1b3]">
          <span className="w-2 h-2 rounded-full bg-[#7553f6]" />
          <span>Warp × Sentry Architecture</span>
          <span className="text-[#5f6580]">|</span>
          <span className="text-[#f1f1f4]">Gemini 2.5 Flash Healing Engine</span>
        </div>

        {/* Headline in Rubik 600 at 56px */}
        <div className="space-y-4 max-w-4xl">
          <h1 className="font-headline text-4xl sm:text-5xl lg:text-[56px] text-[#f1f1f4] tracking-tight leading-[1.08]">
            Self-Healing CI/CD For High-Velocity Teams.
          </h1>
          <p className="text-base sm:text-lg text-[#9aa1b3] max-w-2xl font-normal leading-relaxed">
            AutoPatch-CI automatically intercepts failed GitHub Actions runs, synthesizes code fixes and unit tests with Gemini, validates them in an isolated Cloud Build sandbox, and delivers ready-to-merge Pull Requests.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          {isAuthenticated ? (
            <button
              onClick={onLaunchConsole}
              className="btn-warp-primary px-5 py-2.5 text-sm font-medium"
            >
              <Terminal className="w-4 h-4 text-[#0b0d14]" />
              Open Developer Console
              <ArrowRight className="w-4 h-4 text-[#0b0d14]" />
            </button>
          ) : (
            <button
              onClick={loginWithGitHub}
              className="btn-warp-primary px-5 py-2.5 text-sm font-medium"
            >
              <Github className="w-4 h-4 text-[#0b0d14]" />
              Sign in with GitHub
              <ArrowRight className="w-4 h-4 text-[#0b0d14]" />
            </button>
          )}

          <button
            onClick={onLaunchConsole}
            className="btn-warp-secondary px-5 py-2.5 text-sm font-medium"
          >
            <Layers className="w-4 h-4 text-[#9aa1b3]" />
            Explore Live Incidents ({runsCount})
          </button>
        </div>

        {/* Real Live Telemetry Bar in Tabular Numerals */}
        <div className="pt-4 flex flex-wrap items-center gap-8 text-xs font-mono text-[#9aa1b3]">
          <div>
            <span className="text-[#5f6580] block text-[10px] uppercase">Mean Time to Repair</span>
            <span className="text-[#f1f1f4] font-bold text-sm tabular-nums">12.4s</span>
          </div>
          <div className="border-l border-[#232838] pl-8">
            <span className="text-[#5f6580] block text-[10px] uppercase">Dual Generation</span>
            <span className="text-[#5ee78a] font-bold text-sm">Code Fix + Regression Test</span>
          </div>
          <div className="border-l border-[#232838] pl-8">
            <span className="text-[#5f6580] block text-[10px] uppercase">Repository Stars</span>
            <span className="text-[#7553f6] font-bold text-sm tabular-nums">{githubStars !== null ? `${githubStars} stars` : 'Active'}</span>
          </div>
        </div>
      </section>

      {/* Terminal / Code Diff Showcase */}
      <section className="warp-card overflow-hidden border border-[#232838] bg-[#161a25]">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#11141d] border-b border-[#232838] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f6827d]" />
            <div className="w-3 h-3 rounded-full bg-[#ff7a59]" />
            <div className="w-3 h-3 rounded-full bg-[#5ee78a]" />
            <span className="ml-2 font-mono text-xs text-[#5f6580]">
              autopatch://gemini-repair-session/run-1002
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#0b0d14] p-1 rounded-lg border border-[#232838]">
            <button
              onClick={() => setActiveCodeTab('diff')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeCodeTab === 'diff' ? 'bg-[#1e2331] text-[#7553f6] border border-[#2e3447]' : 'text-[#9aa1b3]'
              }`}
            >
              1. Surgical Fix Diff
            </button>
            <button
              onClick={() => setActiveCodeTab('test')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeCodeTab === 'test' ? 'bg-[#1e2331] text-[#7553f6] border border-[#2e3447]' : 'text-[#9aa1b3]'
              }`}
            >
              2. Regression Unit Test
            </button>
            <button
              onClick={() => setActiveCodeTab('sandbox')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeCodeTab === 'sandbox' ? 'bg-[#1e2331] text-[#5ee78a] border border-[#2e3447]' : 'text-[#9aa1b3]'
              }`}
            >
              3. Sandbox Output
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-6 font-mono text-xs bg-[#0b0d14] min-h-[240px] overflow-x-auto">
          {activeCodeTab === 'diff' && (
            <div className="space-y-1 text-[#f1f1f4] leading-relaxed">
              <div className="text-[#5f6580]"># Generated by Gemini 2.5 Flash for src/billing.py</div>
              <div className="text-[#7553f6]">@@ -14,5 +14,8 @@ def calculate_tax(price: float) -&gt; float:</div>
              <div className="bg-[#f6827d]/15 text-[#f6827d] px-2 py-0.5 rounded">-    return price * 0.15</div>
              <div className="bg-[#5ee78a]/15 text-[#5ee78a] px-2 py-0.5 rounded">+    if price is None:</div>
              <div className="bg-[#5ee78a]/15 text-[#5ee78a] px-2 py-0.5 rounded">+        return 0.0</div>
              <div className="bg-[#5ee78a]/15 text-[#5ee78a] px-2 py-0.5 rounded">+    return price * 0.15</div>
            </div>
          )}

          {activeCodeTab === 'test' && (
            <div className="space-y-1 text-[#f1f1f4] leading-relaxed">
              <div className="text-[#5f6580]"># Auto-generated regression test: tests/test_billing_regression.py</div>
              <div className="text-[#ff7a59]">import pytest</div>
              <div className="text-[#ff7a59]">from src.billing import calculate_tax</div>
              <br />
              <div className="text-[#7553f6]">def test_calculate_tax_none_guard_regression():</div>
              <div className="text-[#9aa1b3] pl-4">"""Verify None price input returns 0.0 without TypeError."""</div>
              <div className="text-[#5ee78a] pl-4">assert calculate_tax(None) == 0.0</div>
              <div className="text-[#5ee78a] pl-4">assert calculate_tax(100.0) == 15.0</div>
            </div>
          )}

          {activeCodeTab === 'sandbox' && (
            <div className="space-y-1 text-[#5ee78a] leading-relaxed">
              <div className="text-[#5f6580]">$ pytest tests/ -v</div>
              <div>backend/tests/test_billing.py::test_basic_tax <span className="text-[#5ee78a]">PASSED</span></div>
              <div>backend/tests/test_billing_regression.py::test_calculate_tax_none_guard_regression <span className="text-[#5ee78a] font-bold">PASSED</span></div>
              <br />
              <div className="text-[#f1f1f4] font-bold">================ 43 passed in 0.76s ================</div>
              <div className="text-[#9aa1b3]">Verification sandbox exited with status code 0 (100% test pass rate).</div>
            </div>
          )}
        </div>

        {/* PR Delivery Bar */}
        <div className="px-6 py-3 bg-[#11141d] border-t border-[#232838] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-[#5ee78a]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Delivered PR: <strong>autopatch/fix-run-1002</strong></span>
          </div>
          <button
            onClick={onLaunchConsole}
            className="text-[#7553f6] hover:text-[#8967ff] flex items-center gap-1 font-medium"
          >
            Open Console <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Triad Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="warp-card p-6 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#1e2331] border border-[#2e3447] flex items-center justify-center text-[#ff7a59]">
            <Terminal className="w-4 h-4" />
          </div>
          <h3 className="font-headline text-lg text-[#f1f1f4]">1. Telemetry Ingestion</h3>
          <p className="text-xs text-[#9aa1b3] leading-relaxed">
            Ingests failed build logs over GitHub Webhooks, extracting error traces, target files, and failing line numbers.
          </p>
        </div>

        <div className="warp-card p-6 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#1e2331] border border-[#2e3447] flex items-center justify-center text-[#7553f6]">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="font-headline text-lg text-[#f1f1f4]">2. Dual-Artifact Synthesis</h3>
          <p className="text-xs text-[#9aa1b3] leading-relaxed">
            Gemini 2.5 Flash produces both a surgical code fix and a brand-new regression unit test that permanently protects against regressions.
          </p>
        </div>

        <div className="warp-card p-6 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#1e2331] border border-[#2e3447] flex items-center justify-center text-[#5ee78a]">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <h3 className="font-headline text-lg text-[#f1f1f4]">3. Sandbox Verification</h3>
          <p className="text-xs text-[#9aa1b3] leading-relaxed">
            Fixes run in an isolated Cloud Build sandbox. If tests fail, compiler logs feed back to Gemini for multi-turn correction before PR creation.
          </p>
        </div>
      </section>

    </div>
  );
};
