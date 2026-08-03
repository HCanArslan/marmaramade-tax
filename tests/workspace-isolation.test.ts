import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findAuthUserById: vi.fn(),
  findUserPreference: vi.fn(),
  findWorkspaceMembership: vi.fn(),
  listUserMemberships: vi.fn(),
  selectActiveWorkspace: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/server/auth/config", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock("@/lib/server/repositories/auth-repository", () => ({
  findAuthUserById: mocks.findAuthUserById,
}));
vi.mock("@/lib/server/repositories/workspace-repository", () => ({
  findUserPreference: mocks.findUserPreference,
  findWorkspaceMembership: mocks.findWorkspaceMembership,
  listUserMemberships: mocks.listUserMemberships,
  selectActiveWorkspace: mocks.selectActiveWorkspace,
}));

import {
  AuthenticationRequiredError,
  FounderAuthorizationError,
  authorizeFounderUser,
  requireUser,
  resolveWorkspaceContextForUser,
} from "@/lib/server/auth/workspace-context";

const activeA = { id: "membership-a", userId: "user-a", workspaceId: "workspace-a", role: "OWNER" as const, createdAt: new Date(), updatedAt: new Date(), workspace: { id: "workspace-a", name: "A", slug: "a", status: "ACTIVE" as const, createdAt: new Date(), updatedAt: new Date() } };
const activeB = { ...activeA, id: "membership-b", userId: "user-b", workspaceId: "workspace-b", role: "MEMBER" as const, workspace: { ...activeA.workspace, id: "workspace-b", name: "B", slug: "b" } };

describe("workspace tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUserPreference.mockResolvedValue(null);
    mocks.listUserMemberships.mockResolvedValue([]);
  });

  it("allows User A to access Workspace A", async () => {
    mocks.findWorkspaceMembership.mockResolvedValue(activeA);
    await expect(resolveWorkspaceContextForUser("user-a", "workspace-a")).resolves.toEqual({ userId: "user-a", workspaceId: "workspace-a", role: "OWNER" });
  });

  it.each([
    ["user-a", "workspace-b"],
    ["user-b", "workspace-a"],
    ["user-a", "browser-supplied-workspace"],
  ])("rejects unrelated or arbitrary access for %s to %s", async (userId, workspaceId) => {
    mocks.findWorkspaceMembership.mockResolvedValue(null);
    await expect(resolveWorkspaceContextForUser(userId, workspaceId)).rejects.toMatchObject({ code: "WORKSPACE_UNAVAILABLE" });
  });

  it("rejects missing membership and unauthenticated requests", async () => {
    await expect(resolveWorkspaceContextForUser("user-a")).rejects.toMatchObject({ code: "WORKSPACE_REQUIRED" });
    mocks.getSession.mockResolvedValue(null);
    await expect(requireUser({ api: true })).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("rejects an inactive active workspace", async () => {
    mocks.findUserPreference.mockResolvedValue({ activeWorkspaceId: "workspace-a" });
    mocks.listUserMemberships.mockResolvedValue([{ ...activeA, workspace: { ...activeA.workspace, status: "SUSPENDED" } }]);
    await expect(resolveWorkspaceContextForUser("user-a")).rejects.toMatchObject({ code: "WORKSPACE_UNAVAILABLE" });
  });

  it("selects the sole active membership and requires selection for multiple", async () => {
    mocks.listUserMemberships.mockResolvedValue([activeA]);
    mocks.selectActiveWorkspace.mockResolvedValue(activeA);
    await expect(resolveWorkspaceContextForUser("user-a")).resolves.toEqual({ userId: "user-a", workspaceId: "workspace-a", role: "OWNER" });
    mocks.listUserMemberships.mockResolvedValue([activeA, activeB]);
    await expect(resolveWorkspaceContextForUser("user-a")).rejects.toMatchObject({ code: "WORKSPACE_SELECTION_REQUIRED" });
  });
});

describe("founder authorization", () => {
  it("allows the founder and rejects an ordinary workspace member", async () => {
    mocks.findAuthUserById.mockResolvedValueOnce({ systemRole: "FOUNDER" }).mockResolvedValueOnce({ systemRole: "USER" });
    await expect(authorizeFounderUser("founder")).resolves.toBeUndefined();
    await expect(authorizeFounderUser("member")).rejects.toBeInstanceOf(FounderAuthorizationError);
  });
});
