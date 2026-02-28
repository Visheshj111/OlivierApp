/* ---------------------------------------------------------------
   OLIVIER � App Shell
   Sidebar, top-bar, page router, keyboard shortcuts
   --------------------------------------------------------------- */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, Users, Kanban, BarChart3, CalendarCheck,
  Table2, FileText, Bell, BellOff, Settings,
  Search, X, ChevronRight, Zap,
  Power, Menu, Moon, Sun, Clock, Plus, Trash2, Info
} from "lucide-react";
import { useApp } from "./context/AppContext";
import { LogoIcon } from "./components/Shared";
import { isElectron, getCustomStatuses, saveCustomStatuses } from "./lib/utils";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import KanbanPage from "./pages/Kanban";
import Analytics from "./pages/Analytics";
import DailyPlanner from "./pages/DailyPlanner";
import Templates from "./pages/Templates";
import AllLeadsSheet from "./pages/AllLeadsSheet";

/* -- Page definitions -- */
const PAGES = [
  { key: "dashboard",  label: "Overview",       icon: LayoutDashboard, group: "main" },
  { key: "leads",      label: "Leads",          icon: Users,           group: "main" },
  { key: "kanban",     label: "Pipeline",       icon: Kanban,          group: "main" },
  { key: "planner",    label: "Daily Planner",  icon: CalendarCheck,   group: "main" },
  { key: "analytics",  label: "Analytics",      icon: BarChart3,       group: "main" },
  { key: "sheet",      label: "All Leads",      icon: Table2,          group: "data" },
  { key: "templates",  label: "Templates",      icon: FileText,        group: "data" },
];

