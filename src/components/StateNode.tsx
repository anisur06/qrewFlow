"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Circle, Flag, Zap } from "lucide-react";
import { memo } from "react";
import type { StateFlowNode } from "@/types/workflow";

const stateStyles = {
  initial: {
    frame: "border-emerald-400",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    icon: Circle,
    label: "Initial",
  },
  intermediate: {
    frame: "border-blue-400",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700",
    icon: Circle,
    label: "Intermediate",
  },
  final: {
    frame: "border-violet-400",
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700",
    icon: Flag,
    label: "Final",
  },
};

const StateNode = memo(function StateNode({ data, selected }: NodeProps<StateFlowNode>) {
  const style = stateStyles[data.type];
  const Icon = style.icon;

  return (
    <div
      data-state-type={data.type}
      className={`state-node w-[250px] overflow-visible rounded-xl border-2 shadow-[0_8px_22px_rgba(20,35,60,0.13)] transition-all ${style.frame} ${selected ? "ring-[3px] ring-blue-500 ring-offset-2" : ""}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 rounded-t-[10px] ${style.dot}`} />
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-white !bg-slate-500" />
      <div className="flex justify-end px-3.5 pt-2.5">
        <span className={`shrink-0 rounded-md border border-current/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${style.badge}`}>
          {style.label}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 px-3.5 pt-1.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.badge}`}>
          {data.type === "initial" ? <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} /> : <Icon size={16} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-5 text-slate-800">{data.label || "Untitled state"}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{data.key || "state_key"}</p>
        </div>
      </div>
      <div className="mx-3.5 mt-3 flex min-h-9 items-center gap-2 border-t border-slate-200 py-2">
        {data.onEnterEvent ? (
          <>
            <Zap size={13} className="shrink-0 text-amber-500" />
            <span className="truncate font-mono text-[11px] font-medium text-slate-600">{data.onEnterEvent}</span>
          </>
        ) : (
          <>
            <Check size={13} className="text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500">No enter event</span>
          </>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-white !bg-slate-500" />
    </div>
  );
});

export default StateNode;
