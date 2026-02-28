import { useMemo } from "react";
import {
  Phone, Clock, Calendar, Building2, AlertCircle,
  CheckCircle2, ChevronRight
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  StatusChip, DeadlineBadge, TimeBadge,
  EmptyState, SectionHeader, Dot
} from "../components/Shared";
import {
  getDiff, getActiveDeadline, getActiveDeadlineTime,
  fmtDate, fmt12, fmtCTC, getTodayStr, isClosedStatus
} from "../lib/utils";

export default function DailyPlanner({ onNavigate, onExpandLead }) {
  const { tasks, todaysCalls, changeStatus, scheduleReminder, notifReady } = useApp();

  const overdueLeads = useMemo(() => {
    return tasks.filter(t => {
      if (isClosedStatus(t.status)) return false;
      return getDiff(getActiveDeadline(t)) < 0;
    }).sort((a, b) => new Date(getActiveDeadline(a)) - new Date(getActiveDeadline(b)));
  }, [tasks]);

  const todayLeads = useMemo(() => {
    return tasks.filter(t => {
      if (isClosedStatus(t.status)) return false;
      return getDiff(getActiveDeadline(t)) === 0;
    }).sort((a, b) => {
      const at = getActiveDeadlineTime(a);
      const bt = getActiveDeadlineTime(b);
      if (at && bt) return at.localeCompare(bt);
      return at ? -1 : 1;
    });
  }, [tasks]);

  const tomorrowLeads = useMemo(() => {
    return tasks.filter(t => {
      if (isClosedStatus(t.status)) return false;
      return getDiff(getActiveDeadline(t)) === 1;
    });
  }, [tasks]);

  const completedToday = useMemo(() => {
    return tasks.filter(t => {
      const fus = t.followUps || [];
      return fus.some(fu => fu.calledOn === getTodayStr());
    });
  }, [tasks]);

  const totalToday = overdueLeads.length + todayLeads.length;
  const progress = totalToday > 0 ? Math.round((completedToday.length / Math.max(totalToday, completedToday.length)) * 100) : 0;

  if (tasks.length === 0) {
    return (
      <div className="fade-in">
        <SectionHeader title="Daily Planner" subtitle="Your daily call schedule" />
        <EmptyState
          icon={Calendar}
          title="No calls scheduled"
          subtitle="Add leads with call-back dates to see them here"
        />
      </div>
    );
  }

  const renderLeadRow = (t, showTime = true) => {
    const activeDl = getActiveDeadline(t);
    const activeDlTime = getActiveDeadlineTime(t);
    const diff = getDiff(activeDl);
    return (
      <div key={t.id} className="task-card" onClick={() => { onNavigate("leads"); onExpandLead(t.id); }}
        style={{ padding: "14px 18px", borderLeft: `3px solid ${diff < 0 ? "#EF4444" : diff === 0 ? "#F59E0B" : "#22C55E"}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{t.name}</span>
              <StatusChip status={t.status} small />
              {diff < 0 && <DeadlineBadge date={activeDl} time={activeDlTime} />}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
              {t.company && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 size={11} /> {t.company}</span>}
              {t.contact && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} /> {t.contact}</span>}
              {t.ctc && <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>CTC: {fmtCTC(t.ctc)}</span>}
              {t.stipend && !t.ctc && <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Stipend: {t.stipend}</span>}
              {t.opportunityType && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t.opportunityType}</span>}
              {diff < 0 && <span style={{ color: "#DC2626", fontWeight: 600 }}>{fmtDate(activeDl)}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {showTime && activeDlTime && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{fmt12(activeDlTime)}</div>
                <TimeBadge date={activeDl} time={activeDlTime} />
              </div>
            )}
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <SectionHeader
        title="Daily Planner"
        subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      {/* ── Progress Card ── */}
      <div className="card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>Today's Progress</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{totalToday}</span>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 4 }}>calls pending</span>
            </div>
            <div>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#22C55E" }}>{completedToday.length}</span>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 4 }}>completed today</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 8, background: "var(--bg-tertiary)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", background: progress >= 80 ? "#22C55E" : progress >= 40 ? "#F59E0B" : "#EF4444", borderRadius: 99, width: `${progress}%`, transition: "width 0.5s ease" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{progress}%</span>
          </div>
        </div>
      </div>

      {/* ── Overdue Section ── */}
      {overdueLeads.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertCircle size={16} color="#EF4444" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#DC2626" }}>Overdue ({overdueLeads.length})</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {overdueLeads.map(t => renderLeadRow(t, false))}
          </div>
        </div>
      )}

      {/* ── Today's Calls ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Phone size={16} color="#F59E0B" />
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Today's Calls ({todayLeads.length})</h3>
        </div>
        {todayLeads.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
            <CheckCircle2 size={24} color="#22C55E" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#16A34A" }}>All clear for today!</p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No calls scheduled for today</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayLeads.map(t => renderLeadRow(t, true))}
          </div>
        )}
      </div>

      {/* ── Tomorrow Preview ── */}
      {tomorrowLeads.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={16} color="#22C55E" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>Tomorrow ({tomorrowLeads.length})</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, opacity: 0.8 }}>
            {tomorrowLeads.slice(0, 5).map(t => renderLeadRow(t, true))}
            {tomorrowLeads.length > 5 && (
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", marginTop: 4 }}>+{tomorrowLeads.length - 5} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
