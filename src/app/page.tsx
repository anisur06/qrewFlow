"use client";

import {
  EdgeChangeset,
  NodeChangeset,
  addEdge,
  type Connection,
} from "@xyflow/react";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  Download,
  FileUp,
  GitBranch,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FileExplorer from "@/components/FileExplorer";
import InspectorPanel from "@/components/InspectorPanel";
import WorkflowCanvas from "@/components/WorkflowCanvas";
import { deserializeWorkspace, initialWorkspace, serializeWorkspace, validateWorkflow } from "@/lib/workflow";
import type {
  StateFlowNode,
  StateNodeData,
  TransitionData,
  TransitionFlowEdge,
  WorkflowFile,
  WorkflowFolder,
  WorkflowWorkspace,
} from "@/types/workflow";

const STORAGE_KEY = "qrewflow-workspace-v1";
const LEGACY_STORAGE_KEY = "orbit-workflow-workspace-v1";
const THEME_STORAGE_KEY = "qrewflow-theme";

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function newWorkflow(id: string, name: string, folderId: string): WorkflowFile {
  const startId = createId("state");
  const endId = createId("state");
  return {
    id,
    folderId,
    name,
    version: "1.0",
    published: false,
    nodes: [
      {
        id: startId,
        type: "state",
        position: { x: 400, y: 40 },
        data: { label: "Start", key: "start", type: "initial", onEnterEvent: "" },
      },
      {
        id: endId,
        type: "state",
        position: { x: 400, y: 185 },
        data: { label: "Complete", key: "complete", type: "final", onEnterEvent: "" },
      },
    ],
    edges: [
      {
        id: createId("edge"),
        type: "transition",
        source: startId,
        target: endId,
        animated: true,
        data: {
          label: "Continue",
          triggerType: "manual",
          allowedRoles: ["tenant_owner", "office_manager", "staff"],
          event: "",
        },
      },
    ],
  };
}

