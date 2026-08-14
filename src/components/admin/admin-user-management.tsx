"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CLIENT_SCOPED_FIREBASE_ROLES,
  FIREBASE_PORTAL_ROLES,
  type FirebasePortalRole,
} from "@/lib/firebase/roles";
import type { FirebaseUserDoc } from "@/lib/firebase/user-store";
import {
  DASHBOARD_ACCESS_OPTIONS,
  FILTER_RULE_FIELD_OPTIONS,
  isDashboardAssetAllowed,
  listPerspectiveAccessOptionsForDashboardAsset,
  normalizeDashboardAssetId,
  type EmployeeExperienceUserAccess,
  type SharedFilterRule,
  sanitizeEmployeeExperienceUserAccess,
} from "@/lib/firebase/user-access";
import type { PortalDashboardAssignment } from "@/types/portal";

interface AdminPortalClient {
  id: string;
  name: string;
  shortName: string;
  isDemo?: boolean;
}

interface AdminUserManagementProps {
  initialUsers: FirebaseUserDoc[];
  clients: AdminPortalClient[];
  dashboardAssignments?: PortalDashboardAssignment[];
  eyebrow?: string;
  title?: string;
  description?: string;
  savePath?: string;
}

interface UserFormState {
  uid: string;
  fullName: string;
  email: string;
  role: FirebasePortalRole;
  isActive: boolean;
  password: string;
  clientIds: string[];
  employeeExperienceAccess: EmployeeExperienceUserAccess;
}

interface AdminUserRow extends FirebaseUserDoc {
  id: string;
}

const ROLE_OPTIONS = FIREBASE_PORTAL_ROLES;
const CLIENT_SCOPED_ROLES = CLIENT_SCOPED_FIREBASE_ROLES;
const DASHBOARD_ACCESS_IDS = DASHBOARD_ACCESS_OPTIONS.map((option) => option.id);
const INTEGRATION_DASHBOARD_BASE_IDS = new Set([
  "integration-dashboard",
  "csg-integration-dashboard",
]);
const COLLABORATION_DASHBOARD_BASE_IDS = new Set([
  "collaboration-dashboard",
  "tf-collaboration",
]);
const EMPLOYEE_EXPERIENCE_DASHBOARD_BASE_IDS = new Set([
  "dws-employee-experience",
  "employee-experience",
]);
function isIntegrationDashboardId(assetId: string) {
  return INTEGRATION_DASHBOARD_BASE_IDS.has(normalizeDashboardAssetId(assetId));
}

function isCollaborationDashboardId(assetId: string) {
  return COLLABORATION_DASHBOARD_BASE_IDS.has(normalizeDashboardAssetId(assetId));
}

function isEmployeeExperienceDashboardId(assetId: string) {
  const base = normalizeDashboardAssetId(assetId);
  return (
    EMPLOYEE_EXPERIENCE_DASHBOARD_BASE_IDS.has(base) ||
    base === "dws-employee-experience" ||
    assetId.startsWith("employee-experience")
  );
}

function resolvePerspectiveOptionsForDashboards(selectedDashboardIds: string[]) {
  const selected = new Set(selectedDashboardIds);
  const collaborationById = new Map<string, { id: string; label: string }>();
  const integrationById = new Map<string, { id: string; label: string }>();
  const employeeExperienceById = new Map<string, { id: string; label: string }>();

  selectedDashboardIds.forEach((dashboardId) => {
    const options = listPerspectiveAccessOptionsForDashboardAsset(dashboardId);
    if (isCollaborationDashboardId(dashboardId)) {
      options.forEach((option) => {
        if (!collaborationById.has(option.id)) {
          collaborationById.set(option.id, option);
        }
      });
      return;
    }
    if (isIntegrationDashboardId(dashboardId)) {
      options.forEach((option) => {
        if (!integrationById.has(option.id)) {
          integrationById.set(option.id, option);
        }
      });
      return;
    }
    if (isEmployeeExperienceDashboardId(dashboardId)) {
      options.forEach((option) => {
        if (!employeeExperienceById.has(option.id)) {
          employeeExperienceById.set(option.id, option);
        }
      });
    }
  });

  const collaborationOptions = Array.from(collaborationById.values());
  const integrationOptions = Array.from(integrationById.values());
  const employeeExperienceOptions = Array.from(employeeExperienceById.values());
  const allOptions = [
    ...collaborationOptions,
    ...integrationOptions,
    ...employeeExperienceOptions,
  ];
  const allIds = new Set<string>(allOptions.map((option) => option.id));

  return {
    selected,
    collaborationOptions,
    integrationOptions,
    employeeExperienceOptions,
    allOptions,
    allIds,
  };
}

