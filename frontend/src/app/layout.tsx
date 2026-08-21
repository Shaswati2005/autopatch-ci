import './globals.css';
import React from 'react';

export const metadata = {
  title: 'AutoPatch-CI — Autonomous CI/CD Self-Healing Agent',
  description: 'Real-time AI-powered build failure diagnosis, patch generation, and GitHub PR delivery',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <header
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'rgba(10,10,15,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold animate-glow"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), #a855f7)',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                ⚡
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  AutoPatch-CI
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{
                    background: 'var(--accent-glow)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(124,106,245,0.25)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  v0.1.0
                </span>
              </div>
            </div>

            {/* Right: Status */}
            <div className="flex items-center gap-4">
              <div
                className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span className="text-xs" style={{ color: 'var(--green)' }}>●</span>
                <span>Gemini 3.5 Flash</span>
              </div>
              <a
                href="https://github.com/Shaswati2005/autopatch-ci"
                target="_blank"
                rel="noreferrer"
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
