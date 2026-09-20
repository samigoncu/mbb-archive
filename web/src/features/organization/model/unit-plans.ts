export type UnitPlanAssignment = { unitId: string; planId: string; itemId: string; code: string; title: string; version: string };
export type UnitPlanDetails = { unitId: string; revision: number; items: UnitPlanAssignment[] };
export type OrganizationUnit = { id: string; code: string; name: string; shortName: string | null; parentId: string | null; path: string; isActive: boolean; memberCount: number; typeCode?: string | null; typeName?: string | null };
export type UnitMember = { id: string; subjectId: string; unitId: string; isPrimary: boolean; source: string };