function buildDashboardOptionsForClients(
  clientIds: string[],
  assignments: PortalDashboardAssignment[],
  isClientScopedRole: boolean
) {
  if (!isClientScopedRole) {
    return DASHBOARD_ACCESS_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    }));
  }

  if (clientIds.length === 0) {
    return [];
  }

  const clientIdSet = new Set(clientIds);
  const byAssetId = new Map<string, { id: string; label: string }>();

  assignments
    .filter((assignment) => clientIdSet.has(assignment.clientId) && assignment.published)
    .forEach((assignment) => {
      if (!byAssetId.has(assignment.assetId)) {
        byAssetId.set(assignment.assetId, {
          id: assignment.assetId,
          label: assignment.title,
        });
      }
    });

  if (byAssetId.size === 0) {
    return [];
  }

  return Array.from(byAssetId.values()).sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}

function pruneAccessForDashboards(
  access: EmployeeExperienceUserAccess,
  dashboardIds: string[]
): EmployeeExperienceUserAccess {
  const perspectiveGroups = resolvePerspectiveOptionsForDashboards(dashboardIds);
  const allowedDashboardAssetIds = access.allowedDashboardAssetIds.filter((id) =>
    dashboardIds.some(
      (dashboardId) =>
        dashboardId === id || isDashboardAssetAllowed(dashboardId, [id]) || isDashboardAssetAllowed(id, [dashboardId])
    )
  );

  return {
    ...access,
    allowedDashboardAssetIds,
    allowedPerspectiveIds: access.allowedPerspectiveIds.filter((value) =>
      perspectiveGroups.allIds.has(value)
    ),
    perspectiveFilterRules: access.perspectiveFilterRules.filter((rule) =>
      perspectiveGroups.allIds.has(rule.perspectiveId)
    ),
  };
}

function getSharedFilterDraft(
  access: EmployeeExperienceUserAccess
): SharedFilterRule {
  if (access.sharedFilterRule) {
    return {
      field: access.sharedFilterRule.field,
      allowedValues: [...access.sharedFilterRule.allowedValues],
    };
  }

  const firstRule = access.perspectiveFilterRules[0];
  if (firstRule) {
    return {
      field: firstRule.field,
      allowedValues: [...firstRule.allowedValues],
    };
  }

  return { field: "company", allowedValues: [] };
}

function trimIntegrationPrefix(label: string) {
  return label.replace(/^Integration\s*-\s*/i, "");
}

