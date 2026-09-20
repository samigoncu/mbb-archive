"use server";

import {
  getFilePlans,
  getFilePlanTree,
} from "@/features/classification/api/get-classification";
import { getRetentionRules } from "@/features/retention/api/get-retention";
import type { FilePlanNode } from "@/features/classification/model/classification";
import type { RetentionRuleListItem } from "@/features/retention/model/retention";

export type DeclarationOptions = {
  filePlanItems: FilePlanNode[];
  retentionRules: RetentionRuleListItem[];
};

export async function getDeclarationOptionsAction(): Promise<DeclarationOptions> {
  try {
    const plans = await getFilePlans();
    const trees = await Promise.all(plans.map((plan) => getFilePlanTree(plan.id)));

    const filePlanItems = trees
      .flatMap((tree) => tree?.items ?? [])
      .filter((item) => item.isSelectable && item.isActive)
      .sort((a, b) => a.code.localeCompare(b.code, "tr"));

    const retentionRules = await getRetentionRules().catch(() => []);

    return {
      filePlanItems,
      retentionRules,
    };
  } catch {
    return {
      filePlanItems: [],
      retentionRules: [],
    };
  }
}

