"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowRight, CircleHelp, GitBranch, Play, RotateCcw, Trash2, Zap } from "lucide-react";
import type {
  StateFlowNode,
  StateNodeData,
  TransitionFlowEdge,
  TransitionData,
  WorkflowRole,
} from "@/types/workflow";
import { slugify } from "@/lib/workflow";

const backendEvents = [
  "inventory.reserve",
  "notification.send",
  "ledger.release",
  "payment.succeeded",
  "order.shipped",
  "order.received",
];
const roles: WorkflowRole[] = ["tenant_owner", "office_manager", "staff", "guest", "system"];

interface InspectorPanelProps {
  workflowName: string;
  nodes: StateFlowNode[];
  edges: TransitionFlowEdge[];
  selectedNode: StateFlowNode | null;
  selectedEdge: TransitionFlowEdge | null;
  onStateChange: (id: string, data: StateNodeData) => void;
  onTransitionChange: (id: string, data: TransitionData) => void;
  onDeleteState: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-600">
        {label}
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function InspectorPanel({
  workflowName,
  nodes,
  edges,
  selectedNode,
  selectedEdge,
  onStateChange,
  onTransitionChange,
  onDeleteState,
  onDeleteEdge,
}: InspectorPanelProps) {
  const initialNodeId = nodes.find((node) => node.data.type === "initial")?.id ?? "";
  const [currentStateId, setCurrentStateId] = useState(initialNodeId);
  const [simulatedRole, setSimulatedRole] = useState<WorkflowRole>("staff");
  const [logs, setLogs] = useState<string[]>([]);
  const currentState = nodes.find((node) => node.id === currentStateId);
  const availableTransitions = useMemo(
    () =>
      edges.filter(
        (edge) =>
          edge.source === currentStateId &&
          edge.data?.triggerType === "manual" &&
          edge.data.allowedRoles.includes(simulatedRole),
      ),
    [currentStateId, edges, simulatedRole],
  );

  const step = (edge: TransitionFlowEdge) => {
    const target = nodes.find((node) => node.id === edge.target);
    if (!target) return;
    const entries = [
      edge.data?.event ? `→ ${edge.data.event}` : "",
      target.data.onEnterEvent ? `⚡ ${target.data.onEnterEvent}` : "",
    ].filter(Boolean);
    setLogs((current) => [
      ...current,
      `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}  ${edge.data?.label ?? "Continue"}`,
      ...entries.map((entry) => `     ${entry}`),
    ].slice(-100));
    setCurrentStateId(target.id);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex h-[54px] shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
            {selectedNode ? <Activity size={13} /> : selectedEdge ? <GitBranch size={13} /> : <Play size={12} />}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {selectedNode ? "State inspector" : selectedEdge ? "Transition" : "Live preview"}
          </span>
        </div>
        <button type="button" title="Inspector help" className="rounded p-1 text-slate-300 hover:text-slate-500">
          <CircleHelp size={14} />
        </button>
      </div>

      {selectedNode ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-5">
            <p className="text-[13px] font-semibold text-slate-800">{selectedNode.data.label || "Untitled state"}</p>
            <p className="mt-1 text-[10px] text-slate-400">Configure state properties and entry behavior.</p>
          </div>
          <div className="space-y-4">
            <Field label="Label">
              <input
                value={selectedNode.data.label}
                onChange={(event) =>
                  onStateChange(selectedNode.id, {
                    ...selectedNode.data,
                    label: event.target.value,
                    key: event.target.value.trim() ? slugify(event.target.value) : selectedNode.data.key,
                  })
                }
                className={inputClass}
                placeholder="e.g. Preparing Order"
              />
            </Field>
            <Field label="State key" hint="Unique identifier">
              <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5">
                <span className="mr-1 font-mono text-[10px] text-slate-400">key:</span>
                <input
                  value={selectedNode.data.key}
                  onChange={(event) => onStateChange(selectedNode.id, { ...selectedNode.data, key: event.target.value })}
                  className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-slate-700 outline-none"
                />
              </div>
            </Field>
            <Field label="State type">
              <select
                value={selectedNode.data.type}
                onChange={(event) =>
                  onStateChange(selectedNode.id, {
                    ...selectedNode.data,
                    type: event.target.value as StateNodeData["type"],
                  })
                }
                className={inputClass}
              >
                <option value="initial">Initial</option>
                <option value="intermediate">Intermediate</option>
                <option value="final">Final</option>
              </select>
            </Field>
            <Field label="On-enter backend event" hint="Optional">
              <input
                list="backend-events"
                value={selectedNode.data.onEnterEvent}
                onChange={(event) =>
                  onStateChange(selectedNode.id, { ...selectedNode.data, onEnterEvent: event.target.value })
                }
                className={`${inputClass} font-mono`}
                placeholder="e.g. inventory.reserve"
              />
              <datalist id="backend-events">
                {backendEvents.map((event) => <option key={event} value={event} />)}
              </datalist>
            </Field>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => onDeleteState(selectedNode.id)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-rose-200 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 size={13} />
              Delete state
            </button>
          </div>
        </div>
      ) : selectedEdge ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-5">
            <p className="text-[13px] font-semibold text-slate-800">{selectedEdge.data?.label || "Transition"}</p>
            <p className="mt-1 text-[10px] text-slate-400">Control how this transition can be triggered.</p>
          </div>
          <div className="space-y-4">
            <Field label="Action button label">
              <input
                value={selectedEdge.data?.label ?? ""}
                onChange={(event) =>
                  onTransitionChange(selectedEdge.id, { ...selectedEdge.data!, label: event.target.value })
                }
                className={inputClass}
                placeholder="e.g. Ship order"
              />
            </Field>
            <Field label="Trigger type">
              <select
                value={selectedEdge.data?.triggerType ?? "manual"}
                onChange={(event) =>
                  onTransitionChange(selectedEdge.id, {
                    ...selectedEdge.data!,
                    triggerType: event.target.value as TransitionData["triggerType"],
                  })
                }
                className={inputClass}
              >
                <option value="manual">Manual user action</option>
                <option value="webhook">System webhook</option>
              </select>
            </Field>
            <Field label="Allowed roles" hint="Who can trigger this?">
              <div className="space-y-0.5 rounded-md border border-slate-200 p-2">
                {roles.map((role) => {
                  const checked = selectedEdge.data?.allowedRoles.includes(role) ?? false;
                  return (
                    <label key={role} className="flex h-7 cursor-pointer items-center gap-2 rounded px-1.5 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const currentRoles = selectedEdge.data?.allowedRoles ?? [];
                          onTransitionChange(selectedEdge.id, {
                            ...selectedEdge.data!,
                            allowedRoles: checked
                              ? currentRoles.filter((item) => item !== role)
                              : [...currentRoles, role],
                          });
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-mono text-[10px] text-slate-600">{role}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Backend transition event" hint="Optional">
              <input
                list="backend-events"
                value={selectedEdge.data?.event ?? ""}
                onChange={(event) =>
                  onTransitionChange(selectedEdge.id, { ...selectedEdge.data!, event: event.target.value })
                }
                className={`${inputClass} font-mono`}
                placeholder="e.g. order.shipped"
              />
            </Field>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => onDeleteEdge(selectedEdge.id)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-rose-200 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 size={13} />
              Delete transition
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-100 p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[12px] font-semibold text-slate-800">Try your workflow</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">{workflowName} · Simulated run</p>
              </div>
              <button
                type="button"
                title="Reset simulation"
                onClick={() => {
                  setCurrentStateId(nodes.find((node) => node.data.type === "initial")?.id ?? "");
                  setLogs([]);
                }}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <RotateCcw size={13} />
              </button>
            </div>
            <Field label="Simulate as">
              <select
                value={simulatedRole}
                onChange={(event) => setSimulatedRole(event.target.value as WorkflowRole)}
                className={inputClass}
              >
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </Field>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {currentState ? (
              <>
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-blue-500">Current state</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-800">{currentState.data.label}</p>
                  <p className="mt-0.5 font-mono text-[9px] text-slate-400">{currentState.data.key}</p>
                </div>
                {currentState.data.type === "final" ? (
                  <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center text-[10px] font-medium text-emerald-700">
                    Workflow completed successfully.
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Available actions</p>
                    <div className="space-y-2">
                      {availableTransitions.map((edge) => (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => step(edge)}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
                        >
                          <span>
                            <span className="block text-[11px] font-semibold text-slate-700">{edge.data?.label ?? "Continue"}</span>
                            <span className="mt-0.5 block text-[9px] text-slate-400">
                              {edge.data?.event || "No backend event"}
                            </span>
                          </span>
                          <ArrowRight size={14} className="text-slate-400" />
                        </button>
                      ))}
                      {availableTransitions.length === 0 && (
                        <p className="rounded-md bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500">
                          No manual actions are available for this role in the current state.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-[10px] leading-4 text-amber-700">
                Add an initial state to start the simulation.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-amber-500" />
                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">Event console</span>
              </div>
              <span className="text-[9px] text-slate-400">{logs.length} entries</span>
            </div>
            <div className="max-h-32 min-h-12 overflow-y-auto px-4 pb-3">
              {logs.length ? (
                <div className="space-y-1 font-mono text-[9px] leading-4 text-slate-500">
                  {logs.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
                </div>
              ) : (
                <p className="font-mono text-[9px] text-slate-400">Waiting for an action…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
