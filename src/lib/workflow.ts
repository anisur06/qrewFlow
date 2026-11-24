import type {
  StateFlowNode,
  StateType,
  TransitionFlowEdge,
  WorkflowDatabaseExport,
  WorkflowWorkspace,
} from "@/types/workflow";

const state = (
  id: string,
  label: string,
  key: string,
  type: StateType,
  x: number,
  y: number,
  onEnterEvent = "",
): StateFlowNode => ({
  id,
  type: "state",
  position: { x, y },
  data: { label, key, type, onEnterEvent },
});

const transition = (
  id: string,
  source: string,
  target: string,
  label: string,
  event: string,
): TransitionFlowEdge => ({
  id,
  type: "transition",
  source,
  target,
  animated: true,
  data: {
    label,
    triggerType: "manual",
    allowedRoles: ["tenant_owner", "office_manager", "staff"],
    event,
  },
});

export const initialWorkspace: WorkflowWorkspace = {
  folders: [{ id: "folder-ecommerce", name: "E-Commerce", parentId: null }],
  workflows: [
    {
      id: "workflow-purchase",
      folderId: "folder-ecommerce",
      name: "Purchase Lifecycle",
      version: "1.0",
      published: false,
      nodes: [
        state("cart", "Add to Cart", "add_to_cart", "initial", 400, 40, "cart.created"),
        state("payment", "Proceed to Pay", "proceed_to_pay", "intermediate", 400, 185),
        state("checkout", "Make Payment", "make_payment", "intermediate", 400, 330, "payment.intent_created"),
        state("preparing", "Preparing Order", "preparing_order", "intermediate", 400, 475, "inventory.reserve"),
        state("shipping", "Shipping", "shipping", "intermediate", 400, 620, "order.fulfillment_started"),
        state("received", "Received", "received", "final", 400, 765, "order.completed"),
      ],
      edges: [
        transition("edge-cart-payment", "cart", "payment", "Proceed to Pay", "checkout.started"),
        transition("edge-payment-checkout", "payment", "checkout", "Continue", "payment.started"),
        transition("edge-checkout-preparing", "checkout", "preparing", "Confirm payment", "payment.succeeded"),
        transition("edge-preparing-shipping", "preparing", "shipping", "Mark as shipped", "order.shipped"),
        transition("edge-shipping-received", "shipping", "received", "Confirm delivery", "order.received"),
      ],
    },
  ],
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function validateWorkflow(nodes: StateFlowNode[], edges: TransitionFlowEdge[]) {
  const issues: string[] = [];
  const initials = nodes.filter((node) => node.data.type === "initial");
  const finals = nodes.filter((node) => node.data.type === "final");

  if (initials.length === 0) issues.push("Add an initial state to define where the workflow begins.");
  if (initials.length > 1) issues.push("A workflow can only have one initial state.");
  if (finals.length === 0) issues.push("Add a final state to define where the workflow ends.");

  const connected = new Set<string>();
  edges.forEach((edge) => {
    connected.add(edge.source);
    connected.add(edge.target);
  });
  const orphaned = nodes.filter((node) => !connected.has(node.id));
  if (orphaned.length) {
    issues.push(
      `${orphaned.length} state${orphaned.length === 1 ? "" : "s"} ${orphaned.length === 1 ? "is" : "are"} not connected to any transition.`,
    );
  }

  if (initials.length === 1) {
    const reachable = new Set<string>([initials[0].id]);
    const queue = [initials[0].id];
    while (queue.length) {
      const current = queue.shift();
      edges
        .filter((edge) => edge.source === current)
        .forEach((edge) => {
          if (!reachable.has(edge.target)) {
            reachable.add(edge.target);
            queue.push(edge.target);
          }
        });
    }
    const unreachable = nodes.filter((node) => !reachable.has(node.id));
    if (unreachable.length) {
      issues.push(
        `${unreachable.length} state${unreachable.length === 1 ? "" : "s"} cannot be reached from the initial state.`,
      );
    }
  }

  return issues;
}

export function serializeWorkspace(workspace: WorkflowWorkspace): WorkflowDatabaseExport {
  return {
    schema_version: 1,
    workflow_folders: workspace.folders.map(({ id, name, parentId }) => ({
      id,
      name,
      parent_id: parentId,
    })),
    workflows: workspace.workflows.map((workflow) => ({
      id: workflow.id,
      folder_id: workflow.folderId,
      name: workflow.name,
      version: workflow.version,
      status: workflow.published ? "published" : "draft",
    })),
    workflow_states: workspace.workflows.flatMap((workflow) =>
      workflow.nodes.map((node) => ({
        id: node.id,
        workflow_id: workflow.id,
        label: node.data.label,
        key: node.data.key,
        type: node.data.type,
        on_enter_event: node.data.onEnterEvent || null,
        position: node.position,
      })),
    ),
    workflow_transitions: workspace.workflows.flatMap((workflow) =>
      workflow.edges.map((edge) => ({
        id: edge.id,
        workflow_id: workflow.id,
        source_state_id: edge.source,
        target_state_id: edge.target,
        action_label: edge.data?.label ?? "Continue",
        trigger_type: edge.data?.triggerType ?? "manual",
        allowed_roles: edge.data?.allowedRoles ?? [],
        backend_event: edge.data?.event || null,
      })),
    ),
  };
}

export function deserializeWorkspace(value: unknown): WorkflowWorkspace {
  if (!value || typeof value !== "object") throw new Error("The selected file is not a valid workflow export.");
  const data = value as Partial<WorkflowDatabaseExport>;
  if (
    data.schema_version !== 1 ||
    !Array.isArray(data.workflow_folders) ||
    !Array.isArray(data.workflows) ||
    !Array.isArray(data.workflow_states) ||
    !Array.isArray(data.workflow_transitions)
  ) {
    throw new Error("This file does not use a supported workflow export format.");
  }
  const workflowStates = data.workflow_states!;
  const workflowTransitions = data.workflow_transitions!;

  return {
    folders: data.workflow_folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parent_id,
    })),
    workflows: data.workflows.map((workflow) => ({
      id: workflow.id,
      folderId: workflow.folder_id,
      name: workflow.name,
      version: workflow.version,
      published: workflow.status === "published",
      nodes: workflowStates
        .filter((node) => node.workflow_id === workflow.id)
        .map((node) => ({
          id: node.id,
          type: "state" as const,
          position: node.position,
          data: {
            label: node.label,
            key: node.key,
            type: node.type,
            onEnterEvent: node.on_enter_event ?? "",
          },
        })),
      edges: workflowTransitions
        .filter((edge) => edge.workflow_id === workflow.id)
        .map((edge) => ({
          id: edge.id,
          type: "transition" as const,
          source: edge.source_state_id,
          target: edge.target_state_id,
          animated: true,
          data: {
            label: edge.action_label,
            triggerType: edge.trigger_type,
            allowedRoles: edge.allowed_roles,
            event: edge.backend_event ?? "",
          },
        })),
    })),
  };
}
