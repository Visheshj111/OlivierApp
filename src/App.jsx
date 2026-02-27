import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bell, BellOff, Plus, X, Pencil, Trash2, Phone, Building2,
  Calendar, Clock, FileText, AlertCircle, CircleCheck,
  ChevronDown, ChevronUp, GitCommitHorizontal,
  LayoutDashboard, Users, Timer, Settings, Search,
  TrendingUp, ChevronLeft, Menu, FileSpreadsheet, Download
} from "lucide-react";

/* ══════════════════════ CONSTANTS / HELPERS ══════════════════════ */
const STORAGE_KEY = "olivier_tasks";
const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);
const EMPTY_FORM = { name: "", company: "", contact: "", calledOn: "", date: "", deadlineTime: "", notes: "", status: "Ongoing" };
const EMPTY_FU = { calledOn: "", deadline: "", deadlineTime: "", remark: "" };
const FONT = '"Google Sans","DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const LEAD_STATUSES = ["Ongoing", "Follow-up", "Interested", "Not Interested", "Closed Won", "Closed Lost", "On Hold"];
const STATUS_COLORS = {
  "Ongoing": { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  "Follow-up": { bg: "#F5F3FF", color: "#6D28D9", dot: "#8B5CF6" },
  "Interested": { bg: "#F0FDF4", color: "#166534", dot: "#22C55E" },
  "Not Interested": { bg: "#FEF2F2", color: "#B91C1C", dot: "#EF4444" },
  "Closed Won": { bg: "#F0FDF4", color: "#15803D", dot: "#16A34A" },
  "Closed Lost": { bg: "#FEF2F2", color: "#991B1B", dot: "#DC2626" },
  "On Hold": { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
};

function sendNotif(title, body) {
  if (isElectron) window.electronAPI.sendNotification({ title, body });
  else if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
}

function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function getTodayStr() { return localDateStr(); }

function getDiff(dateStr) {
  if (!dateStr) return 999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00"); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function getMinutesUntil(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return Math.round((new Date(dateStr + "T" + timeStr + ":00") - new Date()) / 60000);
}

function fmt12(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateShort(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* ── Logo SVG ── */
function LogoIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6" /><path d="M8 11h4" />
    </svg>
  );
}

/* ── Badges ── */
const Dot = ({ c }) => <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, flexShrink: 0, display: "inline-block" }} />;
const chip = { display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500, userSelect: "none", letterSpacing: "0.1px" };

function StatusBadge({ diff }) {
  if (diff < 0) return <span style={{ ...chip, background: "#FEF2F2", color: "#B91C1C" }}><Dot c="#EF4444" /> Overdue</span>;
  if (diff === 0) return <span style={{ ...chip, background: "#FFFBEB", color: "#92400E" }}><Dot c="#F59E0B" /> Today</span>;
  if (diff === 1) return <span style={{ ...chip, background: "#F0FDF4", color: "#166534" }}><Dot c="#22C55E" /> Tomorrow</span>;
  if (diff <= 7) return <span style={{ ...chip, background: "#F4F4F5", color: "#52525B" }}><Dot c="#A1A1AA" /> In {diff} days</span>;
  return <span style={{ ...chip, background: "#F4F4F5", color: "#71717A" }}><Dot c="#D4D4D8" /> In {diff} days</span>;
}

function DeadlineBadge({ date, time }) {
  if (!date || !time) return null;
  const diff = getDiff(date);
  const mins = getMinutesUntil(date, time);
  if (mins !== null && mins >= 0 && mins <= 60)
    return <span style={{ ...chip, background: "#FFFBEB", color: "#92400E" }}><Clock size={9} /> {mins === 0 ? "Now" : `${mins}m left`}</span>;
  if (diff === 0)
    return <span style={{ ...chip, background: "#F4F4F5", color: "#3F3F46" }}><Clock size={9} /> {fmt12(time)}</span>;
  return null;
}

function MetaItem({ icon, val }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ color: "#94A3B8", display: "flex" }}>{icon}</span>
      <span style={{ color: "#64748B", fontSize: 12.5, fontWeight: 500 }}>{val}</span>
    </div>
  );
}

/* ══════════════════════ SVG CHART — Leads Over Time ══════════════════════ */
function LeadsChart({ tasks }) {
  const data = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = 14;
    const points = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = localDateStr(d);
      const count = tasks.filter(t => t.createdAt === ds).length;
      const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      points.push({ date: ds, count, label });
    }
    return points;
  }, [tasks]);

  const maxVal = Math.max(5, ...data.map(p => p.count));
  const totalInPeriod = data.reduce((s, p) => s + p.count, 0);
  const avg = (totalInPeriod / data.length).toFixed(2);

  const W = 680, H = 200, PX = 40, PY = 20;
  const iw = W - PX * 2, ih = H - PY * 2;

  const pts = data.map((p, i) => ({
    x: PX + (i / (data.length - 1)) * iw,
    y: PY + ih - (p.count / maxVal) * ih,
    ...p,
  }));

  const pathD = pts.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cx1 = prev.x + (p.x - prev.x) * 0.4;
    const cx2 = p.x - (p.x - prev.x) * 0.4;
    return `C ${cx1} ${prev.y} ${cx2} ${p.y} ${p.x} ${p.y}`;
  }).join(" ");

  const areaD = pathD + ` L ${pts[pts.length - 1].x} ${PY + ih} L ${pts[0].x} ${PY + ih} Z`;

  // Y-axis labels
  const yLabels = [];
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((maxVal / ySteps) * i);
    const y = PY + ih - (val / maxVal) * ih;
    yLabels.push({ val, y });
  }

  return (
    <div className="chart-card" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={16} color="#111827" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Leads Over Time</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>Last 14 days activity</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{totalInPeriod}</span>
            <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 6 }}>Total leads</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: "100%", height: "auto" }}>
        {/* grid lines */}
        {yLabels.map((yl, i) => (
          <g key={i}>
            <line x1={PX} y1={yl.y} x2={W - PX} y2={yl.y} stroke="#F1F5F9" strokeWidth="1" />
            <text x={PX - 8} y={yl.y + 4} textAnchor="end" fontSize="10" fill="#94A3B8" fontFamily={FONT}>{yl.val}</text>
          </g>
        ))}

        {/* area gradient */}
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111827" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#111827" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGrad)" />

        {/* line */}
        <path d={pathD} fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#111827" strokeWidth="2" />
            {/* x labels — show every other one */}
            {i % 2 === 0 && (
              <text x={p.x} y={H + 18} textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily={FONT}>{p.label}</text>
            )}
          </g>
        ))}
      </svg>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#111827", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "#64748B" }}>Daily lead acquisition</span>
        </div>
        <span style={{ fontSize: 12, color: "#64748B" }}>Avg: <strong style={{ color: "#111827" }}>{avg}</strong> leads/day</span>
      </div>
    </div>
  );
}

