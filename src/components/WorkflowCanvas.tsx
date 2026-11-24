"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChangeset,
  type NodeChangeset,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlignHorizontalDistributeCenter, MousePointer2 } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import StateNode from "@/components/StateNode";
import TransitionEdge from "@/components/TransitionEdge";
import type { StateFlowNode, TransitionFlowEdge } from "@/types/workflow";

const nodeTypes = { state: StateNode };
const edgeTypes = { transition: TransitionEdge };

interface WorkflowCanvasProps {
  workflowId: string;
  theme: "light" | "dark";
  nodes: StateFlowNode[];
  edges: TransitionFlowEdge[];
  onNodesChange: (changes: NodeChangeset<StateFlowNode>) => void;
  onEdgesChange: (changes: EdgeChangeset<TransitionFlowEdge>) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (node: StateFlowNode) => void;
  onEdgeClick: (edge: TransitionFlowEdge) => void;
  onSelectionChange: (selection: { nodes: StateFlowNode[]; edges: TransitionFlowEdge[] }) => void;
  onPaneClick: () => void;
  onAutoLayout: () => void;
}

function CanvasInner(props: WorkflowCanvasProps) {
  const { fitView } = useReactFlow();
  const { onNodeClick, onEdgeClick } = props;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: { top: 76, right: 24, bottom: 34, left: 24 } });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fitView, props.workflowId]);

  const minimapColor = useMemo(
    () => (node: StateFlowNode) => {
      if (node.data.type === "initial") return "#10b981";
      if (node.data.type === "final") return "#8b5cf6";
      return "#3b82f6";
    },
    [],
  );
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: StateFlowNode) => onNodeClick(node),
    [onNodeClick],
  );
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: TransitionFlowEdge) => onEdgeClick(edge),
    [onEdgeClick],
  );

  return (
    <div className="workflow-canvas relative h-full min-h-[480px] w-full">
      <div className="absolute left-5 top-5 z-10 flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <MousePointer2 size={14} />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-700">Workflow canvas</p>
          <p className="text-[10px] text-slate-400">Drag to connect states</p>
        </div>
      </div>
      <div className="absolute right-5 top-5 z-10">
        <button
          type="button"
          onClick={props.onAutoLayout}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
        >
          <AlignHorizontalDistributeCenter size={14} />
          Auto layout
        </button>
      </div>
      <ReactFlow<StateFlowNode, TransitionFlowEdge>
          nodes={props.nodes}
          edges={props.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={props.onNodesChange}
          onEdgesChange={props.onEdgesChange}
          onConnect={props.onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onSelectionChange={props.onSelectionChange}
          onPaneClick={props.onPaneClick}
          forceColorMode={props.theme}
          onlyRenderVisibleElements
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={["Backspace", "Delete"]}
          defaultEdgeOptions={{ type: "transition", animated: true }}
          connectionLineStyle={{ stroke: "#7c9df5", strokeWidth: 2 }}
          className="bg-[#f7f8fb]"
        >
          <Background color="#dce2eb" gap={20} size={1} />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            nodeColor={minimapColor}
            maskColor="rgba(241,245,249,0.72)"
            className="!border !border-slate-200 !bg-white !shadow-sm max-[1100px]:!hidden"
          />
      </ReactFlow>
    </div>
  );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
