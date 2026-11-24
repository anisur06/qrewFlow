"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { LockKeyhole } from "lucide-react";
import { memo } from "react";
import type { TransitionFlowEdge } from "@/types/workflow";

const TransitionEdge = memo(function TransitionEdge(props: EdgeProps<TransitionFlowEdge>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    selected,
    data,
  } = props;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });
  const { setEdges } = useReactFlow();

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: selected ? "#4f7ff0" : "#b8c2d1", strokeWidth: selected ? 2 : 1.5 }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`nodrag nopan pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium shadow-sm transition-colors ${selected ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          onClick={() =>
            setEdges((edges) => edges.map((edge) => ({ ...edge, selected: edge.id === id })))
          }
          aria-label={`Select transition ${data?.label ?? "Continue"}`}
        >
          <span>{data?.label ?? "Continue"}</span>
          <LockKeyhole size={10} className="text-slate-400" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
});

export default TransitionEdge;
