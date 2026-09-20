import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PermissionEditor } from "./permission-editor";
vi.mock("../api/administration-actions", () => ({ accessAdministrationAction: vi.fn() }));
vi.mock("@/components/action-form", () => ({ ActionForm: ({children}: {children:React.ReactNode}) => <form aria-label="permissions">{children}</form> }));
afterEach(cleanup);
it("keeps hidden selections while filtering and supports revocation", () => {
 render(<PermissionEditor role={{id:"role",code:"reader",name:"Reader",permissions:["documents.read"],memberCount:1,version:"v1"}} catalog={["documents.read","search.read"]} />);
 fireEvent.change(screen.getByLabelText("İzinlerde ara"), {target:{value:"Arşivde arama"}});
 fireEvent.click(screen.getByLabelText(/Arşivde arama yap/));
 expect(new FormData(screen.getByRole("form") as HTMLFormElement).getAll("permissions")).toEqual(["documents.read","search.read"]);
 fireEvent.change(screen.getByLabelText("İzinlerde ara"), {target:{value:""}});
 fireEvent.click(screen.getByLabelText(/Belgeleri görüntüle/));
 expect(new FormData(screen.getByRole("form") as HTMLFormElement).getAll("permissions")).toEqual(["search.read"]);
});
