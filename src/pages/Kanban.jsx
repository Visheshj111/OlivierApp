import { useState } from "react";
import {
  GripVertical, Building2, Phone, Plus, GraduationCap
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { StatusChip, Dot, SectionHeader, EmptyState } from "../components/Shared";
import {
  PIPELINE_STAGES, CLOSED_STAGES, ALL_STATUSES, STATUS_COLORS,
  getDiff, getActiveDeadline, fmtCTC, fmtDateShort, isClosedStatus
} from "../lib/utils";

export default function Kanban({ onNavigate, onExpandLead }) {
  const { tasks, changeStatus } = useApp();
  const [dragItem, setDragItem] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const columns = [...PIPELINE_STAGES, ...CLOSED_STAGES];

  const getColumnLeads = (status) => {
    return tasks
      .filter(t => t.status === status)
      .sort((a, b) => new Date(getActiveDeadline(a) || "9999") - new Date(getActiveDeadline(b) || "9999"));
  };

  const handleDragStart = (e, taskId) => {
    setDragItem(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("dragging");
  };

  const handleDragEnd = (e) => {
    setDragItem(null);
    setDragOver(null);
    e.currentTarget.classList.remove("dragging");
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(status);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (dragItem) {
      changeStatus(dragItem, status);
    }
    setDragItem(null);
    setDragOver(null);
  };

  if (tasks.length === 0) {
    return (
      <div className="fade-in">
        <SectionHeader title="Pipeline" subtitle="Drag leads between stages to manage your pipeline" />
        <EmptyState
          icon={GripVertical}
          title="No leads in pipeline"
          subtitle="Add leads to start managing your pipeline"
        />
      </div>
    );
  }

  const activeCount = tasks.filter(t => !isClosedStatus(t.status)).length;

  return (
    <div className="fade-in">
      <SectionHeader
        title="Pipeline"
        subtitle={`${tasks.length} contacts · ${activeCount} active`}
        action={
          <button className="btn-p sm" onClick={() => onNavigate("leads")}>
            <Plus size={13} /> New Lead
          </button>
        }
      />

      <div className="kanban-board">
        {columns.map(status => {
          const leads = getColumnLeads(status);
          const sc = STATUS_COLORS[status] || STATUS_COLORS["New"];
          const isDragTarget = dragOver === status;

          return (
            <div key={status}
              className={`kanban-col${isDragTarget ? " drag-over" : ""}`}
              onDragOver={e => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, status)}>

              {/* Column Header */}
              <div className="kanban-col-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Dot color={sc.dot} size={8} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{status}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", background: "var(--bg-tertiary)", padding: "1px 7px", borderRadius: 10 }}>
                    {leads.length}
                  </span>
                </div>
              </div>

              {/* Column Body */}
              <div className="kanban-col-body">
                {leads.length === 0 && (
                  <div style={{ border: "2px dashed var(--border-default)", borderRadius: 8, padding: "20px 12px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
                    {isDragTarget ? "Drop here" : "No leads"}
                  </div>
                )}
                {leads.map(t => {
                  const diff = getDiff(getActiveDeadline(t));
                  const isOverdue = diff < 0 && !isClosedStatus(t.status);
                  return (
                    <div key={t.id}
                      className="kanban-card"
                      draggable
                      onDragStart={e => handleDragStart(e, t.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => { onNavigate("leads"); onExpandLead(t.id); }}
                      style={{ borderLeft: `3px solid ${isOverdue ? "#EF4444" : sc.dot}` }}>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{t.name}</span>
                        <StatusChip status={t.status} small />
                      </div>

                      {t.company && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                          <Building2 size={11} color="var(--text-tertiary)" />
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.company}</span>
                        </div>
                      )}

                      {t.opportunityType && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                          <GraduationCap size={11} color="var(--text-tertiary)" />
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.opportunityType}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {t.ctc && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                              CTC: {fmtCTC(t.ctc)}
                            </span>
                          )}
                          {t.stipend && !t.ctc && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                              Stipend: {t.stipend}
                            </span>
                          )}
                          {isOverdue && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEE2E2", padding: "1px 6px", borderRadius: 4 }}>
                              {Math.abs(diff)}d overdue
                            </span>
                          )}
                        </div>
                        {(t.followUps || []).length > 0 && (
                          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                            {(t.followUps || []).length} FU
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