export default function App() {
  const {
    stats, tasks, loaded,
    notifReady, requestPermission,
    appVersion, autoStart, toggleAutoStart,
    settings, saveSettings,
  } = useApp();

  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdQ, setCmdQ] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [newCustomStatus, setNewCustomStatus] = useState("");
  const [customStatuses, setCustomStatuses] = useState(getCustomStatuses());
  const cmdRef = useRef(null);

  /* -- Navigate helper -- */
  const onNavigate = useCallback((pg, leadId) => {
    setPage(pg);
    if (leadId !== undefined) setExpandedCard(leadId);
  }, []);

  const onExpandLead = useCallback((id) => {
    setPage("leads");
    setTimeout(() => setExpandedCard(id), 50);
  }, []);

  /* -- Keyboard shortcuts -- */
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCmdPalette(v => !v);
        setCmdQ("");
      }
      if (e.key === "Escape") {
        if (showCmdPalette) setShowCmdPalette(false);
        if (showSettings) setShowSettings(false);
      }
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < PAGES.length) {
          e.preventDefault();
          setPage(PAGES[idx].key);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showCmdPalette, showSettings]);

  useEffect(() => {
    if (showCmdPalette && cmdRef.current) cmdRef.current.focus();
  }, [showCmdPalette]);

  /* -- Command palette items -- */
  const cmdItems = [
    ...PAGES.map(p => ({ label: "Go to " + p.label, icon: p.icon, action: () => { setPage(p.key); setShowCmdPalette(false); } })),
    { label: "Toggle Sidebar", icon: Menu, action: () => { setSidebarOpen(v => !v); setShowCmdPalette(false); } },
    { label: "Open Settings", icon: Settings, action: () => { setShowSettings(true); setShowCmdPalette(false); } },
    ...(notifReady ? [] : [{ label: "Enable Notifications", icon: Bell, action: () => { requestPermission(); setShowCmdPalette(false); } }]),
  ];
  const filteredCmd = cmdQ
    ? cmdItems.filter(c => c.label.toLowerCase().includes(cmdQ.toLowerCase()))
    : cmdItems;

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "var(--font)", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <LogoIcon size={40} />
          <p style={{ marginTop: 12, color: "var(--text-tertiary)", fontSize: 13 }}>Loading Olivier...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font)", background: "var(--bg-secondary)" }}>

      {/* SIDEBAR */}
      <aside className={"sidebar" + (sidebarOpen ? "" : " collapsed")}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 16px 16px", cursor: "pointer" }}
          onClick={() => setSidebarOpen(v => !v)}>
          <LogoIcon size={24} />
          {sidebarOpen && (
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>Olivier</span>
          )}
        </div>

        <nav style={{ flex: 1, padding: "0 8px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", padding: "12px 10px 6px", display: sidebarOpen ? "block" : "none" }}>
            Workspace
          </div>
          {PAGES.filter(p => p.group === "main").map(p => (
            <SidebarItem key={p.key} page={p} active={page === p.key} open={sidebarOpen}
              badge={p.key === "planner" && stats.dueToday > 0 ? stats.dueToday : p.key === "leads" && stats.overdue > 0 ? stats.overdue : null}
              badgeColor={p.key === "leads" ? "#DC2626" : "#F59E0B"}
              onClick={() => setPage(p.key)} />
          ))}

          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", padding: "16px 10px 6px", display: sidebarOpen ? "block" : "none" }}>
            Data & Tools
          </div>
          {PAGES.filter(p => p.group === "data").map(p => (
            <SidebarItem key={p.key} page={p} active={page === p.key} open={sidebarOpen}
              onClick={() => setPage(p.key)} />
          ))}
        </nav>

        <div style={{ padding: "8px", borderTop: "1px solid var(--border-default)" }}>
          <SidebarItem
            page={{ key: "settings", label: "Settings", icon: Settings }}
            active={showSettings}
            open={sidebarOpen}
            onClick={() => setShowSettings(true)}
          />
        </div>
      </aside>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 24px",
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-default)",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <button className="icon-btn" onClick={() => setSidebarOpen(v => !v)} title="Toggle sidebar">
            <Menu size={16} />
          </button>

          <button onClick={() => { setShowCmdPalette(true); setCmdQ(""); }}
            style={{
              flex: 1, maxWidth: 420,
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 14px",
              background: "var(--bg-secondary)", border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)", cursor: "pointer",
              fontSize: 13, color: "#94A3B8",
            }}>
            <Search size={14} />
            <span style={{ flex: 1, textAlign: "left" }}>Search or jump to...</span>
            <kbd style={{ fontSize: 10, padding: "2px 6px", background: "var(--bg-primary)", borderRadius: 4, border: "1px solid var(--border-default)", color: "#94A3B8" }}>
              Ctrl+K
            </kbd>
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {stats.overdue > 0 && (
              <button onClick={() => setPage("leads")} className="chip" style={{ background: "#FEF2F2", color: "#DC2626", cursor: "pointer", border: "none" }}>
                <Zap size={11} /> {stats.overdue} overdue
              </button>
            )}
            {stats.dueToday > 0 && (
              <button onClick={() => setPage("planner")} className="chip" style={{ background: "#FFFBEB", color: "#92400E", cursor: "pointer", border: "none" }}>
                <CalendarCheck size={11} /> {stats.dueToday} today
              </button>
            )}
          </div>

          <button className="icon-btn" onClick={notifReady ? undefined : requestPermission}
            title={notifReady ? "Notifications enabled" : "Enable notifications"}
            style={{ color: notifReady ? "#22C55E" : "#94A3B8" }}>
            {notifReady ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {page === "dashboard" && <Dashboard onNavigate={onNavigate} onExpandLead={onExpandLead} />}
          {page === "leads" && <Leads expandedCard={expandedCard} setExpandedCard={setExpandedCard} />}
          {page === "kanban" && <KanbanPage onNavigate={onNavigate} onExpandLead={onExpandLead} />}
          {page === "analytics" && <Analytics />}
          {page === "planner" && <DailyPlanner onNavigate={onNavigate} onExpandLead={onExpandLead} />}
          {page === "sheet" && <AllLeadsSheet />}
          {page === "templates" && <Templates />}
        </main>
      </div>

      {/* COMMAND PALETTE */}
      {showCmdPalette && (
        <div className="modal-overlay" onClick={() => setShowCmdPalette(false)} style={{ alignItems: "flex-start", paddingTop: "15vh" }}>
          <div className="cmd-palette" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border-default)" }}>
              <Search size={16} color="#94A3B8" />
              <input
                ref={cmdRef}
                value={cmdQ}
                onChange={e => setCmdQ(e.target.value)}
                placeholder="Type a command or page name..."
                style={{
                  flex: 1, border: "none", outline: "none",
                  fontSize: 14, background: "transparent", color: "var(--text-primary)",
                }}
              />
              <kbd style={{ fontSize: 10, padding: "2px 6px", background: "var(--bg-tertiary)", borderRadius: 4, border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}>ESC</kbd>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", padding: "4px" }}>
              {filteredCmd.map((item, i) => (
                <button key={i} onClick={item.action}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 14px",
                    border: "none", background: "transparent", cursor: "pointer",
                    borderRadius: 8, fontSize: 13, color: "var(--text-primary)",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <item.icon size={15} color="var(--text-tertiary)" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <ChevronRight size={12} color="var(--text-muted)" />
                </button>
              ))}
              {filteredCmd.length === 0 && (
                <p style={{ padding: "16px", color: "var(--text-tertiary)", fontSize: 13, textAlign: "center" }}>No results</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-default)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Settings</h2>
              <button className="icon-btn" onClick={() => setShowSettings(false)}><X size={16} /></button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* App Info */}
              <div style={{ padding: 16, background: "var(--bg-tertiary)", borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
                <LogoIcon size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 15 }}>Olivier</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Placement Cell Lead Manager</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{appVersion ? `v${appVersion} · ` : ""}{tasks.length} leads · {stats.active} active</div>
                </div>
              </div>

              {/* Section: Appearance */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Appearance</div>
                <div className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {settings.darkMode ? <Moon size={16} color="#8B5CF6" /> : <Sun size={16} color="#F59E0B" />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Dark Mode</div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{settings.darkMode ? "Dark theme active" : "Light theme active"}</div>
                      </div>
                    </div>
                    <label style={{ position: "relative", display: "inline-flex", cursor: "pointer", flexShrink: 0 }}>
                      <input type="checkbox" checked={settings.darkMode || false}
                        onChange={e => saveSettings({ ...settings, darkMode: e.target.checked })}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                      <div style={{
                        width: 44, height: 24, borderRadius: 12, padding: 2, cursor: "pointer",
                        background: settings.darkMode ? "#6366F1" : "var(--border-strong)",
                        transition: "background 0.25s ease",
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", background: "#fff",
                          transform: settings.darkMode ? "translateX(20px)" : "translateX(0)",
                          transition: "transform 0.25s ease", boxShadow: "0 1px 3px rgba(0,0,0,.25)",
                        }} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section: Notifications */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Notifications</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {notifReady ? <Bell size={16} color="#22C55E" /> : <BellOff size={16} color="var(--text-tertiary)" />}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Push Notifications</div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{notifReady ? "Active — you'll be notified" : "Click Enable to turn on"}</div>
                        </div>
                      </div>
                      {!notifReady && <button className="btn-p xs" onClick={requestPermission}>Enable</button>}
                      {notifReady && <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600 }}>✓ On</span>}
                    </div>
                  </div>
                  <div className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Clock size={16} color={settings.hourlyReminders ? "#F59E0B" : "var(--text-tertiary)"} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Hourly Missed Reminders</div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Get reminded every hour about overdue leads</div>
                        </div>
                      </div>
                      <label style={{ position: "relative", display: "inline-flex", cursor: "pointer", flexShrink: 0 }}>
                        <input type="checkbox" checked={settings.hourlyReminders || false}
                          onChange={e => saveSettings({ ...settings, hourlyReminders: e.target.checked })}
                          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                        <div style={{
                          width: 44, height: 24, borderRadius: 12, padding: 2, cursor: "pointer",
                          background: settings.hourlyReminders ? "#F59E0B" : "var(--border-strong)",
                          transition: "background 0.25s ease",
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%", background: "#fff",
                            transform: settings.hourlyReminders ? "translateX(20px)" : "translateX(0)",
                            transition: "transform 0.25s ease", boxShadow: "0 1px 3px rgba(0,0,0,.25)",
                          }} />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: System */}
              {isElectron && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>System</div>
                  <div className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Power size={16} color={autoStart ? "#22C55E" : "var(--text-tertiary)"} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Auto-start with Windows</div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{autoStart ? "Launches on startup" : "Manual launch only"}</div>
                        </div>
                      </div>
                      <label style={{ position: "relative", display: "inline-flex", cursor: "pointer", flexShrink: 0 }}>
                        <input type="checkbox" checked={autoStart}
                          onChange={e => toggleAutoStart(e.target.checked)}
                          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                        <div style={{
                          width: 44, height: 24, borderRadius: 12, padding: 2, cursor: "pointer",
                          background: autoStart ? "#22C55E" : "var(--border-strong)",
                          transition: "background 0.25s ease",
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%", background: "#fff",
                            transform: autoStart ? "translateX(20px)" : "translateX(0)",
                            transition: "transform 0.25s ease", boxShadow: "0 1px 3px rgba(0,0,0,.25)",
                          }} />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Custom Statuses */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Custom Status Options</div>
                <div className="card" style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Add custom statuses that appear in lead status dropdowns alongside the default pipeline stages.</p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input className="fi sm" value={newCustomStatus} onChange={e => setNewCustomStatus(e.target.value)}
                      placeholder="e.g., Awaiting JD, Drive Scheduled..."
                      onKeyDown={e => {
                        if (e.key === "Enter" && newCustomStatus.trim()) {
                          const updated = [...customStatuses, newCustomStatus.trim()];
                          setCustomStatuses(updated); saveCustomStatuses(updated); setNewCustomStatus("");
                        }
                      }}
                      style={{ flex: 1 }} />
                    <button className="btn-p xs" onClick={() => {
                      if (newCustomStatus.trim()) {
                        const updated = [...customStatuses, newCustomStatus.trim()];
                        setCustomStatuses(updated); saveCustomStatuses(updated); setNewCustomStatus("");
                      }
                    }}><Plus size={12} /> Add</button>
                  </div>
                  {customStatuses.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {customStatuses.map((s, i) => (
                        <span key={i} className="chip" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", gap: 6 }}>
                          {s}
                          <button onClick={() => {
                            const updated = customStatuses.filter((_, j) => j !== i);
                            setCustomStatuses(updated); saveCustomStatuses(updated);
                          }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text-tertiary)", display: "flex" }}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {customStatuses.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No custom statuses added yet.</p>}
                </div>
              </div>

              {/* Section: AI Integration */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>AI Integration (Groq)</div>
                <div className="card" style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 8 }}>Get a free API key from <a href="https://console.groq.com" target="_blank" rel="noopener" style={{ color: "var(--info)" }}>console.groq.com</a> to use AI-powered template generation.</p>
                  <input className="fi sm" type="password" value={settings.groqApiKey || ""}
                    onChange={e => saveSettings({ ...settings, groqApiKey: e.target.value })}
                    placeholder="gsk_xxxxxxxxxxxx" />
                </div>
              </div>

              {/* Section: Keyboard Shortcuts */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Keyboard Shortcuts</div>
                <div className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      ["Ctrl + K", "Command palette"],
                      ["Alt + 1-7", "Quick navigate"],
                      ["Escape", "Close overlays"],
                    ].map(function(pair) {
                      return (
                        <div key={pair[0]} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{pair[1]}</span>
                          <kbd style={{ fontSize: 10, padding: "3px 8px", background: "var(--bg-tertiary)", borderRadius: 5, border: "1px solid var(--border-default)", color: "var(--text-tertiary)", fontFamily: "inherit" }}>{pair[0]}</kbd>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Data Summary */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Data Summary</div>
                <div className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["Total Leads", stats.total],
                      ["Active", stats.active],
                      ["Converted", stats.converted],
                      ["Not Converted", stats.notConverted],
                      ["Conversion Rate", stats.conversionRate + "%"],
                      ["Closed", stats.closed],
                      ["Follow-ups", stats.totalFollowUps],
                      ["Overdue", stats.overdue],
                      ["This Week", stats.thisWeek],
                    ].map(function(pair) {
                      return (
                        <div key={pair[0]} style={{ padding: "8px 10px", background: "var(--bg-tertiary)", borderRadius: 8, fontSize: 12 }}>
                          <span style={{ color: "var(--text-tertiary)" }}>{pair[0]}: </span>
                          <strong style={{ color: "var(--text-primary)" }}>{pair[1]}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Sidebar Nav Item -- */
function SidebarItem({ page, active, open, badge, badgeColor, onClick }) {
  var Icon = page.icon;
  return (
    <button
      className={"nav-item" + (active ? " active" : "")}
      onClick={onClick}
      title={!open ? page.label : undefined}
    >
      <Icon size={16} />
      {open && <span style={{ flex: 1 }}>{page.label}</span>}
      {open && badge != null && (
        <span style={{
          minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 9, fontSize: 10, fontWeight: 700,
          background: badgeColor || "#F59E0B", color: "#fff",
          padding: "0 5px",
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}
