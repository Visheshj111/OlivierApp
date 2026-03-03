import { useState, useMemo, useRef } from "react";
import {
  Plus, X, Pencil, Trash2, Phone, Building2, Calendar, Clock,
  FileText, AlertCircle, CircleCheck, ChevronDown, ChevronUp,
  GitCommitHorizontal, Search, Bell, Mail, MapPin, Briefcase,
  Upload, Download, Filter, ArrowUpDown, CheckSquare, Square,
  MoreHorizontal, Tag, ExternalLink, Check, Linkedin, GraduationCap
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  StatusChip, DeadlineBadge, TimeBadge, SourceChip,
  MetaItem, EmptyState, ConfirmModal, TagInput, SectionHeader, Dot
} from "../components/Shared";
import {
  ALL_STATUSES, PIPELINE_STAGES, LEAD_SOURCES,
  STATUS_COLORS, EMPTY_FORM, EMPTY_FU, OPPORTUNITY_TYPES, COURSES,
  getDiff, getActiveDeadline, getActiveDeadlineTime,
  fmtDate, fmtDateShort, fmt12, fmtCTC, fmtRelative,
  parseCSV, exportLeadsCSV, getAllStatuses, isClosedStatus
} from "../lib/utils";

/* ════════════════════════════════════════════════════════════ */
export default function Leads({ expandedCard, setExpandedCard }) {
  const {
    tasks, addLead, updateLead, deleteLead, deleteLeads,
    changeStatus, bulkChangeStatus, addFollowUp, deleteFollowUp,
    importLeads, scheduleReminder, notifReady
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("deadline");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(null);
  const [fuForm, setFuForm] = useState(EMPTY_FU);
  const [reminderOpen, setReminderOpen] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef(null);

  /* ── Filtered & Sorted Leads ── */
  const filtered = useMemo(() => {
    let list = tasks.filter(t => {
      const d = getDiff(getActiveDeadline(t));
      if (filter === "urgent") return d >= 0 && d <= 1 && !isClosedStatus(t.status);
      if (filter === "week") return d > 1 && d <= 7 && !isClosedStatus(t.status);
      if (filter === "overdue") return d < 0 && !isClosedStatus(t.status);
      if (filter === "converted") return t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won";
      if (filter === "notconverted") return t.status === "Not Converted" || t.status === "Not Placed" || t.status === "Closed Lost";
      if (filter === "closed") return t.status === "Closed";
      if (filter === "active") return !isClosedStatus(t.status);
      return true;
    });
    if (statusFilter) list = list.filter(t => t.status === statusFilter);
    if (sourceFilter) list = list.filter(t => (t.source || "Other") === sourceFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(t =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.company || "").toLowerCase().includes(q) ||
        (t.contact || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.notes || "").toLowerCase().includes(q) ||
        (t.role || "").toLowerCase().includes(q) ||
        (t.linkedIn || "").toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q)) ||
        (t.courses || []).some(c => c.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name": cmp = (a.name || "").localeCompare(b.name || ""); break;
        case "value": cmp = (parseFloat(b.ctc) || 0) - (parseFloat(a.ctc) || 0); break;
        case "created": cmp = new Date(b.createdAt || 0) - new Date(a.createdAt || 0); break;
        default: cmp = new Date(getActiveDeadline(a) || "9999") - new Date(getActiveDeadline(b) || "9999");
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [tasks, filter, statusFilter, sourceFilter, searchQ, sortBy, sortDir]);

  const urgent = tasks.filter(t => { const d = getDiff(getActiveDeadline(t)); return d >= 0 && d <= 1 && !isClosedStatus(t.status); }).length;
  const overdue = tasks.filter(t => getDiff(getActiveDeadline(t)) < 0 && !isClosedStatus(t.status)).length;
  const active = tasks.filter(t => !isClosedStatus(t.status)).length;
  const converted = tasks.filter(t => t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won").length;
  const notConverted = tasks.filter(t => t.status === "Not Converted" || t.status === "Not Placed" || t.status === "Closed Lost").length;

  /* ── Form Handlers ── */
  const handleSubmit = () => {
    if (!form.name) return;
    if (editId !== null) {
      updateLead(editId, {
        name: form.name, company: form.company, contact: form.contact, email: form.email,
        calledOn: form.calledOn, date: form.date, deadlineTime: form.deadlineTime,
        notes: form.notes, status: form.status || "New",
        source: form.source, tags: form.tags,
        ctc: form.ctc, stipend: form.stipend, linkedIn: form.linkedIn,
        opportunityType: form.opportunityType, courses: form.courses, role: form.role
      });
      setEditId(null);
    } else {
      addLead(form);
    }
    setForm(EMPTY_FORM); setShowForm(false);
  };

  const startEdit = (t) => {
    setForm({
      name: t.name, company: t.company || "", contact: t.contact || "", email: t.email || "",
      calledOn: t.calledOn || "", date: t.date, deadlineTime: t.deadlineTime || "",
      notes: t.notes || "", status: t.status || "New",
      source: t.source || "", tags: t.tags || [],
      ctc: t.ctc || "", stipend: t.stipend || "", linkedIn: t.linkedIn || "",
      opportunityType: t.opportunityType || "", courses: t.courses || [], role: t.role || ""
    });
    setEditId(t.id); setShowForm(true);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = parseCSV(ev.target.result);
      if (data.length) {
        const result = importLeads(data);
        if (result.imported > 0) {
          const parts = [`Imported ${result.imported} lead${result.imported === 1 ? "" : "s"}`];
          if (result.skipped) parts.push(`${result.skipped} empty row${result.skipped === 1 ? "" : "s"} skipped`);
          if (result.defaultedDates) parts.push(`${result.defaultedDates} call-back date${result.defaultedDates === 1 ? "" : "s"} set to today`);
          if (result.invalidTimes) parts.push(`${result.invalidTimes} call-back time${result.invalidTimes === 1 ? "" : "s"} cleared`);
          if (result.invalidCalledOn) parts.push(`${result.invalidCalledOn} called-on date${result.invalidCalledOn === 1 ? "" : "s"} cleared`);
          alert(parts.join(". ") + ".");
        } else {
          alert("No valid data found in CSV.");
        }
      } else {
        alert("No valid data found in CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(t => t.id)));
  };

  const handleBulkDelete = () => {
    deleteLeads([...selectedIds]);
    setSelectedIds(new Set());
    setShowBulkActions(false);
  };

  const handleBulkStatus = (status) => {
    bulkChangeStatus([...selectedIds], status);
    setSelectedIds(new Set());
    setShowBulkActions(false);
  };

  /* ── Build Timeline ── */
  const buildTimeline = (t) => {
    const nodes = [];
    nodes.push({ type: "created", calledOn: t.calledOn, deadline: t.date, deadlineTime: t.deadlineTime, remark: t.notes, missed: false, label: "Lead Created" });
    let prevDeadline = t.date;
    (t.followUps || []).forEach((fu, i) => {
      const callD = fu.calledOn ? new Date(fu.calledOn + "T00:00:00") : null;
      const prevD = prevDeadline ? new Date(prevDeadline + "T00:00:00") : null;
      const missed = callD && prevD && callD > prevD;
      nodes.push({ type: "followup", calledOn: fu.calledOn, deadline: fu.deadline, deadlineTime: fu.deadlineTime, remark: fu.remark, missed, label: `Follow-up #${i + 1}`, fuId: fu.id });
      prevDeadline = fu.deadline;
    });
    if (t.status === "Closed") {
      nodes.push({ type: "closed", calledOn: null, deadline: null, deadlineTime: null, remark: null, missed: false, label: "Lead Closed" });
    }
    return nodes;
  };

  const inp = (field, placeholder, type = "text", extra = {}) => (
    <input type={type} placeholder={placeholder} value={form[field]}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      className="fi" style={{ width: "100%", marginBottom: 10, ...extra }} />
  );

  return (
    <div className="fade-in">
      <SectionHeader
        title="Contacts"
        subtitle={`${tasks.length} total · ${active} active · ${overdue} overdue`}
        action={<>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />
          <button className="btn-o sm" onClick={() => fileInputRef.current?.click()}><Upload size={13} /> Import CSV</button>
          <button className="btn-o sm" onClick={() => exportLeadsCSV(tasks)}><Download size={13} /> Export</button>
          <button className="btn-p sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); }}>
            {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> New Lead</>}
          </button>
        </>}
      />

      {/* ── Add/Edit Form — SCROLLABLE ── */}
      {showForm && (
        <div className="card anim" style={{ marginBottom: 20, boxShadow: "0 4px 20px rgba(15,23,42,.06)", maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, position: "sticky", top: 0, background: "var(--bg-primary)", zIndex: 2, padding: "12px 0 8px" }}>
            {editId ? <Pencil size={15} color="var(--text-tertiary)" /> : <Plus size={15} color="var(--text-tertiary)" />}
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{editId ? "Edit Lead" : "New Lead"}</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="fl"><FileText size={11} /> Contact Information</div>
            </div>
            {inp("name", "Full Name (HR / TA / Recruiter) *")}
            {inp("company", "Company Name")}
            {inp("contact", "Phone Number")}
            {inp("email", "Email Address", "email")}
            {inp("linkedIn", "LinkedIn Profile URL")}
            {inp("role", "Role/Designation (e.g. Campus Recruiter)")}

            <div style={{ gridColumn: "1 / -1" }}><hr className="fd" /></div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div className="fl"><Calendar size={11} /> Schedule</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Called On</span>
              {inp("calledOn", "", "date", { marginBottom: 0 })}
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Call Back Date</span>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                disabled={form.status === "Closed"}
                className="fi"
                style={{ marginBottom: 0, opacity: form.status === "Closed" ? 0.4 : 1, cursor: form.status === "Closed" ? "not-allowed" : "auto", pointerEvents: form.status === "Closed" ? "none" : "auto" }}
              />
              <div
                style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, cursor: "pointer", userSelect: "none" }}
                onClick={() => setForm(f => ({ ...f, status: f.status === "Closed" ? "New" : "Closed" }))}
              >
                <div className={`checkbox${form.status === "Closed" ? " checked" : ""}`} style={{ width: 16, height: 16, flexShrink: 0 }}>
                  {form.status === "Closed" && <Check size={10} color="#fff" />}
                </div>
                <span style={{ fontSize: 11, color: form.status === "Closed" ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: 500 }}>Lead is closed — no callback needed</span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Call Back Time</span>
              <input type="time" value={form.deadlineTime} onChange={e => setForm(f => ({ ...f, deadlineTime: e.target.value }))} className="fi" />
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Opportunity Type</span>
              <select value={form.opportunityType} onChange={e => setForm(f => ({ ...f, opportunityType: e.target.value }))} className="fi" style={{ marginBottom: 0 }}>
                <option value="">Select type...</option>
                {OPPORTUNITY_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}><hr className="fd" /></div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div className="fl"><Briefcase size={11} /> Opportunity Details</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>CTC (for Full-time)</span>
              {inp("ctc", "e.g. 5 LPA or 500000", "text", { marginBottom: 0 })}
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Stipend (for Internship)</span>
              {inp("stipend", "e.g. 15000/month", "text", { marginBottom: 0 })}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Courses Eligible</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COURSES.map(c => {
                  const isActive = (form.courses || []).includes(c);
                  return (
                    <button key={c} type="button" onClick={() => {
                      const courses = form.courses || [];
                      setForm(f => ({ ...f, courses: isActive ? courses.filter(x => x !== c) : [...courses, c] }));
                    }} className={`btn-o xs${isActive ? " active" : ""}`} style={{ fontSize: 11 }}>
                      {isActive && <Check size={10} />} {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}><hr className="fd" /></div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div className="fl"><Tag size={11} /> Classification</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Status</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="fi" style={{ marginBottom: 0 }}>
                {getAllStatuses().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Source</span>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="fi" style={{ marginBottom: 0 }}>
                <option value="">Select source...</option>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 500 }}>Tags</span>
              <TagInput value={form.tags || []} onChange={tags => setForm(f => ({ ...f, tags }))} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}><hr className="fd" /></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="fl"><FileText size={11} /> Notes</div>
              <textarea placeholder="Add notes or remarks..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="fi" style={{ marginBottom: 16 }} />
            </div>

            <div style={{ gridColumn: "1 / -1", position: "sticky", bottom: 0, background: "var(--bg-primary)", paddingBottom: 4, zIndex: 2 }}>
              <button className="btn-p" onClick={handleSubmit} disabled={!form.name}
                style={{ width: "100%", justifyContent: "center", padding: "11px 20px" }}>
                <CircleCheck size={15} /> {editId ? "Update Lead" : "Save Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      {tasks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            {[
              { key: "all", label: "All", count: tasks.length },
              { key: "active", label: "Active", count: active },
              { key: "urgent", label: "Urgent", count: urgent },
              { key: "week", label: "This Week" },
              { key: "overdue", label: "Overdue", count: overdue },
              { key: "converted", label: "Converted", count: converted },
              { key: "notconverted", label: "Not Converted", count: notConverted },
            ].map(tab => (
              <button key={tab.key} onClick={() => { setFilter(tab.key); setSelectedIds(new Set()); }}
                className={`filter-tab${filter === tab.key ? " active" : ""}`}>
                {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ""}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button className={`btn-o xs${showFilters ? " active" : ""}`} onClick={() => setShowFilters(v => !v)}>
                <Filter size={12} /> Filters
              </button>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="fi sm" style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}>
                <option value="deadline">Sort: Deadline</option>
                <option value="name">Sort: Name</option>
                <option value="value">Sort: CTC</option>
                <option value="created">Sort: Created</option>
              </select>
              <button className="icon-btn" style={{ padding: 4 }} onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
                <ArrowUpDown size={14} />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="anim" style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 14px", background: "var(--bg-tertiary)", borderRadius: 10, border: "1px solid var(--border-default)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)" }}>Status:</span>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="fi sm" style={{ width: "auto", padding: "3px 8px" }}>
                  <option value="">All</option>
                  {getAllStatuses().map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)" }}>Source:</span>
                <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="fi sm" style={{ width: "auto", padding: "3px 8px" }}>
                  <option value="">All</option>
                  {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button className="btn-o xs" onClick={() => { setStatusFilter(""); setSourceFilter(""); }}>
                <X size={10} /> Clear
              </button>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="anim" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#111827", borderRadius: 10, marginTop: 8, color: "#fff" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedIds.size} selected</span>
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <select onChange={e => { if (e.target.value) handleBulkStatus(e.target.value); e.target.value = ""; }}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 12, cursor: "pointer" }}>
                  <option value="">Change Status...</option>
                  {getAllStatuses().map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn-p xs danger" onClick={handleBulkDelete}>
                  <Trash2 size={11} /> Delete
                </button>
                <button className="btn-o xs" style={{ color: "#fff", borderColor: "rgba(255,255,255,.2)" }}
                  onClick={() => setSelectedIds(new Set())}>
                  <X size={11} /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
        {searchQ && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSearchQ("")}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: 4 }}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search by name, company, phone, email, role, courses..."
          className="fi" style={{ paddingLeft: 36, paddingRight: searchQ ? 32 : 14, fontSize: 13 }} />
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <EmptyState
          icon={FileText}
          title={tasks.length === 0 ? "No leads yet" : "No results"}
          subtitle={tasks.length === 0 ? 'Click "New Lead" to add your first one' : "Try different filters or search terms"}
        />
      )}

      {/* ── Lead Cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(t => {
          const activeDl = getActiveDeadline(t);
          const activeDlTime = getActiveDeadlineTime(t);
          const diff = getDiff(activeDl);
          const accent = (t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won") ? "#16A34A"
            : (t.status === "Not Converted" || t.status === "Not Placed" || t.status === "Closed Lost") ? "#DC2626"
            : t.status === "Closed" ? "#71717a"
            : diff < 0 ? "#EF4444" : diff === 0 ? "#F59E0B" : diff === 1 ? "#10B981" : "var(--border-default)";
          const isExpanded = expandedCard === t.id;
          const tl = buildTimeline(t);
          const isFuOpen = followUpOpen === t.id;
          const fuCount = (t.followUps || []).length;
          const isSelected = selectedIds.has(t.id);

          return (
            <div key={t.id} className={`task-card${isExpanded ? " expanded" : ""}`}
              style={{ borderLeft: `3px solid ${accent}`, background: isSelected ? "var(--info-bg)" : "var(--bg-secondary)" }}
              onClick={() => { if (!isExpanded) setExpandedCard(t.id); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                {/* Checkbox */}
                <div className={`checkbox${isSelected ? " checked" : ""}`}
                  onClick={e => { e.stopPropagation(); toggleSelect(t.id); }}
                  style={{ marginTop: 2 }}>
                  {isSelected && <Check size={12} color="#fff" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + Badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{t.name}</span>
                    <StatusChip status={t.status} />
                    <DeadlineBadge date={activeDl} time={activeDlTime} />
                    {t.source && <SourceChip source={t.source} />}
                    {fuCount > 0 && (
                      <span className="chip" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
                        {fuCount} follow-up{fuCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                    {t.company && <MetaItem icon={Building2}>{t.company}</MetaItem>}
                    {t.contact && <MetaItem icon={Phone}>{t.contact}</MetaItem>}
                    {t.email && <MetaItem icon={Mail}>{t.email}</MetaItem>}
                    {t.linkedIn && (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); window.open(t.linkedIn.startsWith("http") ? t.linkedIn : "https://" + t.linkedIn, "_blank"); }}>
                        <Linkedin size={12} /> LinkedIn
                      </span>
                    )}
                    {t.ctc && <MetaItem icon={Briefcase}>CTC: {fmtCTC(t.ctc)}</MetaItem>}
                    {t.stipend && <MetaItem icon={Briefcase}>Stipend: {t.stipend}</MetaItem>}
                    {t.opportunityType && <MetaItem icon={GraduationCap}>{t.opportunityType}</MetaItem>}
                    <MetaItem icon={Calendar}>{fmtDate(activeDl)}{activeDlTime ? " · " + fmt12(activeDlTime) : ""}</MetaItem>
                  </div>

                  {/* Courses */}
                  {(t.courses || []).length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {t.courses.map((c, i) => <span key={i} className="chip" style={{ background: "var(--info-bg)", color: "var(--info)", fontSize: 10 }}>{c}</span>)}
                    </div>
                  )}

                  {/* Tags */}
                  {(t.tags || []).length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                      {t.tags.map((tag, i) => <span key={i} className="tag">{tag}</span>)}
                    </div>
                  )}

                  {/* Notes */}
                  {t.notes && !isExpanded && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-tertiary)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <FileText size={11} style={{ marginTop: 1, flexShrink: 0 }} color="var(--text-tertiary)" />
                      <span className="truncate">{t.notes}</span>
                    </div>
                  )}

                  {/* ── EXPANDED SECTION ── */}
                  {isExpanded && (
                    <div className="anim" onClick={e => e.stopPropagation()}>
                      {t.notes && (
                        <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)", background: "var(--bg-tertiary)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4 }}>NOTES</div>
                          {t.notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                        <button className="btn-o sm" onClick={() => { setFollowUpOpen(isFuOpen ? null : t.id); setFuForm(EMPTY_FU); }}>
                          <Plus size={12} /> Add Follow-up
                        </button>
                        <button className="btn-o sm" onClick={() => startEdit(t)}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button className="btn-o sm" onClick={() => setExpandedCard(null)}>
                          <ChevronUp size={12} /> Collapse
                        </button>
                      </div>

                      {/* Follow-up Form */}
                      {isFuOpen && (
                        <div className="anim" style={{ marginTop: 12, background: "var(--bg-tertiary)", border: "1px solid var(--border-default)", borderRadius: 10, padding: 16 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>New Follow-up</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "start" }}>
                            <div>
                              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4, fontWeight: 500 }}>Called On</span>
                              <input type="date" value={fuForm.calledOn} onChange={e => setFuForm(f => ({ ...f, calledOn: e.target.value }))} className="fi sm" />
                            </div>
                            <div>
                              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4, fontWeight: 500 }}>Call Back Date</span>
                              <input
                                type="date"
                                value={fuForm.deadline}
                                onChange={e => setFuForm(f => ({ ...f, deadline: e.target.value }))}
                                disabled={fuForm.closed}
                                className="fi sm"
                                style={{ opacity: fuForm.closed ? 0.4 : 1, pointerEvents: fuForm.closed ? "none" : "auto" }}
                              />
                              <div
                                style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, cursor: "pointer", userSelect: "none" }}
                                onClick={() => setFuForm(f => ({ ...f, closed: !f.closed, deadline: !f.closed ? "" : f.deadline }))}
                              >
                                <div className={`checkbox${fuForm.closed ? " checked" : ""}`} style={{ width: 14, height: 14, flexShrink: 0 }}>
                                  {fuForm.closed && <Check size={9} color="#fff" />}
                                </div>
                                <span style={{ fontSize: 10, color: fuForm.closed ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: 500 }}>Lead is closed</span>
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4, fontWeight: 500 }}>Call Back Time</span>
                              <input type="time" value={fuForm.deadlineTime} onChange={e => setFuForm(f => ({ ...f, deadlineTime: e.target.value }))} disabled={fuForm.closed} className="fi sm" style={{ opacity: fuForm.closed ? 0.4 : 1, pointerEvents: fuForm.closed ? "none" : "auto" }} />
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginTop: 8, marginBottom: 4, fontWeight: 500 }}>Remark</span>
                          <textarea placeholder="What happened on this call?" value={fuForm.remark} onChange={e => setFuForm(f => ({ ...f, remark: e.target.value }))} rows={2} className="fi sm" style={{ marginBottom: 10 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-p xs" onClick={() => {
                              addFollowUp(t.id, fuForm);
                              if (fuForm.closed) changeStatus(t.id, "Closed");
                              setFuForm(EMPTY_FU);
                              setFollowUpOpen(null);
                            }} disabled={!fuForm.deadline && !fuForm.closed}>
                              <CircleCheck size={12} /> Save
                            </button>
                            <button className="btn-o xs" onClick={() => setFollowUpOpen(null)}>Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                          <GitCommitHorizontal size={14} color="var(--text-secondary)" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Timeline</span>
                        </div>
                        <div className="tl-wrap">
                          <div className="tl-line" />
                          {tl.map((n, i) => (
                            <div key={i} className="tl-node">
                              <div className={`tl-dot${n.type === "created" ? " first" : ""}${n.missed ? " missed" : ""}${n.type === "closed" ? " closed" : ""}`}>
                                {n.type === "created" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                                {n.missed && <AlertCircle size={8} color="#EF4444" />}
                                {n.type === "closed" && <Check size={8} color="#71717a" />}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: n.type === "closed" ? "#71717a" : "var(--text-primary)" }}>{n.label}</span>
                                  {n.missed && <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444", background: "#FEE2E2", padding: "1px 6px", borderRadius: 3, border: "1px solid #FECACA" }}>MISSED</span>}
                                  {n.type === "closed" && <span style={{ fontSize: 10, fontWeight: 700, color: "#52525B", background: "#F4F4F5", padding: "1px 6px", borderRadius: 3, border: "1px solid #D4D4D8" }}>CLOSED</span>}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, display: "flex", flexWrap: "wrap", gap: 12 }}>
                                  {n.calledOn && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={10} /> {fmtDateShort(n.calledOn)}</span>}
                                  {n.deadline && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={10} /> {fmtDateShort(n.deadline)}{n.deadlineTime ? " " + fmt12(n.deadlineTime) : ""}</span>}
                                </div>
                                {n.remark && <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>"{n.remark}"</div>}
                                {n.type === "followup" && (
                                  <button onClick={() => deleteFollowUp(t.id, n.fuId)}
                                    style={{ marginTop: 4, background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 3, padding: 0, cursor: "pointer" }}
                                    onMouseEnter={e => { e.currentTarget.style.color = "#EF4444"; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; }}>
                                    <Trash2 size={10} /> Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center", position: "relative" }} onClick={e => e.stopPropagation()}>
                  <select value={t.status} onChange={e => changeStatus(t.id, e.target.value)}
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 8, border: `1.5px solid ${(STATUS_COLORS[t.status] || STATUS_COLORS["New"]).bg}`, background: (STATUS_COLORS[t.status] || STATUS_COLORS["New"]).bg, color: (STATUS_COLORS[t.status] || STATUS_COLORS["New"]).color, cursor: "pointer", outline: "none", fontFamily: "inherit", appearance: "auto" }}>
                    {getAllStatuses().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className={`icon-btn${reminderOpen === t.id ? " active" : ""}`} title="Reminder"
                    onClick={e => { e.stopPropagation(); setReminderOpen(reminderOpen === t.id ? null : t.id); }}>
                    <Bell size={14} />
                  </button>
                  {reminderOpen === t.id && (
                    <div className="dropdown-menu anim" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)" }} onClick={e => e.stopPropagation()}>
                      <button className="dropdown-item bold" onClick={() => { scheduleReminder(t, 0); setReminderOpen(null); }}><Bell size={13} /> Remind Now</button>
                      <hr className="dropdown-divider" />
                      {[{ l: "In 15 min", v: 15 }, { l: "In 30 min", v: 30 }, { l: "In 1 hour", v: 60 }, { l: "In 2 hours", v: 120 }].map(o => (
                        <button key={o.v} className="dropdown-item" onClick={() => { scheduleReminder(t, o.v); setReminderOpen(null); }}><Clock size={13} /> {o.l}</button>
                      ))}
                    </div>
                  )}
                  <button className="icon-btn" title="Edit" onClick={() => startEdit(t)}><Pencil size={14} /></button>
                  <button className="icon-btn danger" title="Delete" onClick={() => setConfirmDelete(t.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Lead?"
          message="This action cannot be undone. All follow-ups will be removed too."
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteLead(confirmDelete); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
