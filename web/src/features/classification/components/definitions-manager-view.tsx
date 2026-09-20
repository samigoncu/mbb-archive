import { PageHeader } from "@/components/ui/page";
import { FilePlanManager } from "./file-plan-manager";
import type { FilePlanListItem, FilePlanTree } from "../model/classification";
export function DefinitionsManagerView({
  initialPlans,
  initialTree,
}: {
  initialPlans: FilePlanListItem[];
  initialTree: FilePlanTree | null;
  activeMainTab?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dosya planları"
        description="Standart Dosya Planı başlıklarını, kodlarını ve geçerlilik dönemlerini yönetin."
      />
      <FilePlanManager
        key={initialTree?.id ?? "empty"}
        initialPlans={initialPlans}
        initialTree={initialTree}
      />
    </div>
  );
}
