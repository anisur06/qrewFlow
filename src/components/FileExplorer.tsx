"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FileJson2,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Workflow,
} from "lucide-react";
import type { WorkflowFile, WorkflowFolder } from "@/types/workflow";

interface FileExplorerProps {
  folders: WorkflowFolder[];
  workflows: WorkflowFile[];
  activeWorkflowId: string;
  onSelectWorkflow: (id: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onCreateWorkflow: (name: string, folderId: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameWorkflow: (id: string, name: string) => void;
  onDuplicateWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
}

export default function FileExplorer({
  folders,
  workflows,
  activeWorkflowId,
  onSelectWorkflow,
  onCreateFolder,
  onCreateWorkflow,
  onRenameFolder,
  onDeleteFolder,
  onRenameWorkflow,
  onDuplicateWorkflow,
  onDeleteWorkflow,
}: FileExplorerProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((folder) => folder.id)));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleWorkflowIds = useMemo(
    () =>
      new Set(
        workflows
          .filter((workflow) => workflow.name.toLowerCase().includes(normalizedQuery))
          .map((workflow) => workflow.id),
      ),
    [normalizedQuery, workflows],
  );
  const visibleFolderIds = useMemo(() => {
    if (!normalizedQuery) return new Set(folders.map((folder) => folder.id));
    const visible = new Set<string>();
    folders.forEach((folder) => {
      if (folder.name.toLowerCase().includes(normalizedQuery)) visible.add(folder.id);
      if (workflows.some((workflow) => workflow.folderId === folder.id && visibleWorkflowIds.has(workflow.id))) {
        visible.add(folder.id);
        let parent = folders.find((item) => item.id === folder.parentId);
        while (parent) {
          visible.add(parent.id);
          parent = folders.find((item) => item.id === parent?.parentId);
        }
      }
    });
    return visible;
  }, [folders, normalizedQuery, visibleWorkflowIds, workflows]);

  const askName = (label: string, current = "") => {
    const value = window.prompt(label, current)?.trim();
    return value || null;
  };

  const toggleFolder = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderFolder = (folder: WorkflowFolder, depth = 0) => {
    if (!visibleFolderIds.has(folder.id)) return null;
    const children = folders.filter((item) => item.parentId === folder.id);
    const folderWorkflows = workflows.filter(
      (workflow) => workflow.folderId === folder.id && visibleWorkflowIds.has(workflow.id),
    );
    const isExpanded = normalizedQuery.length > 0 || expanded.has(folder.id);
    const FolderIcon = isExpanded ? FolderOpen : Folder;

    return (
      <div key={folder.id}>
        <div className="group flex h-8 items-center gap-1 rounded-md pr-1 hover:bg-slate-100/80" style={{ paddingLeft: `${depth * 14 + 4}px` }}>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            onClick={() => toggleFolder(folder.id)}
          >
            {isExpanded ? <ChevronDown size={13} className="shrink-0 text-slate-400" /> : <ChevronRight size={13} className="shrink-0 text-slate-400" />}
            <FolderIcon size={14} className="shrink-0 text-amber-500" />
            <span className="truncate text-[11px] font-semibold text-slate-700">{folder.name}</span>
          </button>
          <button
            type="button"
            title="Create folder inside"
            className="hidden rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600 group-hover:block"
            onClick={() => {
              const name = askName("New folder name");
              if (name) onCreateFolder(name, folder.id);
            }}
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            title="Create workflow in folder"
            className="hidden rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600 group-hover:block"
            onClick={() => {
              const name = askName("New workflow name");
              if (name) onCreateWorkflow(name, folder.id);
            }}
          >
            <FileJson2 size={12} />
          </button>
          <button
            type="button"
            title="Folder actions"
            className="hidden rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 group-hover:block"
            onClick={() => {
              const action = window.prompt("Folder action: rename or delete", "rename");
              if (action?.toLowerCase() === "rename") {
                const name = askName("Rename folder", folder.name);
                if (name) onRenameFolder(folder.id, name);
              } else if (action?.toLowerCase() === "delete") {
                onDeleteFolder(folder.id);
              }
            }}
          >
            <MoreHorizontal size={13} />
          </button>
        </div>
        {isExpanded && (
          <div>
            {folderWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`group flex h-8 items-center gap-1 rounded-md pr-1 ${activeWorkflowId === workflow.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100/80"}`}
                style={{ paddingLeft: `${(depth + 1) * 14 + 17}px` }}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => onSelectWorkflow(workflow.id)}
                >
                  <FileJson2 size={13} className={activeWorkflowId === workflow.id ? "shrink-0 text-blue-500" : "shrink-0 text-slate-400"} />
                  <span className="truncate text-[11px] font-medium">{workflow.name}</span>
                  {workflow.published && <span className="ml-auto mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                </button>
                <div className="hidden items-center gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    title="Rename workflow"
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600"
                    onClick={() => {
                      const name = askName("Rename workflow", workflow.name);
                      if (name) onRenameWorkflow(workflow.id, name);
                    }}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    title="Duplicate workflow"
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600"
                    onClick={() => onDuplicateWorkflow(workflow.id)}
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    type="button"
                    title="Delete workflow"
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                    onClick={() => onDeleteWorkflow(workflow.id)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
            {children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-[54px] shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <div className="flex items-center gap-2">
          <Workflow size={15} className="text-blue-600" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Explorer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Create new folder"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={() => {
              const name = askName("New folder name");
              if (name) onCreateFolder(name, null);
            }}
          >
            <Folder size={14} />
          </button>
          <button
            type="button"
            title="Create new workflow file"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
            onClick={() => {
              const folderId = folders[0]?.id;
              if (!folderId) return;
              const name = askName("New workflow name");
              if (name) onCreateWorkflow(name, folderId);
            }}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="px-3 pt-3">
        <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 focus-within:border-blue-300 focus-within:bg-white">
          <Search size={13} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workflows..."
            className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-400"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="text-[10px] text-slate-400 hover:text-slate-700">
              Clear
            </button>
          )}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-4">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Workspace</span>
          <button
            type="button"
            onClick={() => {
              const name = askName("New workflow name");
              const folderId = folders[0]?.id;
              if (name && folderId) onCreateWorkflow(name, folderId);
            }}
            className="text-[10px] font-medium text-blue-600 hover:text-blue-700"
          >
            New flow
          </button>
        </div>
        {folders.filter((folder) => folder.parentId === null).map((folder) => renderFolder(folder))}
        {folders.length === 0 && (
          <div className="px-3 py-8 text-center text-[11px] text-slate-400">
            <Folder size={18} className="mx-auto mb-2 text-slate-300" />
            No folders yet
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-600">Workspace storage</span>
            <span className="text-[9px] font-medium text-emerald-600">Synced locally</span>
          </div>
          <p className="mt-1 text-[9px] leading-4 text-slate-400">{workflows.length} workflow files · Browser storage</p>
        </div>
      </div>
    </aside>
  );
}
