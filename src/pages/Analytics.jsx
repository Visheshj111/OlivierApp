import { useMemo } from "react";
import {
  TrendingUp, Target, BarChart3, Trophy, Briefcase, Clock,
  Users, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Dot, ProgressBar, SectionHeader, EmptyState } from "../components/Shared";
import {
  PIPELINE_STAGES, CLOSED_STAGES, STATUS_COLORS, SOURCE_COLORS,
  LEAD_SOURCES,
  getDiff, getActiveDeadline, fmtNumber, localDateStr, isClosedStatus
} from "../lib/utils";

export default function Analytics() {
  const { tasks, stats } = useApp();

  /* ── Conversion Funnel ── */
  const funnel = useMemo(() => {
    const stages = [...PIPELINE_STAGES, "Converted"];
    const counts = stages.map(s => ({
      name: s,
      count: tasks.filter(t => {
        const si = PIPELINE_STAGES.indexOf(t.status);
        const targetIdx = PIPELINE_STAGES.indexOf(s);
        if (s === "Converted") return t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won";
        return si >= targetIdx || t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won";
      }).length,
      color: STATUS_COLORS[s]?.dot || "#94A3B8"
    }));
    return counts;
  }, [tasks]);

  /* ── Source Performance ── */
  const sourcePerf = useMemo(() => {
    const data = {};
    LEAD_SOURCES.forEach(s => { data[s] = { total: 0, converted: 0 }; });
    data["Other"] = { total: 0, converted: 0 };
    tasks.forEach(t => {
      const s = t.source || "Other";
      if (!data[s]) data[s] = { total: 0, converted: 0 };
      data[s].total++;
      if (t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won") {
        data[s].converted++;
      }
    });
    return Object.entries(data)
      .filter(([_, v]) => v.total > 0)
      .map(([name, v]) => ({ name, ...v, rate: v.total > 0 ? Math.round((v.converted / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [tasks]);

  /* ── Weekly Trend ── */
  const weeklyTrend = useMemo(() => {
    const weeks = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let w = 7; w >= 0; w--) {
      const start = new Date(today);
      start.setDate(start.getDate() - (w * 7) - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const startStr = localDateStr(start);
      const endStr = localDateStr(end);
      const created = tasks.filter(t => t.createdAt >= startStr && t.createdAt <= endStr).length;
      const label = start.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      weeks.push({ label, created, start: startStr, end: endStr });
    }
    return weeks;
  }, [tasks]);

  /* ── Stage Duration ── */
  const stageDuration = useMemo(() => {
    return PIPELINE_STAGES.map(stage => {
      const leadsInStage = tasks.filter(t => t.status === stage);
      if (leadsInStage.length === 0) return { stage, avg: 0, count: 0 };
      const totalAge = leadsInStage.reduce((s, t) => s + Math.abs(getDiff(t.createdAt || t.date)), 0);
      return { stage, avg: Math.round(totalAge / leadsInStage.length), count: leadsInStage.length };
    });
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="fade-in">
        <SectionHeader title="Analytics" subtitle="Insights into your lead performance" />
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          subtitle="Add leads to see analytics and insights"
        />
      </div>
    );
  }

  const maxFunnel = Math.max(1, ...funnel.map(f => f.count));
  const maxWeekly = Math.max(1, ...weeklyTrend.map(w => w.created));

  return (
    <div className="fade-in">
      <SectionHeader title="Analytics" subtitle="Placement performance insights" />

      {/* ── Top Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: "3px solid var(--text-primary)", padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Total Contacts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>{stats.thisWeek} this week</div>
        </div>
        <div className="card" style={{ borderLeft: "3px solid #22C55E", padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Conversion Rate</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#16A34A" }}>{stats.conversionRate}%</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>{stats.converted} converted / {stats.notConverted} not converted</div>
        </div>
        <div className="card" style={{ borderLeft: "3px solid #8B5CF6", padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Active Pipeline</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#7C3AED" }}>{stats.active}</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>Contacts in progress</div>
        </div>
        <div className="card" style={{ borderLeft: "3px solid #F97316", padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Avg Cycle</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#EA580C" }}>{stats.avgCycle || "—"}<span style={{ fontSize: 14 }}> days</span></div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>From first contact to conversion</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* ── Conversion Funnel ── */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Target size={16} color="var(--text-primary)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Conversion Funnel</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {funnel.map((f, i) => {
              const width = Math.max(15, (f.count / maxFunnel) * 100);
              return (
                <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", width: 100, flexShrink: 0 }}>{f.name}</span>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{
                      height: 28, borderRadius: 6,
                      background: `linear-gradient(90deg, ${f.color}20, ${f.color}40)`,
                      border: `1px solid ${f.color}30`,
                      width: `${width}%`,
                      display: "flex", alignItems: "center", paddingLeft: 10,
                      transition: "width 0.5s ease"
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.count}</span>
                    </div>
                  </div>
                  {i > 0 && funnel[i-1].count > 0 && (
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", width: 45, textAlign: "right" }}>
                      {Math.round((f.count / funnel[i-1].count) * 100)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Weekly Trend ── */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <TrendingUp size={16} color="var(--text-primary)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Weekly Trend</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, padding: "0 4px" }}>
            {weeklyTrend.map((w, i) => {
              const height = maxWeekly > 0 ? Math.max(4, (w.created / maxWeekly) * 130) : 4;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-primary)" }}>{w.created || ""}</span>
                  <div style={{
                    width: "100%", maxWidth: 40, height,
                    background: i === weeklyTrend.length - 1 ? "var(--text-primary)" : "var(--border-default)",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.5s ease"
                  }} />
                  <span style={{ fontSize: 9, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{w.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* ── Source Performance ── */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <BarChart3 size={16} color="var(--text-primary)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Source Performance</span>
          </div>
          {sourcePerf.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No source data. Add sources to your contacts.</p>
          ) : (
            <div style={{ overflow: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Contacts</th>
                    <th>Converted</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcePerf.map(s => (
                    <tr key={s.name}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Dot color={SOURCE_COLORS[s.name] || "#94A3B8"} size={6} />
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.total}</td>
                      <td>{s.converted}</td>
                      <td>
                        <span style={{ color: s.rate >= 50 ? "#16A34A" : s.rate >= 25 ? "#D97706" : "#DC2626", fontWeight: 600 }}>
                          {s.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Stage Duration ── */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Clock size={16} color="var(--text-primary)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Avg Time in Stage</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stageDuration.map(sd => {
              const sc = STATUS_COLORS[sd.stage];
              return (
                <div key={sd.stage}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Dot color={sc?.dot || "#94A3B8"} size={6} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{sd.stage}</span>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>({sd.count})</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {sd.avg > 0 ? `${sd.avg} days` : "—"}
                    </span>
                  </div>
                  <ProgressBar value={sd.avg} max={Math.max(30, ...stageDuration.map(s => s.avg))} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
