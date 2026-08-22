import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays, CheckCircle2, XCircle, Clock, RefreshCw,
  ChevronLeft, ChevronRight, Zap, ExternalLink, GitBranch,
  Activity, AlertTriangle
} from 'lucide-react';

interface CIRun {
  id: string;
  name: string;
  status: string;
  conclusion: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  html_url: string;
  created_at: string;
  actor?: string;
  workflow_name?: string;
}

interface CalendarDay {
  date: string;           // YYYY-MM-DD
  runs: CIRun[];
}

interface CICalendarViewProps {
  onTriggerAutopatch?: (repo: string, runId: string, branch: string) => void;
  triggering?: boolean;
}

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)) ||
  'http://localhost:8000';

function conclusionColor(conclusion: string): string {
  switch (conclusion) {
    case 'success': return '#5ee78a';
    case 'failure': return '#ff7a59';
    case 'cancelled': return '#9aa1b3';
    case 'skipped': return '#5f6580';
    default: return '#f59e0b'; // in_progress / queued
  }
}

function conclusionBg(conclusion: string): string {
  switch (conclusion) {
    case 'success': return 'bg-[#5ee78a]/10 border-[#5ee78a]/30';
    case 'failure': return 'bg-[#ff7a59]/10 border-[#ff7a59]/30';
    case 'cancelled': return 'bg-[#9aa1b3]/10 border-[#9aa1b3]/30';
    default: return 'bg-[#f59e0b]/10 border-[#f59e0b]/30';
  }
}

