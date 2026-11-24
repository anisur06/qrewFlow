import type { Edge, Node } from "@xyflow/react";

export type StateType = "initial" | "intermediate" | "final";
export type TriggerType = "manual" | "webhook";
export type WorkflowRole =
  | "tenant_owner"
  | "office_manager"
  | "staff"
  | "guest"
  | "system";

export interface StateNodeData extends Record<string, unknown> {
  label: string;
  key: string;
  type: StateType;
  onEnterEvent: string;
}

export interface TransitionData extends Record<string, unknown> {
  label: string;
  triggerType: TriggerType;
  allowedRoles: WorkflowRole[];
  event: string;
}

export type StateFlowNode = Node<StateNodeData, "state">;
export type TransitionFlowEdge = Edge<TransitionData, "transition">;

export interface WorkflowFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface WorkflowFile {
  id: string;
  folderId: string;
  name: string;
  version: string;
  published: boolean;
  nodes: StateFlowNode[];
  edges: TransitionFlowEdge[];
}

export interface WorkflowWorkspace {
  folders: WorkflowFolder[];
  workflows: WorkflowFile[];
}

export interface WorkflowDatabaseExport {
  schema_version: 1;
  workflow_folders: Array<{
    id: string;
    name: string;
    parent_id: string | null;
  }>;
  workflows: Array<{
    id: string;
    folder_id: string;
    name: string;
    version: string;
    status: "draft" | "published";
  }>;
  workflow_states: Array<{
    id: string;
    workflow_id: string;
    label: string;
    key: string;
    type: StateType;
    on_enter_event: string | null;
    position: { x: number; y: number };
  }>;
  workflow_transitions: Array<{
    id: string;
    workflow_id: string;
    source_state_id: string;
    target_state_id: string;
    action_label: string;
    trigger_type: TriggerType;
    allowed_roles: WorkflowRole[];
    backend_event: string | null;
  }>;
}
