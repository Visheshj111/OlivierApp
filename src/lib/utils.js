/* ═══════════════════════════════════════════════════════════════
   OLIVIER — Utility Functions & Constants
   ═══════════════════════════════════════════════════════════════ */

export const FONT = '"Inter","DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
export const STORAGE_KEY = "olivier_tasks";
export const TEMPLATES_KEY = "olivier_templates";
export const SETTINGS_KEY = "olivier_settings";
export const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

/* ── Pipeline & Statuses ── */
export const PIPELINE_STAGES = ["New", "Contacted", "Qualified", "Proposal Sent", "In Discussion"];
export const CLOSED_STAGES = ["Converted", "Not Converted", "Closed"];
export const ALL_STATUSES = [...PIPELINE_STAGES, ...CLOSED_STAGES, "On Hold"];

/* ── Custom statuses stored in settings ── */
export const CUSTOM_STATUSES_KEY = "olivier_custom_statuses";
export function getCustomStatuses() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_STATUSES_KEY) || "[]"); } catch (_) { return []; }
}
export function saveCustomStatuses(list) {
  localStorage.setItem(CUSTOM_STATUSES_KEY, JSON.stringify(list));
}
export function getAllStatuses() {
  return [...ALL_STATUSES, ...getCustomStatuses()];
}