export default function Home() {
  const [workspace, setWorkspace] = useState<WorkflowWorkspace>(initialWorkspace);
  const [activeWorkflowId, setActiveWorkflowId] = useState(initialWorkspace.workflows[0]?.id ?? "");
  const [selection, setSelection] = useState<{ type: "node" | "edge"; id: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        const initialTheme = savedTheme === "dark" ? "dark" : "light";
        document.documentElement.dataset.theme = initialTheme;
        setTheme(initialTheme);
      } catch (error) {
        console.error("Could not restore the QrewFlow theme preference.", error);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved =
          window.localStorage.getItem(STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          const parsed = deserializeWorkspace(JSON.parse(saved));
          if (parsed.workflows.length) {
            setWorkspace(parsed);
            setActiveWorkflowId(parsed.workflows[0].id);
          }
        }
      } catch (error) {
        console.error("Could not restore the saved workflow workspace.", error);
        setNotice({ kind: "error", text: "Saved workspace could not be loaded. The demo workspace is ready." });
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeWorkspace(workspace)));
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch (error) {
        console.error("Could not save the workflow workspace to browser storage.", error);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [hydrated, workspace]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeWorkflow = workspace.workflows.find((workflow) => workflow.id === activeWorkflowId) ?? workspace.workflows[0];
  const folders = workspace.folders;
  const nodes = activeWorkflow?.nodes ?? [];
  const edges = activeWorkflow?.edges ?? [];
  const selectedNode = selection?.type === "node" ? nodes.find((node) => node.id === selection.id) ?? null : null;
  const selectedEdge = selection?.type === "edge" ? edges.find((edge) => edge.id === selection.id) ?? null : null;
  const activeFolder = folders.find((folder) => folder.id === activeWorkflow?.folderId);

  const updateActiveWorkflow = useCallback((updater: (workflow: WorkflowFile) => WorkflowFile) => {
    setWorkspace((current) => ({
      ...current,
      workflows: current.workflows.map((workflow) =>
        workflow.id === activeWorkflowId ? updater(workflow) : workflow,
      ),
    }));
  }, [activeWorkflowId]);

  const updateNode = useCallback((id: string, data: StateNodeData) => {
    updateActiveWorkflow((workflow) => ({
      ...workflow,
      published: false,
      nodes: workflow.nodes.map((node) => (node.id === id ? { ...node, data } : node)),
    }));
  }, [updateActiveWorkflow]);

  const updateEdgeData = useCallback((id: string, data: TransitionData) => {
    updateActiveWorkflow((workflow) => ({
      ...workflow,
      published: false,
      edges: workflow.edges.map((edge) => (edge.id === id ? { ...edge, data } : edge)),
    }));
  }, [updateActiveWorkflow]);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: StateFlowNode[]; edges: TransitionFlowEdge[] }) => {
      const nextSelection = selectedNodes[0]
        ? { type: "node" as const, id: selectedNodes[0].id }
        : selectedEdges[0]
          ? { type: "edge" as const, id: selectedEdges[0].id }
          : null;
      setSelection((current) =>
        current?.type === nextSelection?.type && current?.id === nextSelection?.id ? current : nextSelection,
      );
    },
    [],
  );

  const handleNodeClick = useCallback((node: StateFlowNode) => {
    setSelection({ type: "node", id: node.id });
  }, []);

  const handleEdgeClick = useCallback((edge: TransitionFlowEdge) => {
    setSelection({ type: "edge", id: edge.id });
  }, []);

  const clearSelection = useCallback(() => setSelection(null), []);

  const onNodesChange = useCallback((changes: NodeChangeset<StateFlowNode>) => {
    updateActiveWorkflow((workflow) => {
      const changeList = changes.toArray();
      const nextNodes = changes.applyTo(workflow.nodes);
      const removedIds = new Set(
        changeList.filter((change) => change.type === "remove").map((change) => change.id),
      );
      return {
        ...workflow,
        published: changeList.some((change) => change.type === "position" || change.type === "remove") ? false : workflow.published,
        nodes: nextNodes,
        edges: removedIds.size
          ? workflow.edges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target))
          : workflow.edges,
      };
    });
  }, [updateActiveWorkflow]);

  const onEdgesChange = useCallback((changes: EdgeChangeset<TransitionFlowEdge>) => {
    const changeList = changes.toArray();
    updateActiveWorkflow((workflow) => ({
      ...workflow,
      published: changeList.some((change) => change.type === "remove") ? false : workflow.published,
      edges: changes.applyTo(workflow.edges),
    }));
  }, [updateActiveWorkflow]);

  const onConnect = useCallback((connection: Connection) => {
    const edge: TransitionFlowEdge = {
      ...connection,
      id: createId("transition"),
      type: "transition",
      animated: true,
      data: {
        label: "New action",
        triggerType: "manual",
        allowedRoles: ["tenant_owner", "office_manager", "staff"],
        event: "",
      },
    };
    updateActiveWorkflow((workflow) => ({
      ...workflow,
      published: false,
      edges: addEdge(edge, workflow.edges),
    }));
    setSelection({ type: "edge", id: edge.id });
  }, [updateActiveWorkflow]);

  const addState = () => {
    if (!activeWorkflow) return;
    const id = createId("state");
    const nextNumber = nodes.length + 1;
    const node: StateFlowNode = {
      id,
      type: "state",
      position: { x: 400, y: 40 + nodes.length * 145 },
      data: { label: "New state", key: `new_state_${nextNumber}`, type: "intermediate", onEnterEvent: "" },
    };
    updateActiveWorkflow((workflow) => ({ ...workflow, published: false, nodes: [...workflow.nodes, node] }));
    setSelection({ type: "node", id });
  };

  const autoLayout = () => {
    updateActiveWorkflow((workflow) => ({
      ...workflow,
      published: false,
      nodes: workflow.nodes.map((node, index) => ({
        ...node,
        position: { x: 400, y: 40 + index * 145 },
      })),
    }));
  };

  const createFolder = (name: string, parentId: string | null) => {
    const folder: WorkflowFolder = { id: createId("folder"), name, parentId };
    setWorkspace((current) => ({ ...current, folders: [...current.folders, folder] }));
    setNotice({ kind: "success", text: `Folder “${name}” created.` });
  };

  const createWorkflow = (name: string, folderId: string) => {
    const workflow = newWorkflow(createId("workflow"), name, folderId);
    setWorkspace((current) => ({ ...current, workflows: [...current.workflows, workflow] }));
    setActiveWorkflowId(workflow.id);
    setSelection(null);
    setNotice({ kind: "success", text: `Workflow “${name}” created.` });
  };

  const renameWorkflow = (id: string, name: string) => {
    setWorkspace((current) => ({
      ...current,
      workflows: current.workflows.map((workflow) =>
        workflow.id === id ? { ...workflow, name, published: false } : workflow,
      ),
    }));
  };

  const duplicateWorkflow = (id: string) => {
    const original = workspace.workflows.find((workflow) => workflow.id === id);
    if (!original) return;
    const workflowId = createId("workflow");
    const idMap = new Map(original.nodes.map((node) => [node.id, createId("state")]));
    const clone: WorkflowFile = {
      ...original,
      id: workflowId,
      name: `${original.name} copy`,
      version: "1.0",
      published: false,
      nodes: original.nodes.map((node) => ({
        ...node,
        id: idMap.get(node.id)!,
        position: { x: node.position.x + 36, y: node.position.y + 36 },
        data: { ...node.data },
      })),
      edges: original.edges.map((edge) => ({
        ...edge,
        id: createId("transition"),
        source: idMap.get(edge.source) ?? edge.source,
        target: idMap.get(edge.target) ?? edge.target,
        data: edge.data ? { ...edge.data, allowedRoles: [...edge.data.allowedRoles] } : edge.data,
      })),
    };
    setWorkspace((current) => ({ ...current, workflows: [...current.workflows, clone] }));
    setActiveWorkflowId(workflowId);
    setSelection(null);
    setNotice({ kind: "success", text: "Workflow duplicated." });
  };

  const deleteWorkflow = (id: string) => {
    const workflow = workspace.workflows.find((item) => item.id === id);
    if (!workflow || !window.confirm(`Delete “${workflow.name}” and all of its states and transitions?`)) return;
    const remaining = workspace.workflows.filter((item) => item.id !== id);
    setWorkspace((current) => ({ ...current, workflows: remaining }));
    if (activeWorkflowId === id) {
      setActiveWorkflowId(remaining[0]?.id ?? "");
      setSelection(null);
    }
    setNotice({ kind: "info", text: `Workflow “${workflow.name}” deleted.` });
  };

  const renameFolder = (id: string, name: string) => {
    setWorkspace((current) => ({
      ...current,
      folders: current.folders.map((folder) => (folder.id === id ? { ...folder, name } : folder)),
    }));
  };

  const deleteFolder = (id: string) => {
    const folder = folders.find((item) => item.id === id);
    if (!folder) return;
    const ids = new Set([id]);
    let foundChild = true;
    while (foundChild) {
      foundChild = false;
      folders.forEach((item) => {
        if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
          ids.add(item.id);
          foundChild = true;
        }
      });
    }
    const removedWorkflows = workspace.workflows.filter((workflow) => ids.has(workflow.folderId));
    if (
      !window.confirm(
        `Delete folder “${folder.name}”${removedWorkflows.length ? ` and ${removedWorkflows.length} workflow file(s)` : ""}?`,
      )
    ) return;
    const remainingWorkflows = workspace.workflows.filter((workflow) => !ids.has(workflow.folderId));
    setWorkspace((current) => ({
      folders: current.folders.filter((item) => !ids.has(item.id)),
      workflows: remainingWorkflows,
    }));
    if (activeWorkflow && ids.has(activeWorkflow.folderId)) {
      setActiveWorkflowId(remainingWorkflows[0]?.id ?? "");
      setSelection(null);
    }
  };

  const saveDraft = () => {
    if (!activeWorkflow) return;
    updateActiveWorkflow((workflow) => ({ ...workflow, published: false }));
    setNotice({ kind: "success", text: "Draft saved to this browser." });
  };

  const validate = () => {
    if (!activeWorkflow) {
      setNotice({ kind: "error", text: "Create or import a workflow before validating." });
      return;
    }
    const issues = validateWorkflow(nodes, edges);
    if (issues.length) {
      setNotice({ kind: "error", text: issues.join(" ") });
    } else {
      setNotice({ kind: "success", text: "Graph is valid — all states are reachable and a final state is defined." });
    }
  };

  const publish = () => {
    if (!activeWorkflow) return;
    const issues = validateWorkflow(nodes, edges);
    if (issues.length) {
      setNotice({ kind: "error", text: `Fix validation issues before publishing. ${issues.join(" ")}` });
      return;
    }
    updateActiveWorkflow((workflow) => ({ ...workflow, published: true }));
    setNotice({ kind: "success", text: `“${activeWorkflow.name}” published as v${activeWorkflow.version}.` });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(serializeWorkspace(workspace), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "qrewflow-workspace.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice({ kind: "success", text: "Workspace JSON exported." });
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error("Could not save the QrewFlow theme preference.", error);
      setNotice({ kind: "error", text: "Theme changed, but the preference could not be saved." });
    }
  };

  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = deserializeWorkspace(JSON.parse(await file.text()));
      if (!parsed.workflows.length) throw new Error("The imported workspace does not contain any workflows.");
      setWorkspace(parsed);
      setActiveWorkflowId(parsed.workflows[0].id);
      setSelection(null);
      setNotice({ kind: "success", text: `Imported ${parsed.workflows.length} workflow file(s).` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The workflow file could not be imported.";
      setNotice({ kind: "error", text: message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const folderPath = useMemo(() => {
    if (!activeFolder) return [];
    const path = [activeFolder.name];
    let parentId = activeFolder.parentId;
    while (parentId) {
      const parent = folders.find((folder) => folder.id === parentId);
      if (!parent) break;
      path.unshift(parent.name);
      parentId = parent.parentId;
    }
    return path;
  }, [activeFolder, folders]);

  return (
    <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-slate-50 text-slate-800">
      <header className="z-20 flex h-[62px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="flex min-w-0 items-center gap-5">
          <a href="#" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-200">
              <Workflow size={17} strokeWidth={2.2} />
            </span>
            <span className="text-[13px] font-bold tracking-tight text-slate-800">QrewFlow</span>
          </a>
          <span className="h-6 w-px bg-slate-200" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <button type="button" className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50">
              <LayoutDashboard size={13} />
              Workflows
              <ChevronDown size={12} />
            </button>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="truncate text-[11px] text-slate-500">{folderPath.join(" / ") || "Workspace"}</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="truncate text-[11px] font-semibold text-slate-800">{activeWorkflow?.name ?? "No workflow selected"}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 sm:flex ${activeWorkflow?.published ? "bg-emerald-50" : "bg-amber-50"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${activeWorkflow?.published ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className={`text-[10px] font-semibold ${activeWorkflow?.published ? "text-emerald-700" : "text-amber-700"}`}>
              {activeWorkflow?.published ? "Published" : "Draft"}
            </span>
            <span className="text-[10px] text-slate-400">v{activeWorkflow?.version ?? "1.0"}</span>
          </div>
          <div className="mx-1 hidden h-5 w-px bg-slate-200 md:block" />
          <button type="button" title="Import workspace JSON" onClick={() => fileInputRef.current?.click()} className="icon-button hidden sm:flex">
            <FileUp size={15} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importJson(event.target.files?.[0])}
          />
          <button type="button" title="Export workspace JSON" onClick={exportJson} className="icon-button hidden sm:flex">
            <Download size={15} />
          </button>
          <button type="button" title="Notifications" className="icon-button hidden sm:flex">
            <Bell size={15} />
          </button>
          <button
            type="button"
            title="Toggle light and dark mode"
            aria-label="Toggle color theme"
            onClick={toggleTheme}
            className="icon-button"
          >
            <Sun size={15} className="theme-icon-light" />
            <Moon size={15} className="theme-icon-dark" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">JD</div>
        </div>
      </header>

      <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <GitBranch size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-slate-800">{activeWorkflow?.name ?? "Choose a workflow"}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-400">
              <Cloud size={10} />
              Saved in this workspace
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={!activeWorkflow}
            onClick={addState}
            className="flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[10px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={13} />
            Add state
          </button>
          <button
            type="button"
            onClick={validate}
            className="hidden h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:flex"
          >
            <ShieldCheck size={13} className="text-slate-400" />
            Validate graph
          </button>
          <button
            type="button"
            disabled={!activeWorkflow}
            onClick={saveDraft}
            className="hidden h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:flex"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={!activeWorkflow}
            onClick={publish}
            className="flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-[10px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Rocket size={12} />
            <span className="hidden sm:inline">Publish workflow</span>
            <span className="sm:hidden">Publish</span>
          </button>
          <button type="button" title="More actions" onClick={exportJson} className="icon-button">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <section className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[220px_minmax(0,1fr)_300px] max-[850px]:grid-cols-[200px_minmax(0,1fr)]">
        <FileExplorer
          folders={workspace.folders}
          workflows={workspace.workflows}
          activeWorkflowId={activeWorkflow?.id ?? ""}
          onSelectWorkflow={(id) => {
            setActiveWorkflowId(id);
            setSelection(null);
          }}
          onCreateFolder={createFolder}
          onCreateWorkflow={createWorkflow}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onRenameWorkflow={renameWorkflow}
          onDuplicateWorkflow={duplicateWorkflow}
          onDeleteWorkflow={deleteWorkflow}
        />
        <div className="relative min-h-0 min-w-0 bg-[#f7f8fb]">
          {activeWorkflow ? (
            <WorkflowCanvas
              key={activeWorkflow.id}
              workflowId={activeWorkflow.id}
              theme={theme}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onSelectionChange={handleSelectionChange}
              onPaneClick={clearSelection}
              onAutoLayout={autoLayout}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <Workflow size={25} />
              </div>
              <h2 className="text-sm font-semibold text-slate-700">Your workspace is ready</h2>
              <p className="mt-1 max-w-xs text-[11px] leading-5 text-slate-400">Create a folder and workflow to start designing a lifecycle.</p>
              <button
                type="button"
                onClick={() => createFolder("My workflows", null)}
                className="mt-4 flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[10px] font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={13} /> Create a folder
              </button>
            </div>
          )}
          {notice && (
            <div className={`absolute bottom-5 left-1/2 z-20 flex max-w-[90%] -translate-x-1/2 items-start gap-2 rounded-lg border px-3 py-2.5 text-[10px] leading-4 shadow-lg ${
              notice.kind === "error" ? "border-rose-200 bg-white text-rose-700" : notice.kind === "success" ? "border-emerald-200 bg-white text-emerald-700" : "border-slate-200 bg-white text-slate-600"
            }`}>
              {notice.kind === "success" ? <Check size={13} className="mt-0.5 shrink-0" /> : <CircleHelp size={13} className="mt-0.5 shrink-0" />}
              <span>{notice.text}</span>
            </div>
          )}
          <div className="pointer-events-none absolute bottom-4 left-4 z-[5] hidden items-center gap-1.5 rounded bg-white/80 px-2 py-1 text-[9px] text-slate-400 sm:flex">
            <Sparkles size={10} /> Changes are saved automatically
          </div>
        </div>
        <div className="max-[850px]:hidden">
          <InspectorPanel
            key={activeWorkflow?.id ?? "empty"}
            workflowName={activeWorkflow?.name ?? "Workflow"}
            nodes={nodes}
            edges={edges}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onStateChange={updateNode}
            onTransitionChange={updateEdgeData}
            onDeleteState={(id) => {
              onNodesChange(new NodeChangeset([{ id, type: "remove" }]));
              setSelection(null);
            }}
            onDeleteEdge={(id) => {
              onEdgesChange(new EdgeChangeset([{ id, type: "remove" }]));
              setSelection(null);
            }}
          />
        </div>
      </section>

      <footer className="flex h-[27px] shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 text-[9px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All systems operational</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{nodes.length} states</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{edges.length} transitions</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">Workflow schema v1</span>
          <button type="button" className="flex items-center gap-1 hover:text-slate-700"><Settings2 size={11} /> Settings</button>
          <button type="button" className="flex items-center gap-1 hover:text-slate-700"><CircleHelp size={11} /> Help</button>
        </div>
      </footer>
    </main>
  );
}
