import { STATUS_COLORS, STATUS_TW, getDiff, fmt12 } from "../lib/utils";
import { cn } from "../lib/cn";
import {
  Clock, MapPin, AlertTriangle, CheckCircle, ChevronRight, Star,
  Inbox, FileText, X, Loader2, User
} from "lucide-react";

/* ── Tiny coloured dot ── */
export function Dot({ color = "#888", size = 8, className = "" }) {
  return <span className={cn("inline-block rounded-full shrink-0", className)} style={{ width: size, height: size, background: color }} />;
}

/* ── Status chip — Tailwind dark-aware ── */
export function StatusChip({ status, small = false }) {
  const tw = STATUS_TW[status] || STATUS_TW["New"] || "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium leading-none whitespace-nowrap",
      small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      tw
    )}>
      {status}
    </span>
  );
}

/* ── Deadline badge ── */
export function DeadlineBadge({ date, time, small = false }) {
  if (!date) return null;
  const d = getDiff(date);
  const isNaN_ = isNaN(d);
  const label = isNaN_ ? "No date" : d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d}d left`;
  const color = isNaN_ ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
    : d < 0 ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
    : d === 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
    : d <= 2 ? "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
      small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      color
    )}>
      <Clock size={small ? 10 : 12} />
      {label}{time ? ` · ${fmt12(time)}` : ""}
    </span>
  );
}

/* ── Time badge ── */
export function TimeBadge({ time }) {
  if (!time) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 font-medium">
      <Clock size={12} />{fmt12(time)}
    </span>
  );
}

/* ── Source chip ── */
export function SourceChip({ source }) {
  if (!source) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 font-medium">
      <MapPin size={10} />{source}
    </span>
  );
}



/* ── Meta item (icon + text) ── */
export function MetaItem({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
      {Icon && <Icon size={12} className="shrink-0" />}{children}
    </span>
  );
}

/* ── Empty state ── */
export function EmptyState({ icon: Icon = Inbox, title = "Nothing here", subtitle = "" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500 select-none">
      <Icon size={48} strokeWidth={1.2} className="mb-3 opacity-40" />
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs mt-1 text-zinc-400 dark:text-zinc-500">{subtitle}</p>}
    </div>
  );
}

/* ── Stat card ── */
export function StatCard({ label, value, sub, accent, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "stat-card-btn",
        onClick && "cursor-pointer"
      )}
      style={{ all: "unset", display: "flex", flexDirection: "column", gap: 2, borderRadius: 12, border: "1px solid var(--border-default)", padding: "16px 20px", textAlign: "left", background: "var(--bg-secondary)", cursor: onClick ? "pointer" : "default", transition: "box-shadow 0.2s, border-color 0.2s", flex: 1, minWidth: 150 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {Icon && <Icon size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />}
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      </div>
      <span style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{sub}</span>}
    </button>
  );
}

/* ── Confirm modal ── */
export function ConfirmModal({ title, message, confirmLabel = "Confirm", onConfirm, onCancel, danger = false }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-zinc-200 dark:border-zinc-700" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">{title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors",
            danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          )}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tag input ── */
export function TagInput({ value = [], onChange, placeholder = "Add tag…" }) {
  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = e.target.value.trim();
      if (v && !value.includes(v)) onChange([...value, v]);
      e.target.value = "";
    }
  };
  const remove = (tag) => onChange(value.filter(t => t !== tag));
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 min-h-[38px]">
      {value.map(t => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
          {t}
          <button onClick={() => remove(t)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
        </span>
      ))}
      <input
        onKeyDown={handleKey}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] text-sm bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
      />
    </div>
  );
}

/* ── Logo icon — dark square with white O ring ── */
export function LogoIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="7" fill="#111827" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

/* ── Section header ── */
export function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.2px" }}>{title}</h2>
      {action && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{action}</div>}
    </div>
  );
}

/* ── Progress bar ── */
export function ProgressBar({ value = 0, max = 100, color = "bg-blue-500", className = "" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
