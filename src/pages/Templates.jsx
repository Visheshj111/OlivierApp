import { useState, useMemo } from "react";
import {
  FileText, Mail, MessageCircle, Phone, Plus, Pencil,
  Trash2, Copy, Check, X, Search, ChevronDown, Sparkles, Loader2
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { SectionHeader, EmptyState, ConfirmModal } from "../components/Shared";
import { fillTemplate, DEFAULT_TEMPLATES } from "../lib/utils";

const CATEGORIES = ["All", "Email", "WhatsApp", "Call Script", "SMS"];
const CAT_ICONS = {
  "Email": <Mail size={14} />,
  "WhatsApp": <MessageCircle size={14} />,
  "Call Script": <Phone size={14} />,
  "SMS": <FileText size={14} />,
};
const CAT_COLORS = {
  "Email": { bg: "#EFF6FF", color: "#1D4ED8" },
  "WhatsApp": { bg: "#F0FDF4", color: "#16A34A" },
  "Call Script": { bg: "#FFF7ED", color: "#EA580C" },
  "SMS": { bg: "#F5F3FF", color: "#7C3AED" },
};

export default function Templates() {
  const { tasks, templates, saveTemplates, settings } = useApp();
  const [category, setCategory] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "Email", body: "" });
  const [previewLead, setPreviewLead] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const filtered = useMemo(() => {
    let list = templates;
    if (category !== "All") list = list.filter(t => t.category === category);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q));
    }
    return list;
  }, [templates, category, searchQ]);

  const handleSave = () => {
    if (!form.name || !form.body) return;
    if (editId !== null) {
      saveTemplates(templates.map(t => t.id === editId ? { ...t, ...form } : t));
      setEditId(null);
    } else {
      saveTemplates([...templates, { ...form, id: Date.now() }]);
    }
    setForm({ name: "", category: "Email", body: "" });
    setShowForm(false);
  };

  const startEdit = (t) => {
    setForm({ name: t.name, category: t.category, body: t.body });
    setEditId(t.id);
    setShowForm(true);
  };

  const handleDelete = () => {
    saveTemplates(templates.filter(t => t.id !== deleteId));
    setDeleteId(null);
  };

  const handleCopy = (template) => {
    const text = previewLead ? fillTemplate(template.body, previewLead) : template.body;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const generateWithAI = async () => {
    if (!settings?.groqApiKey) { setAiError("Add your Groq API key in Settings first."); return; }
    if (!aiPrompt.trim()) { setAiError("Describe the template you want."); return; }
    setAiLoading(true); setAiError("");
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.groqApiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are an expert placement cell coordinator. Generate professional outreach templates for contacting HRs, campus recruiters, and talent acquisition teams. Use these variables where appropriate: {{name}}, {{company}}, {{role}}, {{ctc}}, {{stipend}}, {{opportunityType}}, {{courses}}. Keep it concise and professional. Return ONLY the template body text, no extra commentary." },
            { role: "user", content: `Generate a ${form.category} template for: ${aiPrompt}` }
          ],
          temperature: 0.7, max_tokens: 500
        })
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `API error ${res.status}`); }
      const data = await res.json();
      const body = data.choices?.[0]?.message?.content?.trim();
      if (body) setForm(f => ({ ...f, body }));
    } catch (e) {
      setAiError(e.message || "Failed to generate. Check API key.");
    } finally {
      setAiLoading(false);
    }
  };

  const resetTemplates = () => {
    saveTemplates(DEFAULT_TEMPLATES);
  };

  return (
    <div className="fade-in">
      <SectionHeader
        title="Templates"
        subtitle="Quick message templates for outreach"
        action={
          <button className="btn-p sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: "", category: "Email", body: "" }); }}>
            {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> New Template</>}
          </button>
        }
      />

      {/* ── Form ── */}
      {showForm && (
        <div className="card anim" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{editId ? "Edit Template" : "New Template"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Template name" className="fi" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="fi">
              {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Template body. Use {{name}}, {{company}}, {{ctc}}, {{stipend}}, {{role}}, {{opportunityType}}, {{courses}} as variables..."
            rows={5} className="fi" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 12 }}>
            Variables: {"{{name}}"}, {"{{company}}"}, {"{{contact}}"}, {"{{email}}"}, {"{{role}}"}, {"{{ctc}}"}, {"{{stipend}}"}, {"{{opportunityType}}"}, {"{{courses}}"}, {"{{date}}"}, {"{{status}}"}
          </div>

          {/* AI Generation */}
          <div style={{ padding: "12px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border-default)", borderRadius: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Sparkles size={14} color="#8B5CF6" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Generate with AI</span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>Powered by Groq</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={aiPrompt} onChange={e => { setAiPrompt(e.target.value); setAiError(""); }}
                placeholder={`e.g. "Follow-up email for campus recruitment drive"`}
                className="fi" style={{ flex: 1, marginBottom: 0 }} />
              <button className="btn-p sm" onClick={generateWithAI} disabled={aiLoading} style={{ whiteSpace: "nowrap" }}>
                {aiLoading ? <><Loader2 size={13} className="spin" /> Generating...</> : <><Sparkles size={13} /> Generate</>}
              </button>
            </div>
            {aiError && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 6 }}>{aiError}</div>}
            {!settings?.groqApiKey && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>Add your free Groq API key in Settings → AI Integration</div>}
          </div>

          <button className="btn-p sm" onClick={handleSave} disabled={!form.name || !form.body}>
            <Check size={13} /> {editId ? "Update" : "Save"} Template
          </button>
        </div>
      )}

      {/* ── Preview Lead Selector ── */}
      {tasks.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "var(--bg-tertiary)", borderRadius: 10, border: "1px solid var(--border-default)" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Preview with contact:</span>
          <select value={previewLead?.id || ""} onChange={e => {
            const lead = tasks.find(t => t.id === Number(e.target.value));
            setPreviewLead(lead || null);
          }} className="fi sm" style={{ width: "auto", minWidth: 180 }}>
            <option value="">Select a lead...</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.name}{t.company ? ` @ ${t.company}` : ""}</option>)}
          </select>
          {previewLead && <span style={{ fontSize: 12, color: "#22C55E", fontWeight: 500 }}>✓ Previewing as {previewLead.name}</span>}
        </div>
      )}

      {/* ── Category Tabs ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {CATEGORIES.map(c => (
          <button key={c} className={`filter-tab${category === c ? " active" : ""}`}
            onClick={() => setCategory(c)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {c !== "All" && CAT_ICONS[c]}
            <span>{c}</span>
          </button>
        ))}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search templates..." className="fi sm" style={{ paddingLeft: 32, width: 200 }} />
        </div>
      </div>

      {/* ── Templates Grid ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates found"
          subtitle={templates.length === 0 ? "Create your first template or restore defaults" : "Try a different category or search"}
          action={templates.length === 0 && <button className="btn-o" onClick={resetTemplates}>Restore Defaults</button>}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map(t => {
            const catColor = CAT_COLORS[t.category] || CAT_COLORS["Email"];
            const displayBody = previewLead ? fillTemplate(t.body, previewLead) : t.body;
            return (
              <div key={t.id} className="card" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="chip" style={{ background: catColor.bg, color: catColor.color }}>
                      {CAT_ICONS[t.category]} {t.category}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{t.name}</span>
                  </div>
                </div>

                <div style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 8, border: "1px solid var(--border-light)", marginBottom: 12 }}>
                  {displayBody}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-o xs" onClick={() => handleCopy(t)}>
                    {copiedId === t.id ? <><Check size={11} color="#22C55E" /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </button>
                  <button className="btn-o xs" onClick={() => startEdit(t)}><Pencil size={11} /> Edit</button>
                  <button className="btn-o xs danger" onClick={() => setDeleteId(t.id)}><Trash2 size={11} /> Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reset Button ── */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button className="btn-o sm" onClick={resetTemplates}>
          Restore Default Templates
        </button>
      </div>

      {/* Delete Confirm */}
      {deleteId && (
        <ConfirmModal
          title="Delete Template?"
          message="This template will be permanently removed."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
