import './globals.css';
import React from 'react';

export const metadata = {
  title: 'AutoPatch-CI Observability Dashboard',
  description: 'Real-time agent reasoning trace & build healing dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-lg">
              🤖
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                AutoPatch-CI
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                  Autonomous DevOps Agent
                </span>
              </h1>
              <p className="text-xs text-slate-400">Powered by Gemini 3.5 Flash & Google Cloud Infrastructure</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Backend API: <span className="text-slate-200 font-mono">http://localhost:8000</span>
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
