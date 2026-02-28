import React, { useState, useMemo } from "react";
import {
  Download, ArrowUpDown, Search, Filter,
  Phone, Mail, Building2, Calendar, Linkedin
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { SectionHeader, StatusChip, DeadlineBadge, EmptyState } from "../components/Shared";
import {
  ALL_STATUSES, LEAD_SOURCES,
  fmtDate, fmtDateShort, fmt12, fmtCTC,
  getDiff, getActiveDeadline, getActiveDeadlineTime,
  calculateLeadScore, exportLeadsCSV, getAllStatuses, isClosedStatus
} from "../lib/utils";

const SORT_OPTS = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: "status", label: "Status" },
  { key: "deadline", label: "Deadline" },
  { key: "value", label: "CTC" },
  { key: "score", label: "Score" },
  { key: "created", label: "Date Added" },
];

export default function AllLeadsSheet() {
  const { tasks } = useApp();
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");

  /* ── Max follow-ups across all tasks (for dynamic columns) ── */
  const maxFU = useMemo(() => {
    return tasks.reduce((mx, t) => Math.max(mx, (t.followUps || []).length), 0);
  }, [tasks]);

  const sorted = useMemo(() => {
    let list = [...tasks];

    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.company?.toLowerCase().includes(q) ||
        t.contact?.includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.role?.toLowerCase().includes(q) ||
        t.linkedIn?.toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q)) ||
        (t.courses || []).some(c => c.toLowerCase().includes(q))
      );
    }

    if (filterStatus !== "All") list = list.filter(t => t.status === filterStatus);
    if (filterSource !== "All") list = list.filter(t => t.source === filterSource);

    list.sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case "name": va = a.name?.toLowerCase() || ""; vb = b.name?.toLowerCase() || ""; break;
        case "company": va = a.company?.toLowerCase() || ""; vb = b.company?.toLowerCase() || ""; break;
        case "status": va = ALL_STATUSES.indexOf(a.status); vb = ALL_STATUSES.indexOf(b.status); break;
        case "deadline":
          va = getActiveDeadline(a) || "9999-12-31";
          vb = getActiveDeadline(b) || "9999-12-31";
          break;
        case "value": va = Number(a.ctc) || 0; vb = Number(b.ctc) || 0; break;
        case "score": va = calculateLeadScore(a); vb = calculateLeadScore(b); break;
        case "created":
        default:
          va = a.id || 0; vb = b.id || 0; break;
      }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return list;
  }, [tasks, searchQ, sortBy, sortDir, filterStatus, filterSource]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
  };

  const Th = ({ label, sortKey, colSpan }) => (
    <th colSpan={colSpan} onClick={sortKey ? () => handleSort(sortKey) : undefined} style={sortKey ? { cursor: "pointer", userSelect: "none" } : {}}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {sortKey && <ArrowUpDown size={11} style={{ opacity: sortBy === sortKey ? 1 : 0.3 }} />}
        {sortKey && sortBy === sortKey && <span style={{ fontSize: 9 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
      </div>
    </th>
  );

  /* Build follow-up column indices */
  const fuIndices = [];
  for (let i = 0; i < maxFU; i++) fuIndices.push(i);

  return (
    <div className="fade-in">
      <SectionHeader
        title="All Contacts"
        subtitle={`${sorted.length} contact${sorted.length !== 1 ? "s" : ""}`}
        action={
          <button className="btn-o sm" onClick={() => exportLeadsCSV(tasks)}>
            <Download size={13} /> Export CSV
          </button>
        }
      />

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search contacts..." className="fi sm" style={{ paddingLeft: 32, width: "100%" }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="fi sm" style={{ width: "auto" }}>
          <option value="All">All Statuses</option>
          {getAllStatuses().map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="fi sm" style={{ width: "auto" }}>
          <option value="All">All Sources</option>
          {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      {sorted.length === 0 ? (
        <EmptyState icon={Filter} title="No leads match" subtitle="Try adjusting your filters or search" />
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border-default)", borderRadius: 10 }}>
          <table className="data-table" style={{ minWidth: 900 + maxFU * 350 }}>
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <Th label="Name" sortKey="name" />
                <Th label="Company" sortKey="company" />
                <th>Role</th>
                <th>Phone</th>
                <th>Email</th>
                <th>LinkedIn</th>
                <Th label="Status" sortKey="status" />
                <th>Source</th>
                <th>Type</th>
                <th>Called On</th>
                <th>Call Back</th>
                <Th label="CTC" sortKey="value" />
                <th>Stipend</th>
                <Th label="Score" sortKey="score" />
                <th>Courses</th>
                <th>Tags</th>
                <th>Notes</th>
                {/* Dynamic follow-up column groups */}
                {fuIndices.map(idx => (
                  <th key={`fu-header-${idx}`} colSpan={4}
                    style={{ textAlign: "center", background: idx % 2 === 0 ? "var(--bg-tertiary)" : "var(--bg-secondary)", borderLeft: "2px solid var(--border-default)" }}>
                    FU {idx + 1}
                  </th>
                ))}
              </tr>
              {/* Sub-header for follow-up columns */}
              {maxFU > 0 && (
                <tr>
                  {/* Empty cells for all fixed columns (18 columns) */}
                  <th colSpan={18} style={{ padding: 0, borderBottom: "none" }}></th>
                  {fuIndices.map(idx => (
                    <React.Fragment key={`fu-sub-${idx}`}>
                      {["Called On", "Call Back", "Remark", "Missed?"].map((lbl, j) => (
                        <th key={`${idx}-${j}`}
                          style={{ fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", background: idx % 2 === 0 ? "var(--bg-tertiary)" : "var(--bg-secondary)", borderLeft: j === 0 ? "2px solid var(--border-default)" : undefined }}>
                          {lbl}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {sorted.map((t, i) => {
                const dl = getActiveDeadline(t);
                const dlTime = getActiveDeadlineTime(t);
                const score = calculateLeadScore(t);
                const fus = t.followUps || [];

                return (
                  <tr key={t.id}>
                    <td style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{t.name}</td>
                    <td>{t.company || <Dash />}</td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.role || <Dash />}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {t.contact ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Phone size={11} color="var(--text-tertiary)" /> {t.contact}
                        </span>
                      ) : <Dash />}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {t.email ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Mail size={11} color="var(--text-tertiary)" /> {t.email}
                        </span>
                      ) : <Dash />}
                    </td>
                    <td>
                      {t.linkedIn ? (
                        <a href={t.linkedIn.startsWith("http") ? t.linkedIn : "https://" + t.linkedIn} target="_blank" rel="noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 4, color: "#0A66C2", fontSize: 12 }}>
                          <Linkedin size={11} /> Profile
                        </a>
                      ) : <Dash />}
                    </td>
                    <td><StatusChip status={t.status} small /></td>
                    <td>{t.source ? <span className="chip" style={{ fontSize: 11 }}>{t.source}</span> : <Dash />}</td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.opportunityType || <Dash />}</td>
                    {/* Called On (initial) */}
                    <td style={{ fontSize: 12, whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                      {t.calledOn ? fmtDateShort(t.calledOn) : <Dash />}
                    </td>
                    {/* Call Back (initial deadline) */}
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {t.date ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {fmtDateShort(t.date)}
                          {t.deadlineTime && <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{fmt12(t.deadlineTime)}</span>}
                        </span>
                      ) : <Dash />}
                    </td>
                    <td>
                      {t.ctc ? (
                        <span style={{ fontWeight: 600, color: "#059669", fontSize: 12 }}>{fmtCTC(Number(t.ctc))}</span>
                      ) : <Dash />}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.stipend || <Dash />}</td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 28, height: 28, borderRadius: "50%", fontSize: 11, fontWeight: 700,
                        background: score >= 70 ? "#F0FDF4" : score >= 40 ? "#FFFBEB" : "#FEF2F2",
                        color: score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626"
                      }}>
                        {score}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {(t.courses || []).map((c, j) => (
                          <span key={j} className="chip" style={{ fontSize: 9, background: "var(--info-bg)", color: "var(--info)" }}>{c}</span>
                        ))}
                        {(!t.courses || t.courses.length === 0) && <Dash />}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {(t.tags || []).map((tag, j) => (
                          <span key={j} className="tag" style={{ fontSize: 10 }}>{tag}</span>
                        ))}
                        {(!t.tags || t.tags.length === 0) && <Dash />}
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: "var(--text-secondary)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.notes || <Dash />}
                    </td>
                    {/* Dynamic follow-up columns */}
                    {fuIndices.map(idx => {
                      const fu = fus[idx];
                      const bg = idx % 2 === 0 ? "var(--bg-tertiary)" : undefined;
                      if (!fu) {
                        return [
                          <td key={`${t.id}-fu${idx}-co`} style={{ background: bg, borderLeft: "2px solid var(--border-default)" }}><Dash /></td>,
                          <td key={`${t.id}-fu${idx}-cb`} style={{ background: bg }}><Dash /></td>,
                          <td key={`${t.id}-fu${idx}-rm`} style={{ background: bg }}><Dash /></td>,
                          <td key={`${t.id}-fu${idx}-ms`} style={{ background: bg }}><Dash /></td>,
                        ];
                      }
                      // Determine if deadline was missed: calledOn > previous deadline
                      let missed = false;
                      if (fu.calledOn) {
                        const prevDeadline = idx === 0 ? t.date : (fus[idx - 1]?.deadline || t.date);
                        if (prevDeadline) {
                          const callD = new Date(fu.calledOn + "T00:00:00");
                          const prevD = new Date(prevDeadline + "T00:00:00");
                          missed = callD > prevD;
                        }
                      }
                      return [
                        <td key={`${t.id}-fu${idx}-co`} style={{ fontSize: 11, whiteSpace: "nowrap", color: "var(--text-secondary)", background: bg, borderLeft: "2px solid var(--border-default)" }}>
                          {fu.calledOn ? fmtDateShort(fu.calledOn) : <Dash />}
                        </td>,
                        <td key={`${t.id}-fu${idx}-cb`} style={{ fontSize: 11, whiteSpace: "nowrap", background: bg }}>
                          {fu.deadline ? (
                            <span>
                              {fmtDateShort(fu.deadline)}
                              {fu.deadlineTime && <span style={{ color: "var(--text-tertiary)", marginLeft: 3 }}>{fmt12(fu.deadlineTime)}</span>}
                            </span>
                          ) : <Dash />}
                        </td>,
                        <td key={`${t.id}-fu${idx}-rm`} style={{ fontSize: 11, color: "var(--text-secondary)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: bg }}>
                          {fu.remark || <Dash />}
                        </td>,
                        <td key={`${t.id}-fu${idx}-ms`} style={{ textAlign: "center", background: bg }}>
                          {missed ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEE2E2", padding: "2px 6px", borderRadius: 4 }}>Yes</span>
                          ) : (
                            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>No</span>
                          )}
                        </td>,
                      ];
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Summary Footer ── */}
      {sorted.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginTop: 16, padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: 10, border: "1px solid var(--border-default)", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>{sorted.length}</strong> contacts shown
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Avg score: <strong style={{ color: "var(--text-primary)" }}>{sorted.length > 0 ? Math.round(sorted.reduce((s, t) => s + calculateLeadScore(t), 0) / sorted.length) : 0}</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            With follow-ups: <strong style={{ color: "var(--text-primary)" }}>{sorted.filter(t => (t.followUps || []).length > 0).length}</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Max follow-ups: <strong style={{ color: "var(--text-primary)" }}>{maxFU}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

/* Small dash placeholder */
function Dash() {
  return <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>;
}
