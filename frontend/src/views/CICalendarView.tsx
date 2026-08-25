import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, XCircle, Clock, RefreshCw,
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
    case 'failure': return '#f6827d';
    case 'cancelled': return '#9aa1b3';
    case 'skipped': return '#5f6580';
    default: return '#ff7a59';
  }
}

function ConclusionIcon({ conclusion, size = 14 }: { conclusion: string; size?: number }) {
  const s = { width: size, height: size };
  switch (conclusion) {
    case 'success': return <CheckCircle2 style={s} color="#5ee78a" />;
    case 'failure': return <XCircle style={s} color="#f6827d" />;
    default: return <Clock style={s} color="#ff7a59" />;
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
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    authFetch(`${API_BASE}/api/github/repos`)
      .then(r => r.json())
      .then(d => {
        const list = (d.repositories || []).map((r: any) => ({ id: r.id, name: r.name }));
        setRepos(list);
        if (list.length > 0 && !selectedRepo) setSelectedRepo(list[0].name);
      })
      .catch(() => {});
  }, [authFetch, selectedRepo]);

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

      const grouped: Record<string, CIRun[]> = {};
      for (const run of runs) {
        const day = (run.created_at || '').slice(0, 10);
        if (!day) continue;
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(run);
      }
      setCalendarData(grouped);

      const sortedDays = Object.keys(grouped).sort().reverse();
      if (sortedDays.length > 0) setExpandedDay(sortedDays[0]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [selectedRepo, authFetch, token]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + i + weekOffset * 7);
    return d.toISOString().slice(0, 10);
  });

  const sortedDays = Object.keys(calendarData).sort().reverse();

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono">
            <span className="text-accent">CI History</span>
            <span className="text-text-dim">/</span>
            <span className="text-text-muted">Calendar</span>
          </div>
          <h1 className="font-headline text-[24px] sm:text-[26px] text-text font-semibold mt-1 tracking-tight">
            CI Run Timeline
          </h1>
          <p className="text-[12px] text-text-dim font-mono mt-0.5">
            All GitHub Actions runs grouped by day — click a run to trigger AutoPatch
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Repo selector */}
          <select
            value={selectedRepo}
            onChange={e => setSelectedRepo(e.target.value)}
            className="input-warp text-[12px] font-mono py-1.5 px-3"
          >
            {repos.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
            {repos.length === 0 && <option value="">Select repo...</option>}
          </select>

          <button
            onClick={loadCalendar}
            disabled={loading}
            className="btn-secondary p-2 text-[12px]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Week nav bar */}
      <div className="warp-card p-3 flex items-center gap-2 overflow-x-auto bg-surface border border-border">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-[6px] hover:bg-surface-2 text-text-muted hover:text-text transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex gap-1.5 flex-1 justify-around">
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
                className={`flex flex-col items-center gap-1 p-2 rounded-[8px] transition-colors min-w-[48px] ${
                  isSelected
                    ? 'bg-surface-2 border border-accent text-text'
                    : isToday
                    ? 'bg-bg-alt border border-border-strong text-accent font-semibold'
                    : 'hover:bg-surface-2/50 text-text-muted'
                }`}
              >
                <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">{dayName}</span>
                <span className={`text-[13px] font-bold font-mono tabular-nums ${isToday ? 'text-accent' : 'text-text'}`}>
                  {dayNum}
                </span>
                {count > 0 ? (
                  <div className="flex gap-1">
                    {hasFail && <span className="w-1.5 h-1.5 rounded-full bg-danger" />}
                    {hasSuccess && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
                    {!hasFail && !hasSuccess && <span className="w-1.5 h-1.5 rounded-full bg-warning" />}
                  </div>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                )}
                {count > 0 && (
                  <span className="text-[10px] font-mono text-text-dim tabular-nums">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setWeekOffset(w => w + 1)}
          disabled={weekOffset >= 0}
          className="p-1.5 rounded-[6px] hover:bg-surface-2 text-text-muted hover:text-text transition-colors disabled:opacity-30 flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => setWeekOffset(0)}
          className="btn-secondary px-2.5 py-1 text-[11px] font-mono text-accent flex-shrink-0"
        >
          Today
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-[11px] font-mono text-text-muted">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" />Success</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" />Failure</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" />In Progress</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-text-dim" />Cancelled</div>
      </div>

      {/* Timeline: grouped by day */}
      {loading && sortedDays.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[12px] font-mono text-text-muted">Fetching CI runs from GitHub Actions...</p>
        </div>
      ) : sortedDays.length === 0 ? (
        <div className="warp-card py-16 text-center space-y-2.5 bg-surface border border-border">
          <div className="w-10 h-10 rounded-[8px] bg-accent-soft/20 border border-border flex items-center justify-center mx-auto text-accent-soft">
            <Activity className="w-5 h-5" />
          </div>
          <p className="font-headline text-[17px] text-text font-semibold">No CI runs found</p>
          <p className="text-[12px] text-text-muted max-w-sm mx-auto font-sans">
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
                {/* Day header */}
                <button
                  onClick={() => setExpandedDay(isOpen ? null : day)}
                  className="w-full flex items-center gap-3 text-left p-2 rounded-[8px] hover:bg-surface-2/40 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono text-[13px] font-bold text-text">
                      {formatDayHeader(day)}
                    </span>
                    <span className="text-[11px] font-mono text-text-dim">
                      {new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {failCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20 tabular-nums">
                        <XCircle className="w-2.5 h-2.5" />{failCount} failed
                      </span>
                    )}
                    {successCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-success bg-success/10 px-2 py-0.5 rounded border border-success/20 tabular-nums">
                        <CheckCircle2 className="w-2.5 h-2.5" />{successCount} passed
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-text-dim tabular-nums">{runs.length} total</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-text-dim transition-transform ${isOpen ? 'rotate-90 text-accent' : ''}`} />
                  </div>
                </button>

                {/* Horizontal colored bar */}
                <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-bg-alt p-[1px]">
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
                  <div className="space-y-2 pl-3 border-l-2 border-border ml-1">
                    {runs.map(run => {
                      const isRunExpanded = expandedRun === run.id;
                      const isFailing = run.conclusion === 'failure';

                      return (
                        <div
                          key={run.id}
                          className={`warp-card p-3.5 border transition-colors ${
                            isFailing ? 'alert-row-danger' : 'bg-surface border-border'
                          }`}
                        >
                          <div
                            className="flex items-center justify-between gap-3 cursor-pointer"
                            onClick={() => setExpandedRun(isRunExpanded ? null : run.id)}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ConclusionIcon conclusion={run.conclusion} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] font-mono font-bold text-text truncate max-w-[200px]">
                                    {run.name || run.workflow_name}
                                  </span>
                                  <span className="text-[10px] font-mono text-text-dim flex-shrink-0">
                                    #{run.id.slice(-6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <GitBranch className="w-2.5 h-2.5 text-text-dim flex-shrink-0" />
                                  <span className="text-[10px] font-mono text-text-dim">{run.branch}</span>
                                  {run.commit_sha && (
                                    <span className="text-[10px] font-mono text-text-dim bg-bg-alt px-1.5 py-0.2 rounded">
                                      {run.commit_sha}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-text-dim">{formatTime(run.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className="text-[10px] font-mono px-2 py-0.2 rounded font-bold"
                                style={{ color: conclusionColor(run.conclusion), background: `${conclusionColor(run.conclusion)}15` }}
                              >
                                {run.conclusion === 'in_progress' ? 'running' : run.conclusion}
                              </span>

                              {isFailing && onTriggerAutopatch && (
                                <button
                                  onClick={e => { e.stopPropagation(); onTriggerAutopatch(selectedRepo, run.id, run.branch); }}
                                  disabled={triggering}
                                  className="btn-primary py-1 px-2 text-[10px] font-mono font-bold"
                                  title="Trigger AutoPatch AI repair on this failing run"
                                >
                                  <Zap className="w-2.5 h-2.5 text-bg" />
                                  {triggering ? 'Fixing...' : 'AutoPatch'}
                                </button>
                              )}

                              {run.html_url && (
                                <a
                                  href={run.html_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 rounded hover:bg-surface-2 text-text-dim hover:text-text transition-colors"
                                  title="View on GitHub"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isRunExpanded && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              {run.commit_message && (
                                <p className="text-[11px] font-mono text-text-muted break-words">
                                  💬 {run.commit_message.split('\n')[0]}
                                </p>
                              )}
                              {run.actor && (
                                <p className="text-[10px] font-mono text-text-dim">
                                  Triggered by <span className="text-text">{run.actor}</span>
                                </p>
                              )}
                              {isFailing && (
                                <div className="p-3 rounded-[8px] bg-danger/5 border border-danger/20">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                                    <span className="text-[11px] font-mono font-bold text-danger">CI FAILURE — AutoPatch Ready</span>
                                  </div>
                                  <p className="text-[11px] font-mono text-text-muted">
                                    Trigger AutoPatch to synthesize a fix and submit a verified Pull Request.
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
