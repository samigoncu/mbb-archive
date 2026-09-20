import { describe, expect, it } from "vitest";
import { selectArchiveUnit } from "./archive-unit-selection";
import type { ArchiveUnit } from "./dossier";
const root: ArchiveUnit = { id:"own", name:"Birim", path:"/own/", parentId:null, isPrimary:true, isActive:true, canManageDocuments:true, canManagePhysical:false };
const child = {...root, id:"child", path:"/own/child/", parentId:"own", isPrimary:false};
describe("archive unit selection", () => {
  it("defaults to the primary membership and permits an authorized child", () => {
    expect(selectArchiveUnit([child,root])?.id).toBe("own");
    expect(selectArchiveUnit([root,child],"child")?.id).toBe("child");
  });
  it("does not replace a forged unit with an authorized default", () => {
    expect(selectArchiveUnit([root,child],"other")).toBeUndefined();
    expect(selectArchiveUnit([])).toBeUndefined();
  });
  it("uses a visible root when no primary membership is available", () => {
    expect(selectArchiveUnit([child,{...root,isPrimary:false}])?.id).toBe("own");
  });
});
