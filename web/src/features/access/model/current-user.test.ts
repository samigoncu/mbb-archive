import { expect, it } from "vitest";
import { canSee, type CurrentUser } from "./current-user";
const user: CurrentUser = { subject:"user",roles:[],permissions:[],isAuthenticated:true,authenticationMode:"Jwt",isBootstrapAdministrator:false };
it("does not expose administration when identity or permissions are absent", () => {
 expect(canSee(null,"access.admin")).toBe(false);
 expect(canSee(user,"access.admin")).toBe(false);
 expect(canSee({...user,permissions:["documents.read"]},"access.admin")).toBe(false);
});
it("uses explicit permission or development bootstrap", () => {
 expect(canSee({...user,permissions:["access.admin"]},"access.admin")).toBe(true);
 expect(canSee({...user,isBootstrapAdministrator:true},"access.admin")).toBe(true);
});