export const STATUS_COLORS = {
  "New":              { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6", ring: "#BFDBFE" },
  "Contacted":        { bg: "#F0FDF4", color: "#166534", dot: "#22C55E", ring: "#BBF7D0" },
  "Qualified":        { bg: "#FFF7ED", color: "#9A3412", dot: "#F97316", ring: "#FED7AA" },
  "Proposal Sent":    { bg: "#F5F3FF", color: "#6D28D9", dot: "#8B5CF6", ring: "#DDD6FE" },
  "In Discussion":    { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B", ring: "#FDE68A" },
  "Converted":        { bg: "#F0FDF4", color: "#15803D", dot: "#16A34A", ring: "#BBF7D0" },
  "Not Converted":    { bg: "#FEF2F2", color: "#991B1B", dot: "#DC2626", ring: "#FECACA" },
  "Closed":           { bg: "#F4F4F5", color: "#52525B", dot: "#71717A", ring: "#D4D4D8" },
  "On Hold":          { bg: "#F4F4F5", color: "#52525B", dot: "#A1A1AA", ring: "#D4D4D8" },
  // Backward compat — old status names
  "Placed":           { bg: "#F0FDF4", color: "#15803D", dot: "#16A34A", ring: "#BBF7D0" },
  "Not Placed":       { bg: "#FEF2F2", color: "#991B1B", dot: "#DC2626", ring: "#FECACA" },
  "Ongoing":          { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6", ring: "#BFDBFE" },
  "Follow-up":        { bg: "#F5F3FF", color: "#6D28D9", dot: "#8B5CF6", ring: "#DDD6FE" },
  "Interested":       { bg: "#F0FDF4", color: "#166534", dot: "#22C55E", ring: "#BBF7D0" },
  "Not Interested":   { bg: "#FEF2F2", color: "#B91C1C", dot: "#EF4444", ring: "#FECACA" },
  "Closed Won":       { bg: "#F0FDF4", color: "#15803D", dot: "#16A34A", ring: "#BBF7D0" },
  "Closed Lost":      { bg: "#FEF2F2", color: "#991B1B", dot: "#DC2626", ring: "#FECACA" },
  "Negotiation":      { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B", ring: "#FDE68A" },
  "Proposal":         { bg: "#F5F3FF", color: "#6D28D9", dot: "#8B5CF6", ring: "#DDD6FE" },
};

/* ── Tailwind classes for dark-mode-aware status chips ── */
export const STATUS_TW = {
  "New":            "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "Contacted":      "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  "Qualified":      "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  "Proposal Sent":  "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  "In Discussion":  "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Converted":      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Not Converted":  "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  "Closed":         "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  "On Hold":        "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  // Backward compat
  "Placed":         "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Not Placed":     "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  "Closed Won":     "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Closed Lost":    "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

/* ── Sources ── */
export const LEAD_SOURCES = [
  "LinkedIn", "Pod.ai", "Cold Call", "Email Outreach", "Referral",
  "Job Portal", "Campus Connect", "WhatsApp", "Walk-in", "Other"
];

export const SOURCE_COLORS = {
  "LinkedIn":        "#0A66C2",
  "Pod.ai":          "#8B5CF6",
  "Cold Call":       "#F59E0B",
  "Email Outreach":  "#06B6D4",
  "Referral":        "#22C55E",
  "Job Portal":      "#F97316",
  "Campus Connect":  "#EC4899",
  "WhatsApp":        "#25D366",
  "Walk-in":         "#6366F1",
  "Other":           "#94A3B8",
};

/* ── Opportunity Types ── */
export const OPPORTUNITY_TYPES = ["Internship", "Full Time", "Intern + Full Time", "Contract", "Apprenticeship"];

/* ── Courses ── */
export const COURSES = [
  "BCA", "BSc CS", "BBA-CA", "BSc Cyber Security", "MCA", "MSc CS",
  "MBA", "BBA", "BCom", "B.Tech", "M.Tech", "Other"
];

/* ── Empty Forms ── */
export const EMPTY_FORM = {
  name: "", company: "", contact: "", email: "",
  calledOn: "", date: "", deadlineTime: "", notes: "",
  status: "New", source: "", tags: [],
  ctc: "", stipend: "", linkedIn: "",
  opportunityType: "", courses: [], role: ""
};
export const EMPTY_FU = { calledOn: "", deadline: "", deadlineTime: "", remark: "", closed: false };

/* ── Default Templates ── */
export const DEFAULT_TEMPLATES = [
  { id: 1, category: "Email", name: "Introduction to HR", body: "Dear {{name}},\n\nGreetings from [University Name]!\n\nI am reaching out from the Placement Cell. We have a talented pool of students across courses like BCA, MCA, BSc CS, MBA, and more.\n\nWe'd love to explore campus hiring opportunities with {{company}}.\n\nLooking forward to your response.\nBest regards" },
  { id: 2, category: "Email", name: "Follow-up", body: "Dear {{name}},\n\nJust following up on my previous email regarding campus placement opportunities at {{company}}.\n\nWe would be grateful for any internship or full-time openings you may have for our students.\n\nPlease let me know a convenient time to discuss.\nThank you." },
  { id: 3, category: "Email", name: "Thank You / Post Discussion", body: "Dear {{name}},\n\nThank you for taking the time to discuss campus hiring with us. We are excited about the opportunity to collaborate with {{company}}.\n\nAs discussed, we will share the student profiles at the earliest.\n\nBest regards" },
  { id: 4, category: "WhatsApp", name: "Quick Intro", body: "Hi {{name}}! 👋\nThis is [Your Name] from [University] Placement Cell.\nWe'd love to discuss campus hiring opportunities with {{company}}.\nCould we schedule a quick call? 📞" },
  { id: 5, category: "WhatsApp", name: "Share Opportunity", body: "Hi Team! 📢\n\nNew Opportunity from {{company}}:\n{{role}}\n\nType: {{opportunityType}}\nCTC/Stipend: {{ctc}} / {{stipend}}\n\nInterested students please register on the link below. Last date: [date]" },
  { id: 6, category: "Call Script", name: "Cold Call to HR", body: "Hi {{name}}, this is [Your Name] from [University] Placement Cell. I'm reaching out to explore if {{company}} is looking to hire fresh graduates or interns. We have students in BCA, MCA, MBA, B.Tech and more. Do you have 2 minutes?" },
  { id: 7, category: "Call Script", name: "Follow-up Call", body: "Hi {{name}}, this is [Your Name] following up on our conversation about campus placement at {{company}}. Have you had a chance to share the JD or confirm the drive dates?" },
  { id: 8, category: "SMS", name: "Drive Reminder", body: "Hi {{name}}, this is a reminder about the campus drive at [University] scheduled on [date]. Please confirm your attendance. Thank you!" },
];

/* ══════════════════════ DATE / TIME HELPERS ══════════════════════ */
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayStr() { return localDateStr(); }

export function getDiff(dateStr) {
  if (!dateStr) return 999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00"); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export function getMinutesUntil(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return Math.round((new Date(dateStr + "T" + timeStr + ":00") - new Date()) / 60000);
}

export function fmt12(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function fmtDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateShort(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function fmtRelative(dateStr) {
  if (!dateStr) return "";
  const diff = getDiff(dateStr);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1) return `${Math.abs(diff)} days ago`;
  if (diff <= 7) return `In ${diff} days`;
  return fmtDate(dateStr);
}

function pad2(n) { return String(n).padStart(2, "0"); }
function isValidYmd(y, m, d) {
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === (m - 1) && dt.getDate() === d;
}
function toYmd(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

export function normalizeDateInput(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date && !isNaN(value.getTime())) return localDateStr(value);
  const raw = String(value).trim();
  if (!raw) return "";

  // Excel serial date
  if (/^\d+$/.test(raw)) {
    const num = Number(raw);
    if (num > 20000 && num < 90000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dt = new Date(excelEpoch.getTime() + num * 86400000);
      return toYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  let m = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (isValidYmd(y, mo, d)) return toYmd(y, mo, d);
  }

  // Month name formats (e.g., 1 Mar 2026, Mar 1, 2026)
  if (/[a-zA-Z]/.test(raw)) {
    const dt = new Date(raw);
    if (!isNaN(dt.getTime())) return localDateStr(dt);
  }

  // DD/MM/YYYY or MM/DD/YYYY (defaults to DD/MM when ambiguous)
  m = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) {
    let p1 = Number(m[1]);
    let p2 = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += (y >= 70 ? 1900 : 2000);
    let day;
    let month;
    if (p1 > 12 && p2 <= 12) { day = p1; month = p2; }
    else if (p2 > 12 && p1 <= 12) { day = p2; month = p1; }
    else { day = p1; month = p2; }
    if (isValidYmd(y, month, day)) return toYmd(y, month, day);
  }

  return "";
}

export function normalizeTimeInput(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date && !isNaN(value.getTime())) {
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }
  const raw = String(value).trim().toLowerCase();
  if (!raw) return "";

  // 2:30 pm / 2pm
  let m = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m) {
    let h = Number(m[1]);
    let min = Number(m[2] || 0);
    if (h >= 1 && h <= 12 && min >= 0 && min <= 59) {
      if (m[3] === "pm" && h !== 12) h += 12;
      if (m[3] === "am" && h === 12) h = 0;
      return `${pad2(h)}:${pad2(min)}`;
    }
  }

  // 24h with colon or dot
  m = raw.match(/^(\d{1,2})[:.](\d{2})$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return `${pad2(h)}:${pad2(min)}`;
  }

  // 3-4 digit time (e.g. 930, 1530)
  m = raw.match(/^(\d{3,4})$/);
  if (m) {
    const digits = m[1].padStart(4, "0");
    const h = Number(digits.slice(0, 2));
    const min = Number(digits.slice(2));
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return `${pad2(h)}:${pad2(min)}`;
  }

  // Hour only
  m = raw.match(/^(\d{1,2})$/);
  if (m) {
    const h = Number(m[1]);
    if (h >= 0 && h <= 23) return `${pad2(h)}:00`;
  }

  return "";
}

export function fmtCTC(val) {
  if (!val && val !== 0) return "";
  const str = String(val).trim();
  const n = parseFloat(str);
  if (isNaN(n)) return str;
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + " LPA";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + n.toLocaleString("en-IN");
}
export const fmtCurrency = fmtCTC;

export function fmtNumber(n) {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + " Cr";
  if (n >= 100000) return (n / 100000).toFixed(1) + " L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

/* ══════════════════════ HELPERS ══════════════════════ */

/** Check if a status is "closed" (terminal) */
export function isClosedStatus(status) {
  return CLOSED_STAGES.includes(status) ||
    status === "Placed" || status === "Not Placed" ||
    status === "Closed Won" || status === "Closed Lost";
}

/* ══════════════════════ LEAD HELPERS ══════════════════════ */
export function getActiveDeadline(t) {
  if (t.followUps && t.followUps.length > 0) return t.followUps[t.followUps.length - 1].deadline;
  return t.date;
}

export function getActiveDeadlineTime(t) {
  if (t.followUps && t.followUps.length > 0) return t.followUps[t.followUps.length - 1].deadlineTime || "";
  return t.deadlineTime || "";
}

export function getLeadAge(t) {
  if (!t.createdAt) return 0;
  return Math.abs(getDiff(t.createdAt));
}

export function calculateLeadScore(t) {
  let score = 0;
  const breakdown = [];

  // Contact completeness (max 25)
  if (t.name && t.name.trim()) { score += 5; breakdown.push("Name +5"); }
  if (t.company && t.company.trim()) { score += 5; breakdown.push("Company +5"); }
  if (t.contact) { score += 5; breakdown.push("Phone +5"); }
  if (t.email) { score += 5; breakdown.push("Email +5"); }
  if (t.linkedIn) { score += 5; breakdown.push("LinkedIn +5"); }

  // Opportunity details (max 15)
  if (t.ctc || t.stipend) { score += 8; breakdown.push("CTC/Stipend info +8"); }
  if (t.opportunityType) { score += 4; breakdown.push("Opportunity type +4"); }
  if ((t.courses || []).length > 0) { score += 3; breakdown.push("Courses tagged +3"); }

  // Follow-up engagement (max 25)
  const fups = (t.followUps || []).length;
  const fuScore = Math.min(fups * 5, 25);
  if (fuScore > 0) { score += fuScore; breakdown.push(`${fups} follow-up(s) +${fuScore}`); }

  // Pipeline progress (max 25)
  const stageIdx = PIPELINE_STAGES.indexOf(t.status);
  if (stageIdx > 0) { const pts = stageIdx * 5; score += pts; breakdown.push(`Stage: ${t.status} +${pts}`); }
  if (t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won") { score = 100; breakdown.length = 0; breakdown.push("Converted = 100"); }
  if (t.status === "Not Converted" || t.status === "Not Placed" || t.status === "Closed Lost") { score = Math.min(score, 15); breakdown.push("Not Converted (capped 15)"); }
  if (t.status === "Closed") { score = Math.min(score, 20); breakdown.push("Closed (capped 20)"); }

  // Notes (max 5)
  if (t.notes && t.notes.length > 10) { score += 5; breakdown.push("Detailed notes +5"); }

  // Staleness penalty
  const dl = getActiveDeadline(t);
  const diff = getDiff(dl);
  if (diff < -7) { score -= 15; breakdown.push("Stale >7d -15"); }
  else if (diff < -3) { score -= 8; breakdown.push("Stale >3d -8"); }
  else if (diff < 0) { score -= 3; breakdown.push("Overdue -3"); }

  const final = Math.max(0, Math.min(100, score));
  return final;
}

/* ── Score breakdown for info tooltip ── */
export function getScoreBreakdown(t) {
  const items = [];
  if (t.name && t.name.trim()) items.push({ label: "Name provided", pts: 5 });
  if (t.company && t.company.trim()) items.push({ label: "Company provided", pts: 5 });
  if (t.contact) items.push({ label: "Phone number", pts: 5 });
  if (t.email) items.push({ label: "Email address", pts: 5 });
  if (t.linkedIn) items.push({ label: "LinkedIn profile", pts: 5 });
  if (t.ctc || t.stipend) items.push({ label: "CTC/Stipend info", pts: 8 });
  if (t.opportunityType) items.push({ label: "Opportunity type set", pts: 4 });
  if ((t.courses || []).length > 0) items.push({ label: "Courses tagged", pts: 3 });
  const fups = (t.followUps || []).length;
  if (fups > 0) items.push({ label: `${fups} follow-up(s)`, pts: Math.min(fups * 5, 25) });
  const stageIdx = PIPELINE_STAGES.indexOf(t.status);
  if (stageIdx > 0) items.push({ label: `Stage: ${t.status}`, pts: stageIdx * 5 });
  if (t.notes && t.notes.length > 10) items.push({ label: "Detailed notes", pts: 5 });
  const dl = getActiveDeadline(t);
  const diff = getDiff(dl);
  if (diff < -7) items.push({ label: "Stale > 7 days", pts: -15 });
  else if (diff < -3) items.push({ label: "Stale > 3 days", pts: -8 });
  else if (diff < 0) items.push({ label: "Overdue", pts: -3 });
  return items;
}

export function isStale(t) {
  const dl = getActiveDeadline(t);
  const diff = getDiff(dl);
  return diff < -3 && !isClosedStatus(t.status);
}

/* ══════════════════════ NOTIFICATIONS ══════════════════════ */
export function sendNotif(title, body) {
  if (isElectron) window.electronAPI.sendNotification({ title, body });
  else if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
}

/* ══════════════════════ CSV HELPERS ══════════════════════ */
export function parseCSV(text) {
  if (!text) return [];
  const input = String(text).replace(/^\uFEFF/, "");
  const delimiter = detectCsvDelimiter(input);
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  const pushRow = (r) => {
    if (r.some(cell => String(cell || "").trim() !== "")) rows.push(r);
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (inQuotes && input[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      row.push(current);
      current = "";
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(current);
      current = "";
      pushRow(row);
      row = [];
      continue;
    }
    current += ch;
  }
  if (current.length || row.length) {
    row.push(current);
    pushRow(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map(cleanCsvHeader);
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      if (!h) return;
      obj[h] = cleanCsvValue(r[i]);
    });
    return obj;
  }).filter(r => Object.values(r).some(v => String(v || "").trim() !== ""));
}

function detectCsvDelimiter(input) {
  const candidates = [",", ";", "\t", "|"];
  const counts = new Map(candidates.map(c => [c, 0]));
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (inQuotes && input[i + 1] === '"') { i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    if (!inQuotes && counts.has(ch)) counts.set(ch, counts.get(ch) + 1);
  }
  let best = ",";
  let max = 0;
  counts.forEach((count, delim) => {
    if (count > max) { max = count; best = delim; }
  });
  return best;
}

function cleanCsvHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

function cleanCsvValue(value) {
  return String(value ?? "").trim();
}

export function exportLeadsCSV(tasks) {
  const headers = ["S.No", "Name", "Company", "Phone", "Email", "LinkedIn", "Source", "Status", "Opportunity Type", "CTC", "Stipend", "Role", "Courses", "Called On", "Call Back Date", "Call Back Time", "Tags", "Notes", "Created", "Follow-ups"];
  const csvRows = [headers.join(",")];
  tasks.forEach((t, i) => {
    const vals = [
      i + 1, t.name, t.company || "", t.contact || "", t.email || "",
      t.linkedIn || "", t.source || "", t.status || "New",
      t.opportunityType || "", t.ctc || "", t.stipend || "", t.role || "",
      (t.courses || []).join("; "),
      t.calledOn ? fmtDate(t.calledOn) : "",
      t.date ? fmtDate(t.date) : "", t.deadlineTime ? fmt12(t.deadlineTime) : "",
      (t.tags || []).join("; "), (t.notes || "").replace(/"/g, '""'),
      t.createdAt || "", (t.followUps || []).length
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
}

/* ══════════════════════ TEMPLATE HELPERS ══════════════════════ */
export function fillTemplate(template, lead) {
  if (!template || !lead) return template || "";
  return template
    .replace(/\{\{name\}\}/gi, lead.name || "")
    .replace(/\{\{company\}\}/gi, lead.company || "")
    .replace(/\{\{contact\}\}/gi, lead.contact || "")
    .replace(/\{\{email\}\}/gi, lead.email || "")
    .replace(/\{\{ctc\}\}/gi, lead.ctc || "")
    .replace(/\{\{stipend\}\}/gi, lead.stipend || "")
    .replace(/\{\{role\}\}/gi, lead.role || "")
    .replace(/\{\{linkedIn\}\}/gi, lead.linkedIn || "")
    .replace(/\{\{opportunityType\}\}/gi, lead.opportunityType || "")
    .replace(/\{\{courses\}\}/gi, (lead.courses || []).join(", "))
    .replace(/\{\{date\}\}/gi, lead.date ? fmtDate(lead.date) : "")
    .replace(/\{\{status\}\}/gi, lead.status || "");
}
