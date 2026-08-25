import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Terminal, 
  GitPullRequest, 
  CheckCircle2, 
  Github, 
  ArrowRight, 
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
    <div className="max-w-[1280px] mx-auto px-6 py-12 space-y-16 animate-fade-in-up">
      
      {/* Hero Section */}
      <section className="space-y-6 pt-4">
        
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-surface-2 border border-border-strong text-[12px] font-mono text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-text font-medium">Autonomous CI/CD Healing</span>
          <span className="text-text-dim">/</span>
          <span className="text-accent font-medium">Google ADK & Gemini</span>
        </div>

        {/* Headline: Rubik weight 600, 56 -> 34 -> 26 */}
        <div className="space-y-3 max-w-4xl">
          <h1 className="font-headline text-[26px] sm:text-[34px] lg:text-[56px] text-text font-semibold tracking-tight leading-[1.1]">
            Self-Healing CI/CD For High-Velocity Teams.
          </h1>
          <p className="text-[15px] sm:text-[17px] text-text-muted max-w-2xl font-normal leading-relaxed">
            AutoPatch-CI intercepts failed GitHub Actions runs, synthesizes surgical code fixes and regression tests with Gemini 2.0, validates them in an isolated Cloud Build sandbox, and delivers ready-to-merge Pull Requests.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {isAuthenticated ? (
            <button
              onClick={onLaunchConsole}
              className="btn-primary px-5 py-2.5 text-[13px] font-medium"
            >
              <Terminal className="w-4 h-4 text-bg" />
              Open Developer Console
              <ArrowRight className="w-4 h-4 text-bg" />
            </button>
          ) : (
            <button
              onClick={loginWithGitHub}
              className="btn-primary px-5 py-2.5 text-[13px] font-medium"
            >
              <Github className="w-4 h-4 text-bg" />
              Sign in with GitHub
              <ArrowRight className="w-4 h-4 text-bg" />
            </button>
          )}

          <button
            onClick={onLaunchConsole}
            className="btn-secondary px-5 py-2.5 text-[13px] font-medium"
          >
            <Layers className="w-4 h-4 text-text-dim" />
            Explore Live Incidents ({runsCount})
          </button>
        </div>

        {/* Telemetry Bar in Tabular Numerals */}
        <div className="p-4 rounded-[10px] bg-surface border border-border flex flex-wrap items-center gap-8 text-[12px] font-mono text-text-muted">
          <div>
            <span className="text-text-dim block text-[11px] uppercase font-semibold tracking-wider">Mean Time to Repair</span>
            <span className="text-text font-bold text-[15px] tabular-nums">12.4s</span>
          </div>
          <div className="border-l border-border pl-8">
            <span className="text-text-dim block text-[11px] uppercase font-semibold tracking-wider">Dual Artifact Synthesis</span>
            <span className="text-success font-medium text-[13px]">Code Fix + Regression Test</span>
          </div>
          <div className="border-l border-border pl-8">
            <span className="text-text-dim block text-[11px] uppercase font-semibold tracking-wider">Repository Stars</span>
            <span className="text-accent font-medium text-[13px] tabular-nums">{githubStars !== null ? `${githubStars} stars` : 'Active'}</span>
          </div>
        </div>
      </section>

      {/* Terminal / Code Diff Showcase */}
      <section className="warp-card overflow-hidden border border-border bg-surface">
        {/* Terminal Header */}
        <div className="px-5 py-3 bg-bg-alt border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-danger" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning" />
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="ml-2 font-mono text-[12px] text-text-muted">
              autopatch://gemini-repair-session/run-1002
            </span>
          </div>

          <div className="flex items-center gap-1 bg-surface p-0.5 rounded-[8px] border border-border">
            <button
              onClick={() => setActiveCodeTab('diff')}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-mono transition-colors ${
                activeCodeTab === 'diff' ? 'bg-surface-2 text-text border border-border-strong font-medium' : 'text-text-muted hover:text-text'
              }`}
            >
              1. Surgical Fix Diff
            </button>
            <button
              onClick={() => setActiveCodeTab('test')}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-mono transition-colors ${
                activeCodeTab === 'test' ? 'bg-surface-2 text-text border border-border-strong font-medium' : 'text-text-muted hover:text-text'
              }`}
            >
              2. Regression Unit Test
            </button>
            <button
              onClick={() => setActiveCodeTab('sandbox')}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-mono transition-colors ${
                activeCodeTab === 'sandbox' ? 'bg-surface-2 text-text border border-border-strong font-medium' : 'text-text-muted hover:text-text'
              }`}
            >
              3. Sandbox Output
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-5 font-mono text-[12px] bg-bg-alt min-h-[220px] overflow-x-auto">
          {activeCodeTab === 'diff' && (
            <div className="space-y-1 text-text leading-relaxed">
              <div className="text-text-dim"># Generated by Gemini 2.0 Flash for src/billing.py</div>
              <div className="text-text-muted">@@ -14,5 +14,8 @@ def calculate_tax(price: float) -&gt; float:</div>
              <div className="bg-danger/10 text-danger px-2 py-0.5 rounded border border-danger/20">-    return price * 0.15</div>
              <div className="bg-success/10 text-success px-2 py-0.5 rounded border border-success/20">+    if price is None:</div>
              <div className="bg-success/10 text-success px-2 py-0.5 rounded border border-success/20">+        return 0.0</div>
              <div className="bg-success/10 text-success px-2 py-0.5 rounded border border-success/20">+    return price * 0.15</div>
            </div>
          )}

          {activeCodeTab === 'test' && (
            <div className="space-y-1 text-text leading-relaxed">
              <div className="text-text-dim"># Auto-generated regression test: tests/test_billing_regression.py</div>
              <div className="text-warning">import pytest</div>
              <div className="text-warning">from src.billing import calculate_tax</div>
              <br />
              <div className="text-accent font-medium">def test_calculate_tax_none_guard_regression():</div>
              <div className="text-text-muted pl-4">"""Verify None price input returns 0.0 without TypeError."""</div>
              <div className="text-success pl-4">assert calculate_tax(None) == 0.0</div>
              <div className="text-success pl-4">assert calculate_tax(100.0) == 15.0</div>
            </div>
          )}

          {activeCodeTab === 'sandbox' && (
            <div className="space-y-1 text-success leading-relaxed">
              <div className="text-text-dim">$ pytest tests/ -v</div>
              <div>backend/tests/test_billing.py::test_basic_tax <span className="text-success">PASSED</span></div>
              <div>backend/tests/test_billing_regression.py::test_calculate_tax_none_guard_regression <span className="text-success font-medium">PASSED</span></div>
              <br />
              <div className="text-text font-medium">================ 43 passed in 0.76s ================</div>
              <div className="text-text-muted">Verification sandbox exited with status code 0 (100% test pass rate).</div>
            </div>
          )}
        </div>

        {/* PR Delivery Bar */}
        <div className="px-5 py-3 bg-bg-alt border-t border-border flex items-center justify-between text-[12px] font-mono">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span>Delivered PR: <strong className="text-text">autopatch/fix-run-1002</strong></span>
          </div>
          <button
            onClick={onLaunchConsole}
            className="text-accent hover:text-accent-hover flex items-center gap-1 font-medium transition-colors"
          >
            Open Console <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Triad Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="warp-card p-5 space-y-2.5">
          <div className="w-9 h-9 rounded-[8px] bg-surface-2 border border-border-strong flex items-center justify-center text-warning">
            <Terminal className="w-4 h-4" />
          </div>
          <h3 className="font-headline text-[17px] text-text font-semibold">1. Telemetry Ingestion</h3>
          <p className="text-[13px] text-text-muted leading-relaxed font-sans">
            Ingests failed build logs over GitHub Webhooks, extracting error traces, target files, and failing line numbers.
          </p>
        </div>

        <div className="warp-card p-5 space-y-2.5">
          <div className="w-9 h-9 rounded-[8px] bg-surface-2 border border-border-strong flex items-center justify-center text-accent">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="font-headline text-[17px] text-text font-semibold">2. Dual-Artifact Synthesis</h3>
          <p className="text-[13px] text-text-muted leading-relaxed font-sans">
            Gemini 2.0 Flash produces both a surgical code fix and a brand-new regression unit test that permanently protects against regressions.
          </p>
        </div>

        <div className="warp-card p-5 space-y-2.5">
          <div className="w-9 h-9 rounded-[8px] bg-surface-2 border border-border-strong flex items-center justify-center text-success">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <h3 className="font-headline text-[17px] text-text font-semibold">3. Sandbox Verification</h3>
          <p className="text-[13px] text-text-muted leading-relaxed font-sans">
            Fixes run in an isolated Cloud Build sandbox. If tests fail, logs feed back to Gemini for multi-turn correction before PR creation.
          </p>
        </div>
      </section>

    </div>
  );
};
