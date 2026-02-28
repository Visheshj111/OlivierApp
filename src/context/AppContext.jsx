import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  STORAGE_KEY, TEMPLATES_KEY, SETTINGS_KEY, isElectron,
  DEFAULT_TEMPLATES,
  getTodayStr, getDiff, getMinutesUntil, getActiveDeadline, getActiveDeadlineTime,
  normalizeDateInput, normalizeTimeInput,
  sendNotif, fmt12, getAllStatuses, isClosedStatus
} from "../lib/utils";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const DEFAULT_SETTINGS = { darkMode: false, hourlyReminders: false, groqApiKey: "" };

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [notifReady, setNotifReady] = useState(isElectron);
  const [firedDeadlines, setFiredDeadlines] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [autoStart, setAutoStart] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const firedCalls = useRef(new Set());
  const hourlyFired = useRef(new Set());

  /* ── Settings ── */
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const applyTheme = useCallback((dark) => {
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }, []);
  const readJson = useCallback((key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }, []);

  /* ── Load data ── */
  useEffect(() => {
    const loadData = async () => {
      try {
        let storeTasks;
        let storeTemplates;
        let storeSettings;

        if (isElectron && window.electronAPI?.storeRead) {
          const d = await window.electronAPI.storeRead();
          if (d) {
            const parsed = JSON.parse(d);
            if (Array.isArray(parsed)) {
              storeTasks = parsed;
            } else {
              if (Array.isArray(parsed.tasks)) storeTasks = parsed.tasks;
              if (Array.isArray(parsed.templates)) storeTemplates = parsed.templates;
              if (parsed.settings && typeof parsed.settings === "object") storeSettings = parsed.settings;
            }
          }
        }

        const lsTasks = readJson(STORAGE_KEY);
        const lsTemplates = readJson(TEMPLATES_KEY);
        const lsSettings = readJson(SETTINGS_KEY);

        const rawTasks = storeTasks ?? (Array.isArray(lsTasks) ? lsTasks : undefined);
        const rawTemplates = storeTemplates ?? (Array.isArray(lsTemplates) ? lsTemplates : undefined);
        const rawSettings = storeSettings ?? ((lsSettings && typeof lsSettings === "object") ? lsSettings : undefined);

        const normalizedTasks = Array.isArray(rawTasks) ? migrateLeads(rawTasks) : [];
        const normalizedTemplates = Array.isArray(rawTemplates) ? rawTemplates : DEFAULT_TEMPLATES;
        const normalizedSettings = { ...DEFAULT_SETTINGS, ...(rawSettings || {}) };

        setTasks(normalizedTasks);
        setTemplates(normalizedTemplates);
        setSettings(normalizedSettings);
        applyTheme(normalizedSettings.darkMode);

        if (isElectron && window.electronAPI?.storeWrite) {
          window.electronAPI.storeWrite(JSON.stringify({
            tasks: normalizedTasks,
            templates: normalizedTemplates,
            settings: normalizedSettings,
          }));
        }
      } catch (_) {}
      if (isElectron) setNotifReady(true);
      else if ("Notification" in window) setNotifReady(Notification.permission === "granted");
      setLoaded(true);
    };
    loadData();
    if (isElectron && window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => setAppVersion(v)).catch(() => {});
    }
    if (isElectron && window.electronAPI?.getAutoStart) {
      window.electronAPI.getAutoStart().then(e => setAutoStart(e)).catch(() => {});
    }
  }, [applyTheme, readJson]);

  /* ── Migrate old leads to new schema ── */
  function migrateLeads(arr) {
    return arr.map(t => ({
      ...t,
      email: t.email || "",
      source: t.source || "",
      tags: t.tags || [],
      status: migrateStatus(t.status),
      followUps: (t.followUps || []),
      createdAt: t.createdAt || t.date || getTodayStr(),
      ctc: t.ctc || t.dealValue || "",
      stipend: t.stipend || "",
      linkedIn: t.linkedIn || "",
      opportunityType: t.opportunityType || "",
      courses: t.courses || [],
      role: t.role || "",
    }));
  }

  function migrateStatus(s) {
    if (!s) return "New";
    const map = {
      "Ongoing": "New", "Follow-up": "Contacted", "Interested": "Qualified",
      "Not Interested": "Not Converted", "Closed Won": "Converted", "Closed Lost": "Not Converted",
      "Proposal": "Proposal Sent", "Negotiation": "In Discussion",
      "Placed": "Converted", "Not Placed": "Not Converted",
    };
    return map[s] || (getAllStatuses().includes(s) ? s : "New");
  }

  /* ── Save ── */
  const persist = useCallback((next = {}) => {
    const payload = {
      tasks: next.tasks ?? tasks,
      templates: next.templates ?? templates,
      settings: next.settings ?? settings,
    };
    try {
      if (isElectron && window.electronAPI?.storeWrite) {
        window.electronAPI.storeWrite(JSON.stringify(payload));
      } else {
        if ("tasks" in next) localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.tasks));
        if ("templates" in next) localStorage.setItem(TEMPLATES_KEY, JSON.stringify(payload.templates));
        if ("settings" in next) localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload.settings));
      }
    } catch (_) {}
  }, [tasks, templates, settings]);

  const save = useCallback((updatedTasks) => {
    setTasks(updatedTasks);
    persist({ tasks: updatedTasks });
  }, [persist]);

  const saveTemplates = useCallback((t) => {
    setTemplates(t);
    persist({ templates: t });
  }, [persist]);

  /* ── Settings ── */
  const saveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    applyTheme(newSettings.darkMode);
    persist({ settings: newSettings });
  }, [applyTheme, persist]);

  /* ── Deadline notifications on load ── */
  useEffect(() => {
    if (!firedDeadlines && tasks.length > 0 && notifReady && loaded) {
      setFiredDeadlines(true);
      tasks.forEach(t => {
        if (isClosedStatus(t.status)) return;
        const d = getDiff(getActiveDeadline(t));
        const lbl = `${t.name}${t.company ? " @ " + t.company : ""}`;
        if (d === 0) sendNotif("Due TODAY", lbl + " is due today!");
        else if (d === 1) sendNotif("Due Tomorrow", lbl + " is due tomorrow.");
      });
    }
  }, [tasks, notifReady, firedDeadlines, loaded]);

  /* ── Poll for time-based notifs ── */
  useEffect(() => {
    if (!notifReady) return;
    const check = () => {
      tasks.forEach(t => {
        if (isClosedStatus(t.status)) return;
        const dl = getActiveDeadline(t);
        const dlTime = getActiveDeadlineTime(t);
        if (!dl || !dlTime) return;
        const mins = getMinutesUntil(dl, dlTime);
        if (mins === null) return;
        const lbl = `${t.name}${t.company ? " @ " + t.company : ""}`;
        if (mins >= 58 && mins <= 62 && !firedCalls.current.has(`${t.id}-1h`)) {
          firedCalls.current.add(`${t.id}-1h`);
          sendNotif("Call Reminder — 1 Hour", `${lbl} — call at ${fmt12(dlTime)}`);
        }
        if (mins >= -1 && mins <= 1 && !firedCalls.current.has(`${t.id}-now`)) {
          firedCalls.current.add(`${t.id}-now`);
          sendNotif("Time to Call!", `${lbl} — it's ${fmt12(dlTime)} now!`);
        }
      });

      // Hourly missed deadline reminders
      if (settings.hourlyReminders) {
        const now = new Date();
        const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        if (!hourlyFired.current.has(hourKey)) {
          const overdue = tasks.filter(t => {
            if (isClosedStatus(t.status)) return false;
            return getDiff(getActiveDeadline(t)) < 0;
          });
          if (overdue.length > 0) {
            hourlyFired.current.add(hourKey);
            sendNotif(`${overdue.length} Missed Deadline(s)`, overdue.slice(0, 3).map(t => t.name || "Unnamed").join(", ") + (overdue.length > 3 ? ` +${overdue.length - 3} more` : ""));
          }
        }
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [tasks, notifReady, settings.hourlyReminders]);

  /* ── CRUD Operations ── */
  const addLead = useCallback((form) => {
    const newLead = {
      ...form,
      id: Date.now(),
      createdAt: getTodayStr(),
      followUps: [],
      tags: form.tags || [],
      source: form.source || "",
      email: form.email || "",
      ctc: form.ctc || "",
      stipend: form.stipend || "",
      linkedIn: form.linkedIn || "",
      opportunityType: form.opportunityType || "",
      courses: form.courses || [],
      role: form.role || "",
    };
    save([...tasks, newLead]);
    return newLead;
  }, [tasks, save]);

  const updateLead = useCallback((id, updates) => {
    save(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [tasks, save]);

  const deleteLead = useCallback((id) => {
    save(tasks.filter(t => t.id !== id));
  }, [tasks, save]);

  const deleteLeads = useCallback((ids) => {
    save(tasks.filter(t => !ids.includes(t.id)));
  }, [tasks, save]);

  const changeStatus = useCallback((id, status) => {
    save(tasks.map(t => t.id === id ? { ...t, status } : t));
  }, [tasks, save]);

  const bulkChangeStatus = useCallback((ids, status) => {
    save(tasks.map(t => ids.includes(t.id) ? { ...t, status } : t));
  }, [tasks, save]);

  const addFollowUp = useCallback((taskId, fu) => {
    save(tasks.map(t => {
      if (t.id !== taskId) return t;
      const fus = [...(t.followUps || [])];
      fus.push({ id: Date.now(), ...fu });
      return { ...t, followUps: fus };
    }));
  }, [tasks, save]);

  const deleteFollowUp = useCallback((taskId, fuId) => {
    save(tasks.map(t => t.id !== taskId ? t : { ...t, followUps: (t.followUps || []).filter(f => f.id !== fuId) }));
  }, [tasks, save]);

  const importLeads = useCallback((newLeads) => {
    const summary = { imported: 0, skipped: 0, defaultedDates: 0, invalidTimes: 0, invalidCalledOn: 0 };
    const normalizeList = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
      const str = String(value);
      const sep = str.includes(";") ? ";" : str.includes(",") ? "," : null;
      if (!sep) return [str.trim()].filter(Boolean);
      return str.split(sep).map(s => s.trim()).filter(Boolean);
    };
    const toStr = (value) => (value === null || value === undefined) ? "" : String(value).trim();
    const pick = (obj, keys) => {
      for (const k of keys) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) return obj[k];
      }
      return "";
    };

    const imported = [];
    newLeads.forEach((l, i) => {
      if (!l || Object.values(l).every(v => !String(v || "").trim())) { summary.skipped++; return; }

      const dateRaw = pick(l, ["date", "call back date", "callback date", "call_back_date", "call back", "callback", "Call Back Date"]);
      const dateNorm = normalizeDateInput(dateRaw);
      const date = dateNorm || getTodayStr();
      if (dateRaw && !dateNorm) summary.defaultedDates++;

      const calledOnRaw = pick(l, ["calledon", "called on", "called_on", "call date", "called date", "calledon date", "calledOn", "Called On"]);
      const calledOn = normalizeDateInput(calledOnRaw);
      if (calledOnRaw && !calledOn) summary.invalidCalledOn++;

      const timeRaw = pick(l, ["deadlineTime", "call back time", "callback time", "call time", "time", "Call Back Time", "Deadline Time"]);
      const deadlineTime = normalizeTimeInput(timeRaw);
      if (timeRaw && !deadlineTime) summary.invalidTimes++;

      imported.push({
        id: Date.now() + i,
        name: toStr(l.name || l.Name) || "Unnamed",
        company: toStr(l.company || l.Company),
        contact: toStr(l.contact || l.phone || l.Phone || l.Contact),
        email: toStr(l.email || l.Email),
        calledOn,
        date,
        deadlineTime,
        notes: toStr(l.notes || l.Notes),
        status: migrateStatus(toStr(l.status || l.Status || "New")),
        source: toStr(l.source || l.Source),
        ctc: toStr(l.ctc || l.CTC || l.dealValue || l["deal value"]),
        stipend: toStr(l.stipend || l.Stipend),
        linkedIn: toStr(l.linkedIn || l.LinkedIn || l.linkedin),
        opportunityType: toStr(l.opportunityType || l["opportunity type"] || l["Opportunity Type"]),
        role: toStr(l.role || l.Role),
        courses: normalizeList(l.courses || l.Courses),
        tags: normalizeList(l.tags || l.Tags),
        createdAt: getTodayStr(),
        followUps: [],
      });
    });

    if (imported.length > 0) save([...tasks, ...imported]);
    summary.imported = imported.length;
    return summary;
  }, [tasks, save]);

  /* ── Notifications ── */
  const requestPermission = useCallback(async () => {
    if (isElectron) { setNotifReady(true); sendNotif("Notifications Enabled", "You'll be notified when deadlines are near."); return; }
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setNotifReady(p === "granted");
    if (p === "granted") new Notification("Notifications Enabled", { body: "You'll be notified when deadlines are near." });
  }, []);

  const scheduleReminder = useCallback((task, mins) => {
    if (!notifReady) return;
    const lbl = `${task.name}${task.company ? " @ " + task.company : ""}`;
    if (mins === 0) { sendNotif("Reminder", lbl); return; }
    const tl = mins < 60 ? `${mins} min` : `${mins / 60} hr`;
    sendNotif("Reminder Set", `Reminding about ${task.name} in ${tl}`);
    setTimeout(() => sendNotif("Reminder", lbl), mins * 60000);
  }, [notifReady]);

  const toggleAutoStart = useCallback(async (enabled) => {
    if (isElectron && window.electronAPI?.setAutoStart) {
      await window.electronAPI.setAutoStart(enabled);
      setAutoStart(enabled);
    }
  }, []);

  /* ── Computed Stats ── */
  const stats = useMemo(() => {
    const active = tasks.filter(t => !isClosedStatus(t.status));
    const overdue = active.filter(t => getDiff(getActiveDeadline(t)) < 0).length;
    const dueToday = active.filter(t => getDiff(getActiveDeadline(t)) === 0).length;
    const urgent = active.filter(t => { const d = getDiff(getActiveDeadline(t)); return d >= 0 && d <= 1; }).length;
    const converted = tasks.filter(t => t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won").length;
    const notConverted = tasks.filter(t => t.status === "Not Converted" || t.status === "Not Placed" || t.status === "Closed Lost").length;
    const closed = tasks.filter(t => t.status === "Closed").length;
    const conversionRate = (converted + notConverted) > 0 ? Math.round((converted / (converted + notConverted)) * 100) : 0;
    const totalFollowUps = tasks.reduce((s, t) => s + (t.followUps || []).length, 0);

    // By status
    const byStatus = {};
    getAllStatuses().forEach(s => { byStatus[s] = tasks.filter(t => t.status === s).length; });

    // By source
    const bySource = {};
    tasks.forEach(t => {
      const s = t.source || "Other";
      bySource[s] = (bySource[s] || 0) + 1;
    });

    // This week's leads
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = tasks.filter(t => t.createdAt && new Date(t.createdAt + "T00:00:00") >= weekStart).length;

    // Avg conversion cycle
    const convertedLeads = tasks.filter(t => (t.status === "Converted" || t.status === "Placed" || t.status === "Closed Won") && t.createdAt);
    const avgCycle = convertedLeads.length > 0
      ? Math.round(convertedLeads.reduce((s, t) => s + Math.abs(getDiff(t.createdAt)), 0) / convertedLeads.length)
      : 0;

    // Stale leads
    const stale = active.filter(t => getDiff(getActiveDeadline(t)) < -3).length;

    return {
      total: tasks.length, active: active.length, overdue, dueToday, urgent,
      converted, notConverted, closed, conversionRate, totalFollowUps,
      byStatus, bySource, thisWeek, avgCycle, stale,
      // Backward compat aliases
      placed: converted, notPlaced: notConverted, placementRate: conversionRate,
      won: converted, lost: notConverted, winRate: conversionRate,
    };
  }, [tasks]);

  /* ── Today's calls ── */
  const todaysCalls = useMemo(() => {
    return tasks
      .filter(t => {
        if (isClosedStatus(t.status)) return false;
        const dl = getActiveDeadline(t);
        const diff = getDiff(dl);
        return diff <= 0;
      })
      .sort((a, b) => {
        const at = getActiveDeadlineTime(a);
        const bt = getActiveDeadlineTime(b);
        if (at && bt) return at.localeCompare(bt);
        if (at) return -1;
        if (bt) return 1;
        return new Date(getActiveDeadline(a)) - new Date(getActiveDeadline(b));
      });
  }, [tasks]);

  const value = {
    tasks, save, templates, saveTemplates, loaded,
    settings, saveSettings,
    notifReady, setNotifReady, requestPermission, scheduleReminder,
    appVersion, autoStart, toggleAutoStart,
    addLead, updateLead, deleteLead, deleteLeads,
    changeStatus, bulkChangeStatus, addFollowUp, deleteFollowUp, importLeads,
    stats, todaysCalls,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}                                                                                                                                                                             