function parseAllowedValuesInput(input: string) {
  return Array.from(
    new Set(
      input
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function sortUsers(users: FirebaseUserDoc[]) {
  return [...users].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return left.fullName.localeCompare(right.fullName);
  });
}

function formatRoleLabel(role: FirebasePortalRole) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminUserManagement({
  initialUsers,
  clients,
  dashboardAssignments = [],
  eyebrow: _eyebrow = "Admin Workspace",
  title = "Users",
  description = "Review every portal user in one place, including role, status, and workspace assignments, then manage access centrally as client needs change.",
  savePath = "/api/admin/users",
}: AdminUserManagementProps) {
  const [users, setUsers] = useState(() => sortUsers(initialUsers));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<UserFormState | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | FirebasePortalRole>("all");
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.id ?? "__internal__"
  );

  const clientNameById = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients]
  );

  const clientRail = useMemo(() => {
    const items = clients
      .map((client) => ({
        id: client.id,
        name: client.name,
        count: users.filter((user) => user.clientIds.includes(client.id)).length,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const internalCount = users.filter(
      (user) => user.role === "super_admin" || user.role === "internal_admin"
    ).length;

    return [
      { id: "__internal__", name: "Caliber Internal", count: internalCount },
      ...items,
    ];
  }, [clients, users]);

  const tableRows = useMemo<AdminUserRow[]>(
    () =>
      users
        .filter((user) => {
          if (statusFilter === "active" && !user.isActive) return false;
          if (statusFilter === "inactive" && user.isActive) return false;
          if (roleFilter !== "all" && user.role !== roleFilter) return false;
          if (selectedClientId === "__internal__") {
            return user.role === "super_admin" || user.role === "internal_admin";
          }
          return user.clientIds.includes(selectedClientId);
        })
        .map((user) => ({ ...user, id: user.uid })),
    [users, statusFilter, roleFilter, selectedClientId]
  );

  const selectedClientLabel =
    clientRail.find((item) => item.id === selectedClientId)?.name ?? "Users";

  function updateAssignedClient(clientId: string, checked: boolean) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextClientIds = checked
        ? Array.from(new Set([...current.clientIds, clientId]))
        : current.clientIds.filter((value) => value !== clientId);

      const availableDashboards = buildDashboardOptionsForClients(
        nextClientIds,
        dashboardAssignments,
        CLIENT_SCOPED_ROLES.has(current.role)
      );
      const availableDashboardIds = availableDashboards.map((option) => option.id);
      const nextAccess = pruneAccessForDashboards(
        current.employeeExperienceAccess,
        current.employeeExperienceAccess.dashboardAccessMode === "restricted"
          ? current.employeeExperienceAccess.allowedDashboardAssetIds.filter((id) =>
              availableDashboardIds.some(
                (dashboardId) =>
                  dashboardId === id ||
                  isDashboardAssetAllowed(dashboardId, [id]) ||
                  isDashboardAssetAllowed(id, [dashboardId])
              )
            )
          : availableDashboardIds
      );

      return {
        ...current,
        clientIds: nextClientIds,
        employeeExperienceAccess: {
          ...nextAccess,
          allowedDashboardAssetIds:
            current.employeeExperienceAccess.dashboardAccessMode === "restricted"
              ? nextAccess.allowedDashboardAssetIds
              : current.employeeExperienceAccess.allowedDashboardAssetIds,
        },
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    setSaving(true);
    setError("");
    setBannerMessage("");

    try {
      const response = await fetch(savePath, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { error?: string; user?: FirebaseUserDoc };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Unable to save user.");
      }

      setUsers((current) =>
        sortUsers(current.map((user) => (user.uid === payload.user!.uid ? payload.user! : user)))
      );
      setBannerMessage(`${payload.user.fullName} was updated successfully.`);
      setDialogOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  const clientAssignmentRequired =
    form !== null && CLIENT_SCOPED_ROLES.has(form.role) && form.clientIds.length === 0;
  const dashboardAccessRestricted =
    form?.employeeExperienceAccess.dashboardAccessMode === "restricted";
  const perspectiveAccessRestricted =
    form?.employeeExperienceAccess.perspectiveAccessMode === "restricted";
  const availableDashboardOptions = useMemo(() => {
    if (!form) {
      return [] as Array<{ id: string; label: string }>;
    }
    return buildDashboardOptionsForClients(
      form.clientIds,
      dashboardAssignments,
      CLIENT_SCOPED_ROLES.has(form.role)
    );
  }, [form, dashboardAssignments]);
  const availableDashboardIds = useMemo(
    () => availableDashboardOptions.map((option) => option.id),
    [availableDashboardOptions]
  );
  const effectiveDashboardIds = useMemo(() => {
    if (!form) {
      return [] as string[];
    }
    if (dashboardAccessRestricted) {
      return form.employeeExperienceAccess.allowedDashboardAssetIds.filter((id) =>
        availableDashboardIds.some(
          (dashboardId) =>
            dashboardId === id ||
            isDashboardAssetAllowed(dashboardId, [id]) ||
            isDashboardAssetAllowed(id, [dashboardId])
        )
      );
    }
    return availableDashboardIds.length > 0 ? availableDashboardIds : DASHBOARD_ACCESS_IDS;
  }, [form, dashboardAccessRestricted, availableDashboardIds]);
  const availablePerspectiveGroups = useMemo(
    () => resolvePerspectiveOptionsForDashboards(effectiveDashboardIds),
    [effectiveDashboardIds]
  );
  const filterRulesConfigured =
    Boolean(form?.employeeExperienceAccess.sharedFilterRule) ||
    (form?.employeeExperienceAccess.perspectiveFilterRules.length ?? 0) > 0;
  const sharedFilterDraft = form ? getSharedFilterDraft(form.employeeExperienceAccess) : null;
  const hasLegacyPerspectiveFilterRules =
    (form?.employeeExperienceAccess.perspectiveFilterRules.length ?? 0) > 0;
  const filterRuleFieldOptions = FILTER_RULE_FIELD_OPTIONS;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#D4DAD4] bg-[#EEF2EE]">
        <div className="grid min-h-[680px] grid-cols-[220px_1fr]">
          <aside className="border-r border-[#D4DAD4] bg-[#F5F8F5] px-3 py-5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9A8C]">
              Clients
            </p>
            <div className="mt-2 space-y-1">
              {clientRail.map((client) => {
                const active = client.id === selectedClientId;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left ${
                      active ? "bg-[#E4EDE5]" : "hover:bg-[#ECF2ED]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? "bg-[#386B45]" : "bg-[#C7D0D8]"
                      }`}
                    />
                    <span
                      className={`min-w-0 truncate text-sm ${
                        active ? "font-semibold text-[#152238]" : "text-[#6E7E96]"
                      }`}
                    >
                      {client.name}
                    </span>
                    {client.count > 0 ? (
                      <span className="ml-auto rounded-full bg-[#C8E0CB] px-2 py-0.5 text-[10px] font-bold text-[#386B45]">
                        {client.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="px-8 py-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#8A9A8C]">{selectedClientLabel}</p>
                <h1 className="text-2xl font-bold text-[#152238]">{title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | "active" | "inactive")
                  }
                  className="h-10 min-w-[130px] rounded-full border-[#D4DAD4] bg-white"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
                <Select
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(event.target.value as "all" | FirebasePortalRole)
                  }
                  className="h-10 min-w-[150px] rounded-full border-[#D4DAD4] bg-white"
                >
                  <option value="all">All roles</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {bannerMessage ? (
              <div className="mb-4 rounded-xl border border-[#D4DAD4] bg-white px-4 py-3 text-sm text-[#355365]">
                {bannerMessage}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-[#D4DAD4] bg-white">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[#F1F5F1]">
                  <tr className="border-b-2 border-[#D4DAD4] text-left text-[11px] uppercase tracking-[0.1em] text-[#6E7E96]">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assignments</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-sm text-[#6E7E96]" colSpan={6}>
                        No users match this client and filter selection.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((user) => (
                      <tr key={user.id} className="border-b border-[#EEF2EE] last:border-b-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#152238]">{user.fullName}</p>
                          <p className="text-xs text-[#6E7E96]">{user.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[#3B4B63]">
                          {formatRoleLabel(user.role)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              user.isActive
                                ? "bg-[#E4EDE5] text-[#2F7048]"
                                : "bg-[#EDF2F5] text-[#60727D]"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#3B4B63]">
                          {user.clientIds.length === 0
                            ? "Internal access"
                            : user.clientIds
                                .map((clientId) => clientNameById.get(clientId) ?? clientId)
                                .join(", ")}
                        </td>
                        <td className="px-4 py-3 text-[#6E7E96]">
                          {new Date(user.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold">
                          <button
                            type="button"
                            className="text-[#386B45]"
                            onClick={() => {
                              setForm({
                                uid: user.uid,
                                fullName: user.fullName,
                                email: user.email,
                                role: user.role,
                                isActive: user.isActive,
                                password: "",
                                clientIds: user.clientIds,
                                employeeExperienceAccess: sanitizeEmployeeExperienceUserAccess(
                                  user.employeeExperienceAccess
                                ),
                              });
                              setError("");
                              setDialogOpen(true);
                            }}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs italic text-[#8A9A8C]">
              {description}
            </p>
          </section>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="h-[90vh] w-[min(96vw,1280px)] max-w-[1280px] overflow-hidden rounded-[28px] border-[#D6DEE3] p-0">
          <DialogHeader className="border-b border-[#E1E7EB] px-6 py-5">
            <DialogTitle className="text-xl text-[#102533]">Manage User</DialogTitle>
            <DialogDescription className="text-[#60727D]">
              Update profile details, access level, status, and workspace assignments.
            </DialogDescription>
          </DialogHeader>

          {form ? (
            <form onSubmit={handleSubmit} className="flex h-[calc(90vh-112px)] flex-col gap-5 overflow-y-auto px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Full Name"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, fullName: event.target.value } : current
                    )
                  }
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, email: event.target.value } : current
                    )
                  }
                  required
                />
                <Select
                  label="Role"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => {
                      if (!current) {
                        return current;
                      }

                      const nextRole = event.target.value as FirebasePortalRole;
                      return {
                        ...current,
                        role: nextRole,
                        clientIds: CLIENT_SCOPED_ROLES.has(nextRole) ? current.clientIds : [],
                      };
                    })
                  }
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Status"
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, isActive: event.target.value === "active" }
                        : current
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>

              <Input
                label="New Password (optional)"
                type="text"
                value={form.password}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, password: event.target.value } : current
                  )
                }
                placeholder="Leave blank to keep current password"
              />

              <div className="rounded-2xl border border-[#E1E7EB] bg-[#F9FBFC] px-4 py-4">
                <p className="text-sm font-medium text-[#102533]">Workspace Assignments</p>
                <p className="mt-1 text-sm text-[#60727D]">
                  Select the client workspaces this user should be able to access.
                </p>
                {CLIENT_SCOPED_ROLES.has(form.role) ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {clients.map((client) => {
                      const checked = form.clientIds.includes(client.id);
                      return (
                        <label
                          key={client.id}
                          className="flex items-start gap-3 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-3 text-sm text-[#355365]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              updateAssignedClient(client.id, event.target.checked)
                            }
                            className="mt-0.5 h-4 w-4 rounded border-[#C9D2D8]"
                          />
                          <span>
                            <span className="block font-medium text-[#102533]">{client.name}</span>
                            <span className="block text-xs uppercase tracking-[0.16em] text-[#60727D]">
                              {client.shortName}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-[#60727D]">
                    Internal roles do not require client-specific assignments.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#E1E7EB] bg-[#F9FBFC] px-4 py-4">
                <p className="text-sm font-medium text-[#102533]">Perspective Access</p>
                <p className="mt-1 text-sm text-[#60727D]">
                  Choose dashboards and perspectives for the selected workspace, then optionally set
                  one shared filter that applies across all of them.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Select
                    label="Dashboard access"
                    value={form.employeeExperienceAccess.dashboardAccessMode}
                    onChange={(event) =>
                      setForm((current) => {
                        if (!current) return current;
                        const mode = event.target.value as "full" | "restricted";
                        const nextAllowedDashboardAssetIds =
                          mode === "restricted"
                            ? current.employeeExperienceAccess.allowedDashboardAssetIds.filter((id) =>
                                availableDashboardIds.some(
                                  (dashboardId) =>
                                    dashboardId === id ||
                                    isDashboardAssetAllowed(dashboardId, [id]) ||
                                    isDashboardAssetAllowed(id, [dashboardId])
                                )
                              )
                            : [];
                        const nextPerspectiveGroups = resolvePerspectiveOptionsForDashboards(
                          mode === "restricted"
                            ? nextAllowedDashboardAssetIds
                            : availableDashboardIds.length > 0
                              ? availableDashboardIds
                              : DASHBOARD_ACCESS_IDS
                        );
                        return {
                          ...current,
                          employeeExperienceAccess: {
                            ...current.employeeExperienceAccess,
                            dashboardAccessMode: mode,
                            allowedDashboardAssetIds: nextAllowedDashboardAssetIds,
                            allowedPerspectiveIds:
                              current.employeeExperienceAccess.allowedPerspectiveIds.filter((value) =>
                                nextPerspectiveGroups.allIds.has(value)
                              ),
                            perspectiveFilterRules:
                              current.employeeExperienceAccess.perspectiveFilterRules.filter((rule) =>
                                nextPerspectiveGroups.allIds.has(rule.perspectiveId)
                              ),
                          },
                        };
                      })
                    }
                  >
                    <option value="full">Full access</option>
                    <option value="restricted">Restricted</option>
                  </Select>

                  <Select
                    label="Perspective access"
                    value={form.employeeExperienceAccess.perspectiveAccessMode}
                    onChange={(event) =>
                      setForm((current) => {
                        if (!current) return current;
                        const mode = event.target.value as "full" | "restricted";
                        return {
                          ...current,
                          employeeExperienceAccess: {
                            ...current.employeeExperienceAccess,
                            perspectiveAccessMode: mode,
                            allowedPerspectiveIds: mode === "restricted"
                              ? current.employeeExperienceAccess.allowedPerspectiveIds
                              : [],
                          },
                        };
                      })
                    }
                  >
                    <option value="full">Full access</option>
                    <option value="restricted">Restricted</option>
                  </Select>

                  <Select
                    label="Shared filter"
                    value={filterRulesConfigured ? "configured" : "none"}
                    onChange={(event) =>
                      setForm((current) => {
                        if (!current) return current;
                        const mode = event.target.value as "configured" | "none";
                        if (mode === "none") {
                          return {
                            ...current,
                            employeeExperienceAccess: {
                              ...current.employeeExperienceAccess,
                              sharedFilterRule: null,
                              // Clearing intentionally removes legacy per-perspective rules too.
                              perspectiveFilterRules: [],
                            },
                          };
                        }

                        const draft = getSharedFilterDraft(current.employeeExperienceAccess);
                        return {
                          ...current,
                          employeeExperienceAccess: {
                            ...current.employeeExperienceAccess,
                            sharedFilterRule: {
                              field: draft.field || "company",
                              allowedValues: draft.allowedValues,
                            },
                          },
                        };
                      })
                    }
                  >
                    <option value="none">No shared filter</option>
                    <option value="configured">Configured</option>
                  </Select>
                </div>

                {dashboardAccessRestricted ? (
                  <div className="mt-4 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                      Allowed Dashboards
                    </p>
                    <p className="mt-2 text-xs text-[#60727D]">
                      {CLIENT_SCOPED_ROLES.has(form.role)
                        ? "Only dashboards assigned to the selected workspace(s) are listed."
                        : "Select which dashboards this user can open."}
                    </p>
                    {availableDashboardOptions.length === 0 ? (
                      <p className="mt-3 rounded-2xl border border-[#D6DEE3] bg-[#F5F8FA] px-4 py-3 text-sm text-[#60727D]">
                        Select a workspace assignment first to see available dashboards.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {availableDashboardOptions.map((option) => {
                          const checked = form.employeeExperienceAccess.allowedDashboardAssetIds.some(
                            (id) =>
                              id === option.id ||
                              isDashboardAssetAllowed(option.id, [id]) ||
                              isDashboardAssetAllowed(id, [option.id])
                          );
                          return (
                            <label
                              key={option.id}
                              className="flex items-start gap-3 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-3 text-sm text-[#355365]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setForm((current) => {
                                    if (!current) return current;
                                    const next = event.target.checked
                                      ? Array.from(
                                          new Set([
                                            ...current.employeeExperienceAccess.allowedDashboardAssetIds.filter(
                                              (id) =>
                                                !(
                                                  id === option.id ||
                                                  isDashboardAssetAllowed(option.id, [id]) ||
                                                  isDashboardAssetAllowed(id, [option.id])
                                                )
                                            ),
                                            option.id,
                                          ])
                                        )
                                      : current.employeeExperienceAccess.allowedDashboardAssetIds.filter(
                                          (id) =>
                                            !(
                                              id === option.id ||
                                              isDashboardAssetAllowed(option.id, [id]) ||
                                              isDashboardAssetAllowed(id, [option.id])
                                            )
                                        );
                                    const nextPerspectiveGroups =
                                      resolvePerspectiveOptionsForDashboards(next);
                                    return {
                                      ...current,
                                      employeeExperienceAccess: {
                                        ...current.employeeExperienceAccess,
                                        allowedDashboardAssetIds: next,
                                        allowedPerspectiveIds:
                                          current.employeeExperienceAccess.allowedPerspectiveIds.filter(
                                            (value) => nextPerspectiveGroups.allIds.has(value)
                                          ),
                                        perspectiveFilterRules:
                                          current.employeeExperienceAccess.perspectiveFilterRules.filter(
                                            (rule) =>
                                              nextPerspectiveGroups.allIds.has(rule.perspectiveId)
                                          ),
                                      },
                                    };
                                  })
                                }
                                className="mt-0.5 h-4 w-4 rounded border-[#C9D2D8]"
                              />
                              <span className="block font-medium text-[#102533]">{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {perspectiveAccessRestricted ? (
                  <div className="mt-4 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                      Allowed Perspectives
                    </p>
                    <p className="mt-2 text-xs text-[#60727D]">
                      Perspective options only appear for dashboards available in the selected
                      workspace.
                    </p>
                    <div className="mt-4 space-y-4">
                      {(
                        [
                          {
                            title: "Collaboration",
                            options: availablePerspectiveGroups.collaborationOptions,
                            prefix: null,
                          },
                          {
                            title: "Integration",
                            options: availablePerspectiveGroups.integrationOptions,
                            prefix: "integration" as const,
                          },
                          {
                            title: "Employee Experience",
                            options: availablePerspectiveGroups.employeeExperienceOptions,
                            prefix: null,
                          },
                        ] as const
                      ).map((group) =>
                        group.options.length > 0 ? (
                          <div key={group.title}>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60727D]">
                              {group.title}
                            </p>
                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                              {group.options.map((option) => {
                                const checked =
                                  form.employeeExperienceAccess.allowedPerspectiveIds.includes(
                                    option.id
                                  );
                                return (
                                  <label
                                    key={option.id}
                                    className="flex items-start gap-3 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-3 text-sm text-[#355365]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        setForm((current) => {
                                          if (!current) return current;
                                          const next = event.target.checked
                                            ? Array.from(
                                                new Set([
                                                  ...current.employeeExperienceAccess
                                                    .allowedPerspectiveIds,
                                                  option.id,
                                                ])
                                              )
                                            : current.employeeExperienceAccess.allowedPerspectiveIds.filter(
                                                (value) => value !== option.id
                                              );
                                          return {
                                            ...current,
                                            employeeExperienceAccess: {
                                              ...current.employeeExperienceAccess,
                                              allowedPerspectiveIds: next,
                                            },
                                          };
                                        })
                                      }
                                      className="mt-0.5 h-4 w-4 rounded border-[#C9D2D8]"
                                    />
                                    <span className="block font-medium text-[#102533]">
                                      {group.prefix === "integration"
                                        ? trimIntegrationPrefix(option.label)
                                        : option.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : null
                      )}

                      {availablePerspectiveGroups.allOptions.length === 0 ? (
                        <p className="rounded-2xl border border-[#D6DEE3] bg-[#F5F8FA] px-4 py-3 text-sm text-[#60727D]">
                          Select at least one Collaboration, Integration, or Employee Experience
                          dashboard to configure perspective visibility.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {filterRulesConfigured && sharedFilterDraft ? (
                  <div className="mt-4 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                      Shared Filter
                    </p>
                    <p className="mt-2 text-xs text-[#60727D]">
                      Choose one field and the allowed value(s). This applies across every perspective
                      this user can open.
                    </p>
                    {hasLegacyPerspectiveFilterRules ? (
                      <p className="mt-2 rounded-2xl border border-[#E8CC70]/50 bg-[#FFF8E8] px-3 py-2 text-xs text-[#7A5A12]">
                        Existing perspective-specific rules are preserved and still apply. The shared
                        filter covers everything else.
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                      <div>
                        <Select
                          label="Filter field"
                          value={sharedFilterDraft.field}
                          onChange={(event) =>
                            setForm((current) => {
                              if (!current) return current;
                              return {
                                ...current,
                                employeeExperienceAccess: {
                                  ...current.employeeExperienceAccess,
                                  sharedFilterRule: {
                                    field: event.target.value,
                                    allowedValues:
                                      current.employeeExperienceAccess.sharedFilterRule
                                        ?.allowedValues ?? sharedFilterDraft.allowedValues,
                                  },
                                },
                              };
                            })
                          }
                        >
                          {filterRuleFieldOptions.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Textarea
                        label="Allowed values (comma or one per line)"
                        value={sharedFilterDraft.allowedValues.join("\n")}
                        onChange={(event) =>
                          setForm((current) => {
                            if (!current) return current;
                            const values = parseAllowedValuesInput(event.target.value);
                            return {
                              ...current,
                              employeeExperienceAccess: {
                                ...current.employeeExperienceAccess,
                                sharedFilterRule: {
                                  field:
                                    current.employeeExperienceAccess.sharedFilterRule?.field ||
                                    sharedFilterDraft.field ||
                                    "company",
                                  allowedValues: values,
                                },
                              },
                            };
                          })
                        }
                        placeholder={"CNC"}
                        className="min-h-[88px]"
                      />
                    </div>
                    <div className="mt-4 rounded-2xl border border-[#E1E7EB] bg-[#F9FBFC] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60727D]">
                          Additional Filter Guidelines
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full border-[#C9D2D8]"
                          onClick={() =>
                            setForm((current) => {
                              if (!current) return current;
                              const fallbackPerspective =
                                availablePerspectiveGroups.allOptions[0]?.id ?? "";
                              if (!fallbackPerspective) {
                                return current;
                              }
                              return {
                                ...current,
                                employeeExperienceAccess: {
                                  ...current.employeeExperienceAccess,
                                  perspectiveFilterRules: [
                                    ...current.employeeExperienceAccess.perspectiveFilterRules,
                                    {
                                      perspectiveId: fallbackPerspective,
                                      field: sharedFilterDraft.field || "company",
                                      allowedValues: [],
                                    },
                                  ],
                                },
                              };
                            })
                          }
                        >
                          Add guideline
                        </Button>
                      </div>
                      {availablePerspectiveGroups.allOptions.length === 0 ? (
                        <p className="mt-2 text-xs text-[#60727D]">
                          Select an allowed dashboard first so perspective-specific guidelines can be added.
                        </p>
                      ) : null}
                      {form.employeeExperienceAccess.perspectiveFilterRules.length === 0 ? (
                        <p className="mt-2 text-xs text-[#60727D]">
                          No extra guidelines configured.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {form.employeeExperienceAccess.perspectiveFilterRules.map((rule, ruleIndex) => (
                            <div key={`${rule.perspectiveId}-${rule.field}-${ruleIndex}`} className="rounded-xl border border-[#D6DEE3] bg-white p-3">
                              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                                <Select
                                  label="Perspective"
                                  value={rule.perspectiveId}
                                  onChange={(event) =>
                                    setForm((current) => {
                                      if (!current) return current;
                                      const nextRules = [...current.employeeExperienceAccess.perspectiveFilterRules];
                                      nextRules[ruleIndex] = {
                                        ...nextRules[ruleIndex],
                                        perspectiveId: event.target.value,
                                      };
                                      return {
                                        ...current,
                                        employeeExperienceAccess: {
                                          ...current.employeeExperienceAccess,
                                          perspectiveFilterRules: nextRules,
                                        },
                                      };
                                    })
                                  }
                                >
                                  {availablePerspectiveGroups.allOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))}
                                </Select>
                                <Select
                                  label="Filter field"
                                  value={rule.field}
                                  onChange={(event) =>
                                    setForm((current) => {
                                      if (!current) return current;
                                      const nextRules = [...current.employeeExperienceAccess.perspectiveFilterRules];
                                      nextRules[ruleIndex] = {
                                        ...nextRules[ruleIndex],
                                        field: event.target.value,
                                      };
                                      return {
                                        ...current,
                                        employeeExperienceAccess: {
                                          ...current.employeeExperienceAccess,
                                          perspectiveFilterRules: nextRules,
                                        },
                                      };
                                    })
                                  }
                                >
                                  {filterRuleFieldOptions.map((value) => (
                                    <option key={value} value={value}>
                                      {value}
                                    </option>
                                  ))}
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-full border-[#C9D2D8]"
                                  onClick={() =>
                                    setForm((current) => {
                                      if (!current) return current;
                                      return {
                                        ...current,
                                        employeeExperienceAccess: {
                                          ...current.employeeExperienceAccess,
                                          perspectiveFilterRules:
                                            current.employeeExperienceAccess.perspectiveFilterRules.filter(
                                              (_, index) => index !== ruleIndex
                                            ),
                                        },
                                      };
                                    })
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                              <div className="mt-3">
                                <Textarea
                                  label="Allowed values (comma or one per line)"
                                  value={rule.allowedValues.join("\n")}
                                  onChange={(event) =>
                                    setForm((current) => {
                                      if (!current) return current;
                                      const nextRules = [...current.employeeExperienceAccess.perspectiveFilterRules];
                                      nextRules[ruleIndex] = {
                                        ...nextRules[ruleIndex],
                                        allowedValues: parseAllowedValuesInput(event.target.value),
                                      };
                                      return {
                                        ...current,
                                        employeeExperienceAccess: {
                                          ...current.employeeExperienceAccess,
                                          perspectiveFilterRules: nextRules,
                                        },
                                      };
                                    })
                                  }
                                  className="min-h-[72px]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {clientAssignmentRequired ? (
                <p className="text-sm text-[#B04C4C]">
                  Client-facing users must be assigned to at least one workspace.
                </p>
              ) : null}

              {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}

              <DialogFooter className="border-t border-[#E1E7EB] pt-5">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#C9D2D8]"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || clientAssignmentRequired}
                  className="rounded-full bg-[#102F4A] text-white hover:bg-[#0C2740]"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
