"use client";

import { TaskProcessManager } from "./task-process-manager";
import type { WorkflowWorkItem } from "@/features/workflow/model/workflow";

export function WorkItemList({
  items,
  titles = {},
  canAssign = false,
  subject = "",
}: {
  items: WorkflowWorkItem[];
  titles?: Record<string, string>;
  canAssign?: boolean;
  subject?: string;
}) {
  return (
    <TaskProcessManager
      items={items}
      titles={titles}
      canAssign={canAssign}
      subject={subject}
    />
  );
}
