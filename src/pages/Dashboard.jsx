import { useMemo } from "react";
import {
  Users, Bell, AlertCircle, TrendingUp, Trophy,
  Calendar, Target, Zap, ArrowRight, Phone, Building2,
  Clock, ChevronRight, BarChart3, Briefcase
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  StatCard, DeadlineBadge, StatusChip, EmptyState,
  Dot, ProgressBar, SectionHeader, MetaItem
} from "../components/Shared";
import {
  PIPELINE_STAGES, STATUS_COLORS, SOURCE_COLORS,
  getDiff, getActiveDeadline, getActiveDeadlineTime, fmtDate, fmtDateShort,
  fmt12, fmtCTC, fmtNumber, localDateStr, isClosedStatus
} from "../lib/utils";

/* ═══════════════════ MINI CHART: Leads Over Time ═══════════════════ */
function LeadsChart({ tasks }) {
  const data = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const points = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = localDateStr(d);
      const count = tasks.filter(t => t.createdAt === ds).length;
      points.push({ date: ds, count, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) });
    }
    return points;
  }, [tasks]);

  const maxVal = Math.max(4, ...data.map(p => p.count));
  const totalInPeriod = data.reduce((s, p) => s + p.count, 0);
  const W = 680, H = 180, PX = 40, PY = 20, iw = W - PX * 2, ih = H - PY * 2;
  const pts = data.map((p, i) => ({
    x: PX + (i / (data.length - 1)) * iw,
    y: PY + ih - (p.count / maxVal) * ih,
    ...p
  }));
  const pathD = pts.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cx1 = prev.x + (p.x - prev.x) * 0.4;
    const cx2 = p.x - (p.x - prev.x) * 0.4;
    return `C ${cx1} ${prev.y} ${cx2} ${p.y} ${p.x} ${p.y}`;
  }).join(" ");
  const areaD = pathD + ` L ${pts[pts.length - 1].x} ${PY + ih} L ${pts[0].x} ${PY + ih} Z`;
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((maxVal / 4) * i);
    yLabels.push({ val, y: PY + ih - (val / maxVal) * ih });
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={16} color="var(--text-primary)" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Lead Acquisition</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Last 14 days</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{totalInPeriod}</span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 6 }}>new leads</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 25}`} style={{ width: "100%", height: "auto" }}>
        {yLabels.map((yl, i) => (
          <g key={i}>
            <line x1={PX} y1={yl.y} x2={W - PX} y2={yl.y} stroke="var(--border-light, #F1F5F9)" strokeWidth="1" />
            <text x={PX - 8} y={yl.y + 4} textAnchor="end" fontSize="10" fill="var(--text-tertiary, #94A3B8)" fontFamily="inherit">{yl.val}</text>
          </g>
        ))}
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--text-primary, #111827)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--text-primary, #111827)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke="var(--text-primary, #111827)" strokeWidth="2" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="var(--bg-secondary, #fff)" stroke="var(--text-primary, #111827)" strokeWidth="2" />
            {i % 2 === 0 && <text x={p.x} y={H + 16} textAnchor="middle" fontSize="10" fill="var(--text-tertiary, #94A3B8)" fontFamily="inherit">{p.label}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ═══════════════════ PIPELINE FUNNEL ═══════════════════ */
function PipelineFunnel({ byStatus }) {
  const stages = PIPELINE_STAGES.map(s => ({ name: s, count: byStatus[s] || 0, color: STATUS_COLORS[s]?.dot || "#94A3B8" }));
  const maxCount = Math.max(1, ...stages.map(s => s.count));
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Target size={16} color="var(--text-primary)" />
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Pipeline Funnel</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {stages.map((s) => (
          <div key={s.name}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Dot color={s.color} size={6} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{s.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{s.count}</span>
            </div>
            <ProgressBar value={s.count} max={maxCount} color={`bg-[${s.color}]`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ SOURCE BREAKDOWN ═══════════════════ */
function SourceBreakdown({ bySource }) {
  const entries = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((s, [_, c]) => s + c, 0) || 1;
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <BarChart3 size={16} color="var(--text-primary)" />
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Lead Sources</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(([source, count]) => {
          const color = SOURCE_COLORS[source] || "#94A3B8";
          const pct = Math.round((count / total) * 100);
          return (
            <div key={source}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Dot color={color} size={6} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{source}</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{count} ({pct}%)</span>
              </div>
              <ProgressBar value={count} max={entries[0]?.[1] || 1} />
            </div>
          );
        })}
        {entries.length === 0 && <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No source data yet</p>}
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN DASHBOARD ═══════════════════ */
export default function Dashboard({ onNavigate, onExpandLead }) {
  const { tasks, stats, todaysCalls } = useApp();

  if (!tasks.length) {
    return (
      <div className="fade-in">
        <SectionHeader title="Dashboard" subtitle="Your placement cell command center" />
        <EmptyState
          icon={BarChart3}
          title="Welcome to Olivier"
          subtitle="Add your first HR contact to see your dashboard come alive"
        />
      </div>
    );
  }

  const urgentLeads = tasks.filter(t => {
    if (isClosedStatus(t.status)) return false;
    const d = getDiff(getActiveDeadline(t));
    return d >= 0 && d <= 1;
  }).sort((a, b) => new Date(getActiveDeadline(a)) - new Date(getActiveDeadline(b)));

  const staleLeads = tasks.filter(t => {
    if (isClosedStatus(t.status)) return false;
    return getDiff(getActiveDeadline(t)) < -3;
  });

  return (
    <div className="fade-in">
      <SectionHeader title="Dashboard" subtitle="Your placement cell command center" />

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={Users} label="Total Contacts" value={stats.total} sub={`${stats.thisWeek} this week`} onClick={() => onNavigate("leads")} />
        <StatCard icon={Briefcase} label="Active Pipeline" value={stats.active} sub={`${stats.urgent} urgent`} accent="violet" />
        <StatCard icon={Bell} label="Due Today" value={stats.dueToday} sub={`${stats.overdue} overdue`} accent="amber" onClick={() => onNavigate("planner")} />
        <StatCard icon={Trophy} label="Conversion Rate" value={`${stats.conversionRate}%`} sub={`${stats.converted} converted`} accent="emerald" />
        <StatCard icon={Zap} label="Avg Cycle" value={stats.avgCycle ? `${stats.avgCycle}d` : "—"} sub="Days to convert" accent="orange" />
        <StatCard icon={AlertCircle} label="Need Attention" value={stats.stale + stats.overdue} sub={`${stats.stale} stale`} accent="red" />
      </div>

      {/* ── Two Column Layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <LeadsChart tasks={tasks} />
          <PipelineFunnel byStatus={stats.byStatus} />
        </div>
        <div style={{ minWidth: 0 }}>
          <SourceBreakdown bySource={stats.bySource} />

          {/* Converted vs Not Converted */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Trophy size={16} color="var(--text-primary)" />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Converted vs Not Converted</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Company hiring conversion outcome</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "16px 8px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#16A34A" }}>{stats.converted}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#15803D", marginTop: 2 }}>Converted</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", padding: "16px 8px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#DC2626" }}>{stats.notConverted}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#B91C1C", marginTop: 2 }}>Not Converted</div>
              </div>
              {stats.closed > 0 && (
                <div style={{ flex: 1, textAlign: "center", padding: "16px 8px", borderRadius: 10, background: "var(--bg-tertiary)", border: "1px solid var(--border-default)" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-secondary)" }}>{stats.closed}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginTop: 2 }}>Closed</div>
                </div>
              )}
            </div>
            {(stats.converted + stats.notConverted) > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Conversion rate</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{stats.conversionRate}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#FEE2E2", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "#22C55E", width: `${stats.conversionRate}%`, transition: "width 0.5s" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Today's Calls ── */}
      {todaysCalls.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
              <Phone size={15} color="#F59E0B" /> Today's Calls ({todaysCalls.length})
            </h3>
            <button className="btn-o xs" onClick={() => onNavigate("planner")}>View All <ChevronRight size={12} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
            {todaysCalls.slice(0, 6).map(t => {
              const activeDl = getActiveDeadline(t);
              const activeDlTime = getActiveDeadlineTime(t);
              const diff = getDiff(activeDl);
              return (
                <div key={t.id} className="task-card" onClick={() => { onNavigate("leads"); onExpandLead(t.id); }}
                  style={{ padding: "14px 16px", borderLeft: `3px solid ${diff < 0 ? "#EF4444" : "#F59E0B"}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "var(--text-primary)" }}>{t.name}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {t.company && <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{t.company}</span>}
                        <DeadlineBadge date={activeDl} time={activeDlTime} small />
                      </div>
                    </div>
                    {activeDlTime && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{fmt12(activeDlTime)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stale Leads Warning ── */}
      {staleLeads.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertCircle size={16} color="#D97706" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>{staleLeads.length} Stale Lead{staleLeads.length > 1 ? "s" : ""}</span>
          </div>
          <p style={{ fontSize: 13, color: "#92400E", marginBottom: 12 }}>These leads haven't been contacted in over 3 days. Consider following up or closing them.</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {staleLeads.slice(0, 5).map(t => (
              <span key={t.id} className="chip" style={{ background: "#FEF3C7", color: "#92400E", cursor: "pointer" }}
                onClick={() => { onNavigate("leads"); onExpandLead(t.id); }}>
                {t.name}
              </span>
            ))}
            {staleLeads.length > 5 && <span style={{ fontSize: 12, color: "#92400E", fontWeight: 600 }}>+{staleLeads.length - 5} more</span>}
          </div>
        </div>
      )}
    </div>
  );
}