/* ══════════════════════════ MAIN APP ══════════════════════════ */
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [notifReady, setNotifReady] = useState(isElectron);
  const [firedDeadlines, setFiredDeadlines] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [reminderOpen, setReminderOpen] = useState(null);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [followUpOpen, setFollowUpOpen] = useState(null);
  const [fuForm, setFuForm] = useState(EMPTY_FU);
  const [page, setPage] = useState("overview"); // overview | leads | timeline
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [isWide, setIsWide] = useState(window.innerWidth >= 900);
  const [appVersion, setAppVersion] = useState("");
  const [autoStart, setAutoStart] = useState(true);
  const firedCalls = useRef(new Set());

  /* responsive */
  useEffect(() => {
    const h = () => setIsWide(window.innerWidth >= 900);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  /* close dropdowns on outside click */
  useEffect(() => {
    const h = () => { setReminderOpen(null); setNotifMenuOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  /* load */
  useEffect(() => {
    const loadData = async () => {
      try {
        if (isElectron && window.electronAPI?.storeRead) {
          const d = await window.electronAPI.storeRead();
          if (d) setTasks(JSON.parse(d));
        } else {
          const d = localStorage.getItem(STORAGE_KEY);
          if (d) setTasks(JSON.parse(d));
        }
      } catch (_) {}
      if (isElectron) setNotifReady(true);
      else if ("Notification" in window) setNotifReady(Notification.permission === "granted");
    };
    loadData();
    // Load app version
    if (isElectron && window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => setAppVersion(v)).catch(() => {});
    }
    // Load auto-start setting
    if (isElectron && window.electronAPI?.getAutoStart) {
      window.electronAPI.getAutoStart().then(enabled => setAutoStart(enabled)).catch(() => {});
    }
  }, []);

  const save = (u) => {
    setTasks(u);
    const json = JSON.stringify(u);
    try {
      if (isElectron && window.electronAPI?.storeWrite) {
        window.electronAPI.storeWrite(json);
      } else {
        localStorage.setItem(STORAGE_KEY, json);
      }
    } catch (_) {}
  };

  /* deadline notifs on load */
  useEffect(() => {
    if (!firedDeadlines && tasks.length > 0 && notifReady) {
      setFiredDeadlines(true);
      tasks.forEach(t => {
        const d = getDiff(getActiveDeadline(t));
        const lbl = `${t.name}${t.company ? " @ " + t.company : ""}`;
        if (d === 0) sendNotif("Due TODAY", lbl + " is due today!");
        else if (d === 1) sendNotif("Due Tomorrow", lbl + " is due tomorrow.");
      });
    }
  }, [tasks, notifReady, firedDeadlines]);

  /* poll every 60s for time-based notifs */
  useEffect(() => {
    if (!notifReady) return;
    const check = () => {
      tasks.forEach(t => {
        const dl = getActiveDeadline(t);
        const dlTime = getActiveDeadlineTime(t);
        if (!dl || !dlTime) return;
        const mins = getMinutesUntil(dl, dlTime);
        if (mins === null) return;
        const lbl = `${t.name}${t.company ? " @ " + t.company : ""}`;
        if (mins >= 58 && mins <= 62 && !firedCalls.current.has(`${t.id}-1h`)) {
          firedCalls.current.add(`${t.id}-1h`);
          sendNotif("Call Reminder — 1 Hour", `${lbl} — call scheduled at ${fmt12(dlTime)}`);
        }
        if (mins >= -1 && mins <= 1 && !firedCalls.current.has(`${t.id}-now`)) {
          firedCalls.current.add(`${t.id}-now`);
          sendNotif("Time to Call!", `${lbl} — it's ${fmt12(dlTime)} now!`);
        }
      });
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [tasks, notifReady]);

  const requestPermission = async () => {
    if (isElectron) { setNotifReady(true); sendNotif("Notifications Enabled", "You'll be notified when deadlines are near."); return; }
    if (!("Notification" in window)) return alert("Browser doesn't support notifications.");
    const p = await Notification.requestPermission();
    setNotifReady(p === "granted");
    if (p === "granted") new Notification("Notifications Enabled", { body: "You'll be notified when deadlines are near." });
  };

  const scheduleReminder = (task, mins) => {
    if (!notifReady) { alert("Enable notifications first."); return; }
    setReminderOpen(null);
    const lbl = `${task.name}${task.company ? " @ " + task.company : ""}`;
    if (mins === 0) { sendNotif("Reminder", lbl); return; }
    const tl = mins < 60 ? `${mins} min` : `${mins / 60} hr`;
    sendNotif("Reminder Set", `Reminding about ${task.name} in ${tl}`);
    setTimeout(() => sendNotif("Reminder", lbl), mins * 60000);
  };

  const getActiveDeadline = (t) => {
    if (t.followUps && t.followUps.length > 0) return t.followUps[t.followUps.length - 1].deadline;
    return t.date;
  };
  const getActiveDeadlineTime = (t) => {
    if (t.followUps && t.followUps.length > 0) return t.followUps[t.followUps.length - 1].deadlineTime || "";
    return t.deadlineTime || "";
  };

  /* CRUD */
  const handleSubmit = () => {
    if (!form.name || !form.date) return;
    if (editId !== null) {
      save(tasks.map(t => t.id === editId ? { ...t, name: form.name, company: form.company, contact: form.contact, calledOn: form.calledOn, date: form.date, deadlineTime: form.deadlineTime, notes: form.notes, status: form.status || "Ongoing" } : t));
      setEditId(null);
    } else {
      save([...tasks, { ...form, status: form.status || "Ongoing", id: Date.now(), createdAt: getTodayStr(), followUps: [] }]);
    }
    setForm(EMPTY_FORM); setShowForm(false);
  };

  const deleteTask = (id) => save(tasks.filter(t => t.id !== id));

  const startEdit = (t) => {
    setForm({ name: t.name, company: t.company || "", contact: t.contact || "", calledOn: t.calledOn || "", date: t.date, deadlineTime: t.deadlineTime || "", notes: t.notes || "", status: t.status || "Ongoing" });
    setEditId(t.id); setShowForm(true); setPage("leads");
  };

  const addFollowUp = (taskId) => {
    if (!fuForm.deadline) return;
    save(tasks.map(t => {
      if (t.id !== taskId) return t;
      const fus = [...(t.followUps || [])];
      fus.push({ id: Date.now(), ...fuForm });
      return { ...t, followUps: fus };
    }));
    setFuForm(EMPTY_FU); setFollowUpOpen(null);
  };

  const deleteFollowUp = (taskId, fuId) => {
    save(tasks.map(t => t.id !== taskId ? t : { ...t, followUps: (t.followUps || []).filter(f => f.id !== fuId) }));
  };

  const changeStatus = (taskId, newStatus) => {
    save(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const toggleAutoStart = async (enabled) => {
    if (isElectron && window.electronAPI?.setAutoStart) {
      await window.electronAPI.setAutoStart(enabled);
      setAutoStart(enabled);
    }
  };

  /* filters + search */
  const filtered = tasks.filter(t => {
    const d = getDiff(getActiveDeadline(t));
    if (filter === "urgent") return d >= 0 && d <= 1;
    if (filter === "upcoming") return d > 1 && d <= 7;
    if (filter === "done") return d < 0;
    return true;
  }).filter(t => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (t.name || "").toLowerCase().includes(q) || (t.company || "").toLowerCase().includes(q) || (t.contact || "").toLowerCase().includes(q);
  }).sort((a, b) => new Date(getActiveDeadline(a)) - new Date(getActiveDeadline(b)));

  const urgent = tasks.filter(t => { const d = getDiff(getActiveDeadline(t)); return d >= 0 && d <= 1; }).length;
  const overdue = tasks.filter(t => getDiff(getActiveDeadline(t)) < 0).length;
  const dueToday = tasks.filter(t => getDiff(getActiveDeadline(t)) === 0).length;

  /* timeline builder */
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
    return nodes;
  };

  /* form input helper */
  const inp = (field, placeholder, type = "text", extra = {}) => (
    <input type={type} placeholder={placeholder} value={form[field]}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      className="fi" style={{ width: "100%", marginBottom: 10, ...extra }} />
  );

  /* global timeline page: all tasks, sorted by creation */
  const allTimelineNodes = useMemo(() => {
    const nodes = [];
    tasks.forEach(t => {
      nodes.push({ task: t, type: "created", date: t.createdAt || t.date, label: "Lead Created", detail: t.name + (t.company ? ` @ ${t.company}` : ""), remark: t.notes });
      (t.followUps || []).forEach((fu, i) => {
        nodes.push({ task: t, type: "followup", date: fu.calledOn || fu.deadline, label: `${t.name} — Follow-up #${i + 1}`, detail: fu.deadline ? `Call back: ${fmtDate(fu.deadline)}` : "", remark: fu.remark });
      });
    });
    nodes.sort((a, b) => new Date(b.date + "T00:00:00") - new Date(a.date + "T00:00:00"));
    return nodes;
  }, [tasks]);

  /* sidebar nav items */
  const navItems = [
    { key: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { key: "leads", label: "Leads", icon: <Users size={18} /> },
    { key: "sheet", label: "All Leads Sheet", icon: <FileSpreadsheet size={18} /> },
    { key: "timeline", label: "Timeline", icon: <Timer size={18} /> },
  ];

  /* ═══════════ RENDER ═══════════ */
  return (
    <div style={{ fontFamily: FONT, minHeight: "100vh", background: "#F8FAFC", color: "#111827", display: "flex" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#F8FAFC}
        button{cursor:pointer;font-family:${FONT};user-select:none;-webkit-user-select:none}

        .fi{width:100%;background:#fff;border:1.5px solid #E2E8F0;color:#111827;border-radius:8px;padding:10px 14px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s cubic-bezier(.4,0,.2,1),box-shadow .15s cubic-bezier(.4,0,.2,1)}
        .fi:hover:not(:focus){border-color:#CBD5E1}
        .fi:focus{border-color:#64748B;box-shadow:0 0 0 3px rgba(100,116,139,.12)}
        .fi::placeholder{color:#94A3B8}
        textarea.fi{resize:vertical}
        input[type="time"]::-webkit-calendar-picker-indicator,input[type="date"]::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer}

        .task-card{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:20px 22px;transition:box-shadow .22s cubic-bezier(.4,0,.2,1),border-color .22s cubic-bezier(.4,0,.2,1);cursor:pointer}
        .task-card:hover{box-shadow:0 4px 20px rgba(15,23,42,.08);border-color:#CBD5E1}
        .task-card.expanded{box-shadow:0 4px 20px rgba(15,23,42,.08);border-color:#CBD5E1;cursor:default}

        .icon-btn{background:none;border:1px solid transparent;padding:7px;border-radius:7px;color:#94A3B8;display:flex;align-items:center;justify-content:center;transition:all .13s cubic-bezier(.4,0,.2,1)}
        .icon-btn:hover{background:#F1F5F9;border-color:#E2E8F0;color:#475569}
        .icon-btn:active{transform:scale(.88);background:#E2E8F0}
        .icon-btn.danger:hover{background:#FEF2F2;border-color:#FECACA;color:#DC2626}
        .icon-btn.danger:active{transform:scale(.88);background:#FEE2E2}
        .icon-btn.active{background:#F1F5F9;border-color:#E2E8F0;color:#475569}

        .fl{font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;display:flex;align-items:center;gap:6px}
        .fd{border:none;border-top:1px solid #F1F5F9;margin:18px 0}

        .filter-tab{padding:6px 16px;border-radius:20px;border:1.5px solid transparent;font-size:13px;font-weight:500;background:transparent;color:#64748B;transition:all .15s cubic-bezier(.4,0,.2,1)}
        .filter-tab:hover{background:#F1F5F9;color:#334155}
        .filter-tab:active{transform:scale(.95)}
        .filter-tab.active{background:#111827;color:#fff;border-color:#111827;box-shadow:0 2px 8px rgba(17,24,39,.22)}

        .btn-p{background:#111827;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:7px;transition:all .15s cubic-bezier(.4,0,.2,1);box-shadow:0 1px 3px rgba(0,0,0,.18)}
        .btn-p:hover{background:#1E293B;box-shadow:0 4px 14px rgba(0,0,0,.22);transform:translateY(-1px)}
        .btn-p:active{background:#0F172A;transform:scale(.97);box-shadow:0 1px 2px rgba(0,0,0,.18)}
        .btn-p:disabled{background:#E2E8F0;color:#94A3B8;cursor:not-allowed;box-shadow:none;transform:none}

        .btn-o{background:#fff;color:#475569;border:1.5px solid #E2E8F0;border-radius:7px;padding:7px 14px;font-weight:500;font-size:13px;display:inline-flex;align-items:center;gap:6px;transition:all .13s cubic-bezier(.4,0,.2,1)}
        .btn-o:hover{background:#F8FAFC;border-color:#CBD5E1;color:#1E293B;box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .btn-o:active{transform:scale(.97);background:#F1F5F9;box-shadow:none}

        .stat-card{background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:18px 22px;flex:1;min-width:120px;transition:box-shadow .18s cubic-bezier(.4,0,.2,1)}
        .stat-card:hover{box-shadow:0 4px 14px rgba(15,23,42,.06)}

        .dropdown-menu{background:#fff;border:1px solid #E2E8F0;border-radius:10px;box-shadow:0 8px 28px rgba(15,23,42,.12),0 2px 6px rgba(15,23,42,.05);z-index:200;min-width:185px;padding:5px}
        .dropdown-item{width:100%;text-align:left;padding:8px 12px;border:none;background:none;border-radius:6px;font-size:13px;color:#374151;cursor:pointer;display:flex;align-items:center;gap:8px;font-family:inherit;transition:all .1s}
        .dropdown-item:hover{background:#F1F5F9;color:#111827}
        .dropdown-item:active{background:#E2E8F0;transform:scale(.98)}
        .dropdown-item.bold{font-weight:600;color:#111827}
        .dropdown-divider{border:none;border-top:1px solid #F1F5F9;margin:4px 0}
        .dropdown-label{font-size:10px;font-weight:700;color:#94A3B8;padding:6px 12px 2px;text-transform:uppercase;letter-spacing:.6px;display:block}

        .tl-wrap{position:relative;padding-left:28px}
        .tl-line{position:absolute;left:7px;top:0;bottom:0;width:2px;background:#E2E8F0}
        .tl-node{position:relative;padding-bottom:22px}
        .tl-node:last-child{padding-bottom:0}
        .tl-dot{position:absolute;left:-28px;top:1px;width:16px;height:16px;border-radius:50%;border:2px solid #CBD5E1;background:#fff;display:flex;align-items:center;justify-content:center;z-index:1}
        .tl-dot.first{border-color:#111827;background:#111827}
        .tl-dot.missed{border-color:#EF4444;background:#FEE2E2}

        /* ── Sidebar ── */
        .sidebar{background:#fff;border-right:1px solid #E2E8F0;display:flex;flex-direction:column;height:100vh;position:sticky;top:0;transition:width .2s cubic-bezier(.4,0,.2,1);overflow:hidden;flex-shrink:0}
        .sidebar.open{width:220px}
        .sidebar.closed{width:0;border-right:none}
        .nav-item{display:flex;align-items:center;gap:10px;padding:9px 16px;border-radius:8px;font-size:14px;font-weight:500;color:#64748B;border:none;background:none;width:100%;text-align:left;transition:all .12s cubic-bezier(.4,0,.2,1);white-space:nowrap}
        .nav-item:hover{background:#F1F5F9;color:#334155}
        .nav-item:active{transform:scale(.97);background:#E2E8F0}
        .nav-item.active{background:#EFF6FF;color:#111827;font-weight:600}
        .nav-section{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.8px;padding:20px 16px 6px;white-space:nowrap}

        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .anim{animation:slideDown .18s cubic-bezier(.4,0,.2,1)}
        .fade-in{animation:fadeIn .2s ease}

        table tr:hover td{background:inherit}

        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#94A3B8}
      `}</style>

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside className={`sidebar ${sidebarOpen && isWide ? "open" : "closed"}`}>
        {sidebarOpen && isWide && (
          <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", height: "100%" }}>
            {/* brand */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, background: "#111827", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <LogoIcon size={18} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" }}>Olivier</span>
              </div>
              <button className="icon-btn" onClick={() => setSidebarOpen(false)} style={{ padding: 4 }}>
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* nav */}
            <div style={{ flex: 1 }}>
              <div className="nav-section">General</div>
              {navItems.map(n => (
                <button key={n.key} className={`nav-item${page === n.key ? " active" : ""}`}
                  onClick={() => setPage(n.key)}>
                  {n.icon} {n.label}
                </button>
              ))}

              <div className="nav-section" style={{ marginTop: 8 }}>Notifications</div>
              <button className={`nav-item${page === "notif" ? " active" : ""}`}
                onClick={() => setPage("notif")}>
                <Bell size={18} /> Reminders
              </button>
            </div>

            {/* settings footer */}
            <div style={{ borderTop: "1px solid #F1F5F9", padding: "12px 0" }}>
              <div className="nav-section" style={{ padding: "0 16px 6px" }}>Settings</div>
              <button className="nav-item" onClick={e => { e.stopPropagation(); setNotifMenuOpen(v => !v); }} style={{ position: "relative" }}>
                <Settings size={18} /> Settings
                {!notifReady && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444", marginLeft: "auto" }} />}
              </button>
              {notifMenuOpen && (
                <div className="dropdown-menu anim" style={{ position: "absolute", bottom: 60, left: 16, width: 210 }} onClick={e => e.stopPropagation()}>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #F1F5F9", marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Settings</p>
                  </div>
                  <div style={{ padding: "6px 12px", marginBottom: 4 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Notifications</p>
                    <p style={{ fontSize: 11, color: notifReady ? "#15803D" : "#94A3B8", fontWeight: 500 }}>
                      {notifReady ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  {notifReady ? (
                    <button className="dropdown-item" onClick={() => { setNotifReady(false); setNotifMenuOpen(false); }}>
                      <BellOff size={13} /> Turn Off Notifications
                    </button>
                  ) : (
                    <button className="dropdown-item bold" onClick={() => { requestPermission(); setNotifMenuOpen(false); }}>
                      <Bell size={13} /> Enable Notifications
                    </button>
                  )}
                  <hr className="dropdown-divider" />
                  {isElectron && (
                    <>
                      <div style={{ padding: "6px 12px", marginBottom: 4 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Start on Boot</p>
                        <p style={{ fontSize: 11, color: autoStart ? "#15803D" : "#94A3B8", fontWeight: 500 }}>
                          {autoStart ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                      {autoStart ? (
                        <button className="dropdown-item" onClick={() => { toggleAutoStart(false); setNotifMenuOpen(false); }}>
                          <X size={13} /> Disable Auto-Start
                        </button>
                      ) : (
                        <button className="dropdown-item bold" onClick={() => { toggleAutoStart(true); setNotifMenuOpen(false); }}>
                          <CircleCheck size={13} /> Enable Auto-Start
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* version */}
            {appVersion && (
              <div style={{ padding: "0 16px 12px", fontSize: 11, color: "#94A3B8" }}>
                v{appVersion}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main style={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto" }}>
        {/* ── Top bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #E2E8F0", background: "#fff", position: "sticky", top: 0, zIndex: 100, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(!sidebarOpen || !isWide) && (
              <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="Open sidebar">
                <Menu size={18} />
              </button>
            )}
            {/* search */}
            <div style={{ position: "relative", minWidth: 200, maxWidth: 320 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search..." className="fi"
                style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 13, borderColor: "#E2E8F0", background: "#F8FAFC" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* notification bell — only show red dot when not ready */}
            <button className="icon-btn" title="Notifications" onClick={e => { e.stopPropagation(); setNotifMenuOpen(v => !v); }}
              style={{ position: "relative" }}>
              <Bell size={18} />
              {!notifReady && <span style={{ position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: "50%", background: "#EF4444" }} />}
            </button>
            {notifMenuOpen && !sidebarOpen && (
              <div className="dropdown-menu anim" style={{ position: "absolute", right: 28, top: 56 }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "8px 12px", borderBottom: "1px solid #F1F5F9", marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Notifications</p>
                  <p style={{ fontSize: 11, color: notifReady ? "#15803D" : "#94A3B8", marginTop: 2, fontWeight: 500 }}>
                    {notifReady ? "Enabled" : "Disabled"}
                  </p>
                </div>
                {notifReady ? (
                  <button className="dropdown-item" onClick={() => { setNotifReady(false); setNotifMenuOpen(false); }}>
                    <BellOff size={13} /> Turn Off
                  </button>
                ) : (
                  <button className="dropdown-item bold" onClick={() => { requestPermission(); setNotifMenuOpen(false); }}>
                    <Bell size={13} /> Enable
                  </button>
                )}
              </div>
            )}
            {/* Add Lead button */}
            <button className="btn-p" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); setPage("leads"); }}
              style={{ padding: "8px 16px", fontSize: 13 }}>
              {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add New Lead</>}
            </button>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {/* ══════════ PAGE: OVERVIEW ══════════ */}
          {page === "overview" && (
            <div className="fade-in">
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 2 }}>Dashboard</h2>
              <p style={{ color: "#94A3B8", fontSize: 13, marginBottom: 24 }}>Lead with Decision</p>

              {/* blocked */}
              {!isElectron && !notifReady && typeof Notification !== "undefined" && Notification.permission === "denied" && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#DC2626", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={15} /> Notifications blocked — allow in browser settings.
                </div>
              )}

              {/* stat cards with colored left borders */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <div className="stat-card" style={{ borderLeft: "3px solid #111827" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Users size={15} color="#64748B" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>Total Leads</span>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>{tasks.length}</div>
                </div>
                <div className="stat-card" style={{ borderLeft: "3px solid #F59E0B" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Bell size={15} color="#F59E0B" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>Due Today</span>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>{dueToday}</div>
                </div>
                <div className="stat-card" style={{ borderLeft: "3px solid #EF4444" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <AlertCircle size={15} color="#EF4444" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>Overdue</span>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>{overdue}</div>
                </div>
              </div>

              {/* Leads Over Time chart — only when wide */}
              {isWide && tasks.length > 0 && <LeadsChart tasks={tasks} />}

              {/* Quick list: urgent leads */}
              {urgent > 0 && (
                <div style={{ marginTop: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}><AlertCircle size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} color="#EF4444" />Urgent Leads</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tasks.filter(t => { const d = getDiff(getActiveDeadline(t)); return d >= 0 && d <= 1; })
                      .sort((a, b) => new Date(getActiveDeadline(a)) - new Date(getActiveDeadline(b)))
                      .map(t => {
                        const activeDl = getActiveDeadline(t);
                        const diff = getDiff(activeDl);
                        return (
                          <div key={t.id} className="task-card" onClick={() => { setPage("leads"); setExpandedCard(t.id); }}
                            style={{ padding: "14px 18px", borderLeft: `3px solid ${diff === 0 ? "#F59E0B" : "#10B981"}` }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{t.name}</span>
                                {t.company && <span style={{ fontSize: 12, color: "#94A3B8" }}>@ {t.company}</span>}
                                <StatusBadge diff={diff} />
                              </div>
                              <span style={{ fontSize: 12, color: "#64748B" }}>{fmtDate(activeDl)}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {tasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ width: 56, height: 56, background: "#F1F5F9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <FileText size={24} color="#CBD5E1" />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>No leads yet</p>
                  <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 5 }}>Click "Add New Lead" to get started</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════ PAGE: LEADS ══════════ */}
          {page === "leads" && (
            <div className="fade-in">
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Leads</h2>

              {/* Add/Edit form */}
              {showForm && (
                <div className="anim" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 4px 20px rgba(15,23,42,.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    {editId ? <Pencil size={15} color="#64748B" /> : <Plus size={15} color="#64748B" />}
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{editId ? "Edit Lead" : "New Lead"}</h3>
                  </div>

                  <div className="fl"><FileText size={11} /> Lead Info</div>
                  {inp("name", "Full Name *")}
                  {inp("company", "Company")}
                  {inp("contact", "Phone / Email")}

                  <hr className="fd" />

                  <div className="fl"><Phone size={11} /> Called On</div>
                  <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8, marginTop: -4 }}>When did you call this lead?</p>
                  {inp("calledOn", "", "date")}

                  <hr className="fd" />

                  <div className="fl"><Calendar size={11} /> Call Back By <span style={{ color: "#EF4444" }}>*</span></div>
                  <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8, marginTop: -4 }}>
                    Schedule when to call. Notifies <strong style={{ color: "#374151", fontWeight: 600 }}>1 hour before</strong> + <strong style={{ color: "#374151", fontWeight: 600 }}>at call time</strong>.
                  </p>
                  <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: "#94A3B8", display: "block", marginBottom: 5, fontWeight: 500 }}>Call Date</span>
                      {inp("date", "", "date", { marginBottom: 0 })}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: "#94A3B8", display: "block", marginBottom: 5, fontWeight: 500 }}>Call Time (optional)</span>
                      <input type="time" value={form.deadlineTime} onChange={e => setForm(f => ({ ...f, deadlineTime: e.target.value }))} className="fi" />
                    </div>
                  </div>

                  <hr className="fd" />

                  <div className="fl"><CircleCheck size={11} /> Lead Status</div>
                  <select value={form.status || "Ongoing"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="fi" style={{ marginBottom: 10, cursor: "pointer" }}>
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <hr className="fd" />

                  <div className="fl"><FileText size={11} /> Notes</div>
                  <textarea placeholder="Add notes or remarks..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="fi" style={{ marginBottom: 16 }} />

                  <button className="btn-p" onClick={handleSubmit} disabled={!form.name || !form.date}
                    style={{ width: "100%", justifyContent: "center", padding: "11px 20px", fontSize: 14 }}>
                    <CircleCheck size={15} /> {editId ? "Update Lead" : "Save Lead"}
                  </button>
                </div>
              )}

              {/* Filter tabs */}
              {tasks.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                  {[
                    { key: "all", label: "All", count: tasks.length },
                    { key: "urgent", label: "Urgent", count: urgent },
                    { key: "upcoming", label: "This Week" },
                    { key: "done", label: "Overdue", count: overdue },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setFilter(tab.key)}
                      className={`filter-tab${filter === tab.key ? " active" : ""}`}>
                      {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ""}
                    </button>
                  ))}
                </div>
              )}

              {/* Empty */}
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ width: 56, height: 56, background: "#F1F5F9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <FileText size={24} color="#CBD5E1" />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>{tasks.length === 0 ? "No leads yet" : "Nothing in this filter"}</p>
                  <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 5 }}>{tasks.length === 0 ? 'Click "Add New Lead" to get started' : "Try a different filter"}</p>
                </div>
              )}

              {/* Lead cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map(t => {
                  const activeDl = getActiveDeadline(t);
                  const activeDlTime = getActiveDeadlineTime(t);
                  const diff = getDiff(activeDl);
                  const accent = diff < 0 ? "#EF4444" : diff === 0 ? "#F59E0B" : diff === 1 ? "#10B981" : "#E2E8F0";
                  const isExpanded = expandedCard === t.id;
                  const tl = buildTimeline(t);
                  const isFuOpen = followUpOpen === t.id;
                  const fuCount = (t.followUps || []).length;

                  return (
                    <div key={t.id} className={`task-card${isExpanded ? " expanded" : ""}`}
                      style={{ borderLeft: `3px solid ${accent}` }}
                      onClick={() => { if (!isExpanded) setExpandedCard(t.id); }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Name + Badges */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{t.name}</span>
                            <StatusBadge diff={diff} />
                            <DeadlineBadge date={activeDl} time={activeDlTime} />
                            {fuCount > 0 && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }}>
                                {fuCount} follow-up{fuCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Meta */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                            {t.company && <MetaItem icon={<Building2 size={12} />} val={t.company} />}
                            {t.contact && <MetaItem icon={<Phone size={12} />} val={t.contact} />}
                            {t.calledOn && <MetaItem icon={<Phone size={12} />} val={"Called: " + fmtDate(t.calledOn)} />}
                            <MetaItem icon={<Calendar size={12} />} val={"Call back: " + fmtDate(activeDl) + (activeDlTime ? " at " + fmt12(activeDlTime) : "")} />
                          </div>

                          {/* Notes */}
                          {t.notes && (
                            <div style={{ marginTop: 10, fontSize: 12, color: "#64748B", background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "flex-start", gap: 6 }}>
                              <FileText size={11} style={{ marginTop: 1, flexShrink: 0 }} color="#94A3B8" />
                              <span>{t.notes}</span>
                            </div>
                          )}

                          {/* ─── EXPANDED SECTION (Timeline + Follow-up) ─── */}
                          {isExpanded && (
                            <div className="anim" onClick={e => e.stopPropagation()}>
                              {/* Action bar */}
                              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                                <button className="btn-o" onClick={() => { setFollowUpOpen(isFuOpen ? null : t.id); setFuForm(EMPTY_FU); }} style={{ fontSize: 12, padding: "5px 10px" }}>
                                  <Plus size={12} /> Add Follow-up
                                </button>
                                <button className="btn-o" onClick={() => setExpandedCard(null)} style={{ fontSize: 12, padding: "5px 10px" }}>
                                  <ChevronUp size={12} /> Collapse
                                </button>
                              </div>

                              {/* Follow-up form */}
                              {isFuOpen && (
                                <div className="anim" style={{ marginTop: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12 }}>New Follow-up</p>
                                  <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                                    <div style={{ flex: "1 1 120px" }}>
                                      <span style={{ fontSize: 11, color: "#94A3B8", display: "block", marginBottom: 4, fontWeight: 500 }}>Called On</span>
                                      <input type="date" value={fuForm.calledOn} onChange={e => setFuForm(f => ({ ...f, calledOn: e.target.value }))} className="fi" style={{ marginBottom: 0 }} />
                                    </div>
                                    <div style={{ flex: "1 1 120px" }}>
                                      <span style={{ fontSize: 11, color: "#94A3B8", display: "block", marginBottom: 4, fontWeight: 500 }}>Call Back Date *</span>
                                      <input type="date" value={fuForm.deadline} onChange={e => setFuForm(f => ({ ...f, deadline: e.target.value }))} className="fi" style={{ marginBottom: 0 }} />
                                    </div>
                                    <div style={{ flex: "1 1 120px" }}>
                                      <span style={{ fontSize: 11, color: "#94A3B8", display: "block", marginBottom: 4, fontWeight: 500 }}>Call Back Time</span>
                                      <input type="time" value={fuForm.deadlineTime} onChange={e => setFuForm(f => ({ ...f, deadlineTime: e.target.value }))} className="fi" style={{ marginBottom: 0 }} />
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 11, color: "#94A3B8", display: "block", marginBottom: 4, fontWeight: 500 }}>Remark</span>
                                  <textarea placeholder="What happened on this call?" value={fuForm.remark} onChange={e => setFuForm(f => ({ ...f, remark: e.target.value }))} rows={2} className="fi" style={{ marginBottom: 10 }} />
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button className="btn-p" onClick={() => addFollowUp(t.id)} disabled={!fuForm.deadline} style={{ padding: "7px 14px", fontSize: 13 }}>
                                      <CircleCheck size={13} /> Save Follow-up
                                    </button>
                                    <button className="btn-o" onClick={() => setFollowUpOpen(null)} style={{ padding: "7px 14px", fontSize: 13 }}>Cancel</button>
                                  </div>
                                </div>
                              )}

                              {/* Timeline */}
                              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                                  <GitCommitHorizontal size={14} color="#64748B" />
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Timeline</span>
                                </div>
                                <div className="tl-wrap">
                                  <div className="tl-line" />
                                  {tl.map((n, i) => (
                                    <div key={i} className="tl-node">
                                      <div className={`tl-dot${n.type === "created" ? " first" : ""}${n.missed ? " missed" : ""}`}>
                                        {n.type === "created" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                                        {n.missed && <AlertCircle size={8} color="#EF4444" />}
                                      </div>
                                      <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{n.label}</span>
                                          {n.missed && (
                                            <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444", background: "#FEE2E2", padding: "1px 6px", borderRadius: 3, border: "1px solid #FECACA" }}>
                                              MISSED DEADLINE
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, display: "flex", flexWrap: "wrap", gap: 12 }}>
                                          {n.calledOn && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={10} /> Called: {fmtDateShort(n.calledOn)}</span>}
                                          {n.deadline && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={10} /> Call back: {fmtDateShort(n.deadline)}{n.deadlineTime ? " at " + fmt12(n.deadlineTime) : ""}</span>}
                                        </div>
                                        {n.remark && <div style={{ marginTop: 4, fontSize: 12, color: "#64748B", fontStyle: "italic" }}>"{n.remark}"</div>}
                                        {n.type === "followup" && (
                                          <button onClick={() => deleteFollowUp(t.id, n.fuId)}
                                            style={{ marginTop: 4, background: "none", border: "none", color: "#CBD5E1", fontSize: 11, display: "flex", alignItems: "center", gap: 3, padding: 0, cursor: "pointer" }}
                                            onMouseEnter={e => { e.currentTarget.style.color = "#EF4444"; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = "#CBD5E1"; }}>
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

                        {/* Card actions */}
                        <div style={{ display: "flex", gap: 4, flexShrink: 0, position: "relative", alignItems: "center" }} onClick={e => e.stopPropagation()}>
                          {/* Status dropdown */}
                          <select value={t.status || "Ongoing"} onChange={e => changeStatus(t.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 8, border: `1.5px solid ${(STATUS_COLORS[t.status || "Ongoing"] || STATUS_COLORS["Ongoing"]).bg}`, background: (STATUS_COLORS[t.status || "Ongoing"] || STATUS_COLORS["Ongoing"]).bg, color: (STATUS_COLORS[t.status || "Ongoing"] || STATUS_COLORS["Ongoing"]).color, cursor: "pointer", outline: "none", fontFamily: FONT, appearance: "auto" }}>
                            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button className={`icon-btn${reminderOpen === t.id ? " active" : ""}`} title="Schedule reminder"
                            onClick={e => { e.stopPropagation(); setReminderOpen(reminderOpen === t.id ? null : t.id); }}>
                            <Bell size={14} />
                          </button>
                          {reminderOpen === t.id && (
                            <div className="dropdown-menu anim" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)" }} onClick={e => e.stopPropagation()}>
                              <button className="dropdown-item bold" onClick={() => scheduleReminder(t, 0)}>
                                <Bell size={13} /> Remind Now
                              </button>
                              <hr className="dropdown-divider" />
                              <p className="dropdown-label">Schedule Reminder</p>
                              {[{ l: "In 15 min", v: 15 }, { l: "In 30 min", v: 30 }, { l: "In 1 hour", v: 60 }, { l: "In 2 hours", v: 120 }].map(o => (
                                <button key={o.v} className="dropdown-item" onClick={() => scheduleReminder(t, o.v)}>
                                  <Clock size={13} /> {o.l}
                                </button>
                              ))}
                            </div>
                          )}
                          <button className="icon-btn" title="Edit" onClick={() => startEdit(t)}><Pencil size={14} /></button>
                          <button className="icon-btn danger" title="Delete" onClick={() => deleteTask(t.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {tasks.length > 0 && (
                <p style={{ textAlign: "center", color: "#CBD5E1", fontSize: 11, marginTop: 28, letterSpacing: "0.2px" }}>
                  Data saved automatically — {isElectron ? "minimizes to system tray when closed" : "open this page to get notified"}
                </p>
              )}
            </div>
          )}

          {/* ══════════ PAGE: ALL LEADS SHEET ══════════ */}
          {page === "sheet" && (() => {
            /* Build flat rows: one per lead + one per follow-up */
            const rows = [];
            let sno = 0;
            tasks.forEach(t => {
              sno++;
              const leadStatus = t.status || "Ongoing";
              rows.push({ sno, name: t.name, company: t.company || "", contact: t.contact || "", calledOn: t.calledOn || "", callBackDate: t.date, callBackTime: t.deadlineTime || "", notes: t.notes || "", type: "Lead", status: leadStatus, fuNum: "", fuRemark: "", taskId: t.id });
              (t.followUps || []).forEach((fu, i) => {
                rows.push({ sno: "", name: "", company: "", contact: "", calledOn: fu.calledOn || "", callBackDate: fu.deadline || "", callBackTime: fu.deadlineTime || "", notes: "", type: `Follow-up #${i + 1}`, status: leadStatus, fuNum: i + 1, fuRemark: fu.remark || "", taskId: t.id });
              });
            });

            const exportCSV = () => {
              const headers = ["S.No", "Type", "Name", "Company", "Contact", "Called On", "Call Back Date", "Call Back Time", "Status", "Notes / Remark"];
              const csvRows = [headers.join(",")];
              rows.forEach(r => {
                const vals = [
                  r.sno, r.type, r.name, r.company, r.contact,
                  r.calledOn ? fmtDate(r.calledOn) : "",
                  r.callBackDate ? fmtDate(r.callBackDate) : "",
                  r.callBackTime ? fmt12(r.callBackTime) : "",
                  r.status,
                  (r.notes || r.fuRemark || "").replace(/"/g, '""')
                ].map(v => `"${v}"`);
                csvRows.push(vals.join(","));
              });
              const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `Olivier_Leads_${getTodayStr()}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            };

            return (
              <div className="fade-in">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 2 }}>All Leads Sheet</h2>
                    <p style={{ color: "#94A3B8", fontSize: 13 }}>Combined view of all leads &amp; follow-ups — {tasks.length} lead{tasks.length !== 1 ? "s" : ""}, {rows.length} row{rows.length !== 1 ? "s" : ""}</p>
                  </div>
                  {rows.length > 0 && (
                    <button className="btn-p" onClick={exportCSV} style={{ padding: "9px 18px", fontSize: 13 }}>
                      <Download size={14} /> Export CSV
                    </button>
                  )}
                </div>

                {rows.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ width: 56, height: 56, background: "#F1F5F9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <FileSpreadsheet size={24} color="#CBD5E1" />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>No leads yet</p>
                    <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 5 }}>Add leads to see them in the sheet</p>
                  </div>
                ) : (
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: FONT }}>
                        <thead>
                          <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                            {["#", "Type", "Name", "Company", "Contact", "Called On", "Call Back", "Time", "Status", "Notes / Remark"].map((h, i) => (
                              <th key={i} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", borderBottom: "2px solid #E2E8F0" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, idx) => {
                            const isLead = r.type === "Lead";
                            const bgColor = isLead ? "#fff" : "#FAFBFC";
                            const sc = STATUS_COLORS[r.status] || STATUS_COLORS["Ongoing"];
                            const statusColor = sc.color;
                            const statusBg = sc.bg;
                            return (
                              <tr key={idx} style={{ background: bgColor, borderBottom: "1px solid #F1F5F9", cursor: isLead ? "pointer" : "default" }}
                                onClick={() => { if (isLead) { setExpandedCard(r.taskId); setPage("leads"); } }}
                                onMouseEnter={e => { if (isLead) e.currentTarget.style.background = "#F8FAFC"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = bgColor; }}>
                                <td style={{ padding: "10px 14px", color: "#94A3B8", fontWeight: 600, fontSize: 12 }}>{r.sno}</td>
                                <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: isLead ? "#EFF6FF" : "#F5F3FF", color: isLead ? "#1D4ED8" : "#6D28D9", border: `1px solid ${isLead ? "#BFDBFE" : "#DDD6FE"}` }}>
                                    {r.type}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 14px", fontWeight: isLead ? 600 : 400, color: isLead ? "#111827" : "#94A3B8" }}>{r.name || "—"}</td>
                                <td style={{ padding: "10px 14px", color: "#64748B" }}>{r.company || (isLead ? "—" : "")}</td>
                                <td style={{ padding: "10px 14px", color: "#64748B" }}>{r.contact || (isLead ? "—" : "")}</td>
                                <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{r.calledOn ? fmtDate(r.calledOn) : "—"}</td>
                                <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{r.callBackDate ? fmtDate(r.callBackDate) : "—"}</td>
                                <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{r.callBackTime ? fmt12(r.callBackTime) : "—"}</td>
                                <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: statusBg, color: statusColor }}>{r.status}</span>
                                </td>
                                <td style={{ padding: "10px 14px", color: "#64748B", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes || r.fuRemark || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Footer summary */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>
                        {tasks.length} lead{tasks.length !== 1 ? "s" : ""} · {tasks.reduce((s, t) => s + (t.followUps || []).length, 0)} follow-up{tasks.reduce((s, t) => s + (t.followUps || []).length, 0) !== 1 ? "s" : ""}
                      </span>
                      <button className="btn-o" onClick={exportCSV} style={{ padding: "5px 12px", fontSize: 12 }}>
                        <Download size={12} /> Download CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══════════ PAGE: TIMELINE ══════════ */}
          {page === "timeline" && (
            <div className="fade-in">
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Timeline</h2>
              <p style={{ color: "#94A3B8", fontSize: 13, marginBottom: 24 }}>Activity across all leads</p>

              {allTimelineNodes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ width: 56, height: 56, background: "#F1F5F9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Timer size={24} color="#CBD5E1" />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>No activity yet</p>
                  <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 5 }}>Add leads to see the timeline here</p>
                </div>
              ) : (
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
                  <div className="tl-wrap">
                    <div className="tl-line" />
                    {allTimelineNodes.map((n, i) => (
                      <div key={i} className="tl-node">
                        <div className={`tl-dot${n.type === "created" ? " first" : ""}`}>
                          {n.type === "created" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{n.label}</span>
                            <span style={{ fontSize: 11, color: "#94A3B8" }}>{fmtDate(n.date)}</span>
                          </div>
                          {n.detail && <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{n.detail}</div>}
                          {n.remark && <div style={{ marginTop: 4, fontSize: 12, color: "#64748B", fontStyle: "italic" }}>"{n.remark}"</div>}
                          <button onClick={() => { setExpandedCard(n.task.id); setPage("leads"); }}
                            style={{ marginTop: 4, background: "none", border: "none", color: "#94A3B8", fontSize: 11, display: "flex", alignItems: "center", gap: 3, padding: 0, cursor: "pointer" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#111827"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#94A3B8"; }}>
                            View Lead →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ PAGE: NOTIFICATIONS ══════════ */}
          {page === "notif" && (
            <div className="fade-in">
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Reminders</h2>
              <p style={{ color: "#94A3B8", fontSize: 13, marginBottom: 24 }}>Set quick reminders for your leads</p>

              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  {notifReady ? <Bell size={20} color="#22C55E" /> : <BellOff size={20} color="#EF4444" />}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                      Notifications are {notifReady ? "enabled" : "disabled"}
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                      {notifReady
                        ? "You'll receive alerts for deadlines and scheduled reminders."
                        : "Enable to get notified about upcoming deadlines."}
                    </div>
                  </div>
                </div>
                {!notifReady && (
                  <button className="btn-p" onClick={requestPermission} style={{ fontSize: 13, padding: "9px 18px" }}>
                    <Bell size={14} /> Enable Notifications
                  </button>
                )}
                {notifReady && (
                  <button className="btn-o" onClick={() => setNotifReady(false)} style={{ fontSize: 13, padding: "9px 18px" }}>
                    <BellOff size={14} /> Turn Off Notifications
                  </button>
                )}
              </div>

              {/* Quick reminders for leads */}
              {tasks.length > 0 && notifReady && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Quick Remind</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tasks.slice(0, 10).map(t => (
                      <div key={t.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{t.name}</span>
                          {t.company && <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 6 }}>@ {t.company}</span>}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[{ l: "Now", v: 0 }, { l: "15m", v: 15 }, { l: "1h", v: 60 }].map(o => (
                            <button key={o.v} className="btn-o" onClick={() => scheduleReminder(t, o.v)} style={{ padding: "4px 10px", fontSize: 11 }}>
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
