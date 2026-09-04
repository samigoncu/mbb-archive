import {
  getFilePlans,
  getFilePlanTree,
} from "@/features/classification/api/get-classification";
import { DefinitionsManagerView } from "@/features/classification/components/definitions-manager-view";

export const metadata = { title: "Tanımlamalar · MBB Kurumsal Arşiv" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TanimlamalarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  const plans = await getFilePlans();
  const activePlanId = requestedPlan ?? plans[0]?.id;
  const tree = activePlanId ? await getFilePlanTree(activePlanId) : null;

  return (
    <DefinitionsManagerView
      initialPlans={plans}
      initialTree={tree}
      activeMainTab={typeof requestedTab === "string" ? requestedTab : "genel"}
    />
  );
}
