import { getCurrentUser } from "@/features/access/api/get-current-user";
import { canOperate } from "@/features/retention/model/process-permissions";
import { getLinkedDocuments } from "@/features/documents/api/get-linked-documents";
import { PageHeader } from "@/components/ui/page";
import { getMyWorkItems } from "@/features/workflow/api/get-my-work-items";
import { TaskProcessManager } from "@/features/workflow/components/task-process-manager";

export const metadata = { title: "Görevlerim | MBB Arşiv" };

export default async function GorevlerimPage() {
  const [{ items, error }, user] = await Promise.all([getMyWorkItems(), getCurrentUser()]);
  const linked = await getLinkedDocuments([...new Set(items.map((item) => item.documentId))]);
  const titles = Object.fromEntries(
    linked.map((document) => [document.id, document.details?.title ?? "Belgeye erişilemiyor"]),
  );
  const canAssign = canOperate(user, "workflow.manage");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Görevlerim"
        description="Size atanan işleri, son tarihleri ve yetkiniz kapsamındaki açık iş akışı adımlarını takip edin."
      />

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-card p-6 text-center shadow-xs">
          <p className="text-sm font-semibold text-destructive">Görevler listelenemedi</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      ) : (
        <TaskProcessManager
          items={items}
          titles={titles}
          canAssign={canAssign}
          subject={user?.subject}
        />
      )}
    </div>
  );
}