function ConclusionIcon({ conclusion, size = 14 }: { conclusion: string; size?: number }) {
  const s = { width: size, height: size };
  switch (conclusion) {
    case 'success': return <CheckCircle2 style={s} color="#5ee78a" />;
    case 'failure': return <XCircle style={s} color="#ff7a59" />;
    default: return <Clock style={s} color="#f59e0b" />;
  }
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export const CICalendarView: React.FC<CICalendarViewProps> = ({
  onTriggerAutopatch,
  triggering = false,
}) => {
  const { authFetch, token } = useAuth();
  const [calendarData, setCalendarData] = useState<Record<string, CIRun[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

  // Load repos
  useEffect(() => {
    authFetch(`${API_BASE}/api/github/repos`)
      .then(r => r.json())
      .then(d => {
        const list = (d.repositories || []).map((r: any) => ({ id: r.id, name: r.name }));
        setRepos(list);
        if (list.length > 0 && !selectedRepo) setSelectedRepo(list[0].name);
      })
      .catch(() => {});
  }, [authFetch]);

  const loadCalendar = useCallback(async () => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const res = await authFetch(
        `${API_BASE}/api/github/repos/${owner}/${repo}/actions/runs?per_page=50${token ? `&token=${encodeURIComponent(token)}` : ''}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const runs: CIRun[] = data.workflow_runs || [];

      // Group by date
      const grouped: Record<string, CIRun[]> = {};
      for (const run of runs) {
        const day = (run.created_at || '').slice(0, 10);
        if (!day) continue;
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(run);
      }
      setCalendarData(grouped);

      // Auto-expand today or most recent day
      const sortedDays = Object.keys(grouped).sort().reverse();
      if (sortedDays.length > 0) setExpandedDay(sortedDays[0]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [selectedRepo, authFetch, token]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // Build week days for the week navigation header
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + i + weekOffset * 7); // start from Sunday
    return d.toISOString().slice(0, 10);
  });

  const sortedDays = Object.keys(calendarData).sort().reverse();

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232838]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#7553f6]">CI History</span>
            <span className="text-[#5f6580] font-mono text-xs">/</span>
            <span className="font-mono text-xs text-[#9aa1b3]">Calendar</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#f1f1f4] mt-1">
            CI Run Timeline
          </h1>
          <p className="text-xs text-[#5f6580] font-mono mt-1">
            All GitHub Actions runs grouped by day — click a run to trigger AutoPatch
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Repo selector */}
          <select
            value={selectedRepo}
            onChange={e => setSelectedRepo(e.target.value)}
            className="bg-[#11141d] border border-[#232838] text-[#f1f1f4] text-xs font-mono px-3 py-2 rounded-lg outline-none focus:border-[#7553f6] transition-colors"
          >
            {repos.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
            {repos.length === 0 && <option value="">Select repo...</option>}
          </select>

          <button
            onClick={loadCalendar}
            disabled={loading}
            className="btn-warp-secondary p-2 text-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Week nav bar */}
      <div className="warp-card p-3 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded hover:bg-[#1e2331] text-[#9aa1b3] hover:text-[#f1f1f4] transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex gap-1 flex-1 justify-around">
          {weekDays.map(day => {
            const hasFail = calendarData[day]?.some(r => r.conclusion === 'failure');
            const hasSuccess = calendarData[day]?.some(r => r.conclusion === 'success');
            const count = calendarData[day]?.length || 0;
            const isToday = day === new Date().toISOString().slice(0, 10);
            const isSelected = expandedDay === day;
            const dayNum = new Date(day + 'T00:00:00').getDate();
            const dayName = new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });

            return (
              <button
                key={day}
                onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-[44px] ${
                  isSelected
                    ? 'bg-[#7553f6]/20 border border-[#7553f6]/50'
                    : isToday
                    ? 'bg-[#1e2331] border border-[#2e3447]'
                    : 'hover:bg-[#161a25]'
                }`}
              >
                <span className="text-[9px] font-mono text-[#5f6580] uppercase">{dayName}</span>
                <span className={`text-sm font-bold font-mono ${isToday ? 'text-[#7553f6]' : 'text-[#f1f1f4]'}`}>
                  {dayNum}
                </span>
                {count > 0 ? (
                  <div className="flex gap-0.5">
                    {hasFail && <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a59]" />}
                    {hasSuccess && <span className="w-1.5 h-1.5 rounded-full bg-[#5ee78a]" />}
                    {!hasFail && !hasSuccess && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
                  </div>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e2331]" />
                )}
                {count > 0 && (
                  <span className="text-[9px] font-mono text-[#5f6580]">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setWeekOffset(w => w + 1)}
          disabled={weekOffset >= 0}
          className="p-1.5 rounded hover:bg-[#1e2331] text-[#9aa1b3] hover:text-[#f1f1f4] transition-colors disabled:opacity-30 flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => setWeekOffset(0)}
          className="px-2 py-1 text-[10px] font-mono text-[#7553f6] hover:text-[#8967ff] border border-[#2e3447] rounded transition-colors flex-shrink-0"
        >
          Today
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] font-mono text-[#5f6580]">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#5ee78a]" />Success</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ff7a59]" />Failure</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" />In Progress</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#9aa1b3]" />Cancelled</div>
      </div>

      {/* Timeline: grouped by day */}
      {loading && sortedDays.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#7553f6] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-[#9aa1b3]">Fetching CI runs from GitHub Actions...</p>
        </div>
      ) : sortedDays.length === 0 ? (
        <div className="warp-card py-20 text-center space-y-3">
          <Activity className="w-8 h-8 text-[#584774] mx-auto" />
          <p className="font-headline text-base text-[#f1f1f4]">No CI runs found</p>
          <p className="text-xs text-[#9aa1b3] max-w-sm mx-auto">
            {selectedRepo ? `No GitHub Actions runs in ${selectedRepo}` : 'Select a repository to view CI history'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDays.map(day => {
            const runs = calendarData[day] || [];
            const isOpen = expandedDay === day;
            const failCount = runs.filter(r => r.conclusion === 'failure').length;
            const successCount = runs.filter(r => r.conclusion === 'success').length;

            return (
              <div key={day} className="space-y-2">
                {/* Day header — clickable to expand */}
                <button
                  onClick={() => setExpandedDay(isOpen ? null : day)}
                  className="w-full flex items-center gap-3 text-left group"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono text-sm font-bold text-[#f1f1f4] group-hover:text-[#7553f6] transition-colors">
                      {formatDayHeader(day)}
                    </span>
                    <span className="text-[10px] font-mono text-[#5f6580]">
                      {new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {failCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-[#ff7a59] bg-[#ff7a59]/10 px-1.5 py-0.5 rounded border border-[#ff7a59]/20">
                        <XCircle className="w-2.5 h-2.5" />{failCount} failed
                      </span>
                    )}
                    {successCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-[#5ee78a] bg-[#5ee78a]/10 px-1.5 py-0.5 rounded border border-[#5ee78a]/20">
                        <CheckCircle2 className="w-2.5 h-2.5" />{successCount} passed
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-[#5f6580]">{runs.length} total</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-[#5f6580] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Horizontal colored bar */}
                <div className="flex gap-0.5 h-1 rounded-full overflow-hidden">
                  {runs.map(run => (
                    <div
                      key={run.id}
                      className="flex-1 rounded-full"
                      style={{ backgroundColor: conclusionColor(run.conclusion) }}
                      title={`${run.name}: ${run.conclusion}`}
                    />
                  ))}
                </div>

                {/* Expanded runs list */}
                {isOpen && (
                  <div className="space-y-2 pl-4 border-l-2 border-[#2e3447] ml-1">
                    {runs.map(run => {
                      const isRunExpanded = expandedRun === run.id;
                      const isFailing = run.conclusion === 'failure';

                      return (
                        <div
                          key={run.id}
                          className={`warp-card p-3 border transition-all ${conclusionBg(run.conclusion)}`}
                        >
                          <div
                            className="flex items-center justify-between gap-3 cursor-pointer"
                            onClick={() => setExpandedRun(isRunExpanded ? null : run.id)}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ConclusionIcon conclusion={run.conclusion} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-[#f1f1f4] truncate max-w-[200px]">
                                    {run.name || run.workflow_name}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#5f6580] flex-shrink-0">
                                    #{run.id.slice(-6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <GitBranch className="w-2.5 h-2.5 text-[#5f6580] flex-shrink-0" />
                                  <span className="text-[10px] font-mono text-[#5f6580]">{run.branch}</span>
                                  {run.commit_sha && (
                                    <span className="text-[10px] font-mono text-[#5f6580] bg-[#11141d] px-1 rounded">
                                      {run.commit_sha}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-[#5f6580]">{formatTime(run.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded font-bold"
                                style={{ color: conclusionColor(run.conclusion), background: `${conclusionColor(run.conclusion)}15`, border: `1px solid ${conclusionColor(run.conclusion)}30` }}
                              >
                                {run.conclusion === 'in_progress' ? 'running' : run.conclusion}
                              </span>

                              {isFailing && onTriggerAutopatch && (
                                <button
                                  onClick={e => { e.stopPropagation(); onTriggerAutopatch(selectedRepo, run.id, run.branch); }}
                                  disabled={triggering}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold bg-[#7553f6]/20 hover:bg-[#7553f6]/40 text-[#7553f6] border border-[#7553f6]/30 transition-colors disabled:opacity-50"
                                  title="Trigger AutoPatch AI repair on this failing run"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  {triggering ? 'Fixing...' : 'AutoPatch'}
                                </button>
                              )}

                              {run.html_url && (
                                <a
                                  href={run.html_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 rounded hover:bg-[#1e2331] text-[#5f6580] hover:text-[#f1f1f4] transition-colors"
                                  title="View on GitHub"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isRunExpanded && (
                            <div className="mt-3 pt-3 border-t border-[#2e3447] space-y-2">
                              {run.commit_message && (
                                <p className="text-[11px] font-mono text-[#9aa1b3] break-words">
                                  💬 {run.commit_message.split('\n')[0]}
                                </p>
                              )}
                              {run.actor && (
                                <p className="text-[10px] font-mono text-[#5f6580]">
                                  👤 Triggered by <span className="text-[#9aa1b3]">{run.actor}</span>
                                </p>
                              )}
                              {isFailing && (
                                <div className="p-2 rounded-lg bg-[#ff7a59]/5 border border-[#ff7a59]/20">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <AlertTriangle className="w-3 h-3 text-[#ff7a59]" />
                                    <span className="text-[10px] font-mono font-bold text-[#ff7a59]">CI FAILURE — AutoPatch Available</span>
                                  </div>
                                  <p className="text-[10px] font-mono text-[#9aa1b3]">
                                    Click <strong>AutoPatch</strong> to trigger the Google ADK agent: it will fetch real logs, generate a Gemini fix, verify via Cloud Build, and submit a PR automatically.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
