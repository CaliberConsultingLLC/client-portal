"use client";

import { useMemo, useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, UserCog, Users } from "lucide-react";
import { AdminDirectoryShell } from "@/components/portal/admin-directory-shell";
import {
  AdminDirectoryOverview,
  AdminDirectorySection,
} from "@/components/portal/admin-directory-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  EE_PERSPECTIVE_ACCESS_OPTIONS,
  type EmployeeExperienceUserAccess,
  type PerspectiveFilterRule,
  sanitizeEmployeeExperienceUserAccess,
} from "@/lib/firebase/user-access";

interface AdminPortalClient {
  id: string;
  name: string;
  shortName: string;
  isDemo?: boolean;
}

interface AdminUserManagementProps {
  initialUsers: FirebaseUserDoc[];
  clients: AdminPortalClient[];
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
const INTEGRATION_DASHBOARD_IDS = new Set(["integration-dashboard", "csg-integration-dashboard"]);
const EMPLOYEE_EXPERIENCE_DASHBOARD_IDS = new Set([
  "dws-employee-experience",
  "employee-experience",
]);
const INTEGRATION_PERSPECTIVE_OPTIONS = EE_PERSPECTIVE_ACCESS_OPTIONS.filter((option) =>
  option.id.startsWith("integration.")
);
const EMPLOYEE_EXPERIENCE_PERSPECTIVE_OPTIONS = EE_PERSPECTIVE_ACCESS_OPTIONS.filter(
  (option) => !option.id.startsWith("integration.")
);

function resolvePerspectiveOptionsForDashboards(selectedDashboardIds: string[]) {
  const selected = new Set(selectedDashboardIds);
  const includeIntegration = selectedDashboardIds.some((id) => INTEGRATION_DASHBOARD_IDS.has(id));
  const includeEmployeeExperience = selectedDashboardIds.some((id) =>
    EMPLOYEE_EXPERIENCE_DASHBOARD_IDS.has(id)
  );

  const integrationOptions = includeIntegration ? INTEGRATION_PERSPECTIVE_OPTIONS : [];
  const employeeExperienceOptions = includeEmployeeExperience
    ? EMPLOYEE_EXPERIENCE_PERSPECTIVE_OPTIONS
    : [];
  const allOptions = [...integrationOptions, ...employeeExperienceOptions];
  const allIds = new Set<string>(allOptions.map((option) => option.id));

  return {
    selected,
    integrationOptions,
    employeeExperienceOptions,
    allOptions,
    allIds,
  };
}

function trimIntegrationPrefix(label: string) {
  return label.replace(/^Integration\s*-\s*/i, "");
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
  eyebrow = "Admin Workspace",
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

  const clientNameById = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients]
  );

  const summaryCards = useMemo(() => {
    const activeUsers = users.filter((user) => user.isActive).length;
    const internalUsers = users.filter(
      (user) => user.role === "super_admin" || user.role === "internal_admin"
    ).length;
    const clientAdmins = users.filter((user) => user.role === "client_admin" && user.isActive).length;

    return [
      { label: "Total users", value: users.length, icon: Users },
      { label: "Active users", value: activeUsers, icon: UserCog },
      { label: "Internal access", value: internalUsers, icon: ShieldCheck },
      { label: "Client admins", value: clientAdmins, icon: KeyRound },
    ];
  }, [users]);

  const tableRows = useMemo<AdminUserRow[]>(
    () =>
      users
        .filter((user) => {
          if (statusFilter === "active" && !user.isActive) return false;
          if (statusFilter === "inactive" && user.isActive) return false;
          if (roleFilter !== "all" && user.role !== roleFilter) return false;
          return true;
        })
        .map((user) => ({ ...user, id: user.uid })),
    [users, statusFilter, roleFilter]
  );

  function updateAssignedClient(clientId: string, checked: boolean) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextClientIds = checked
        ? Array.from(new Set([...current.clientIds, clientId]))
        : current.clientIds.filter((value) => value !== clientId);

      return {
        ...current,
        clientIds: nextClientIds,
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
  const effectiveDashboardIds = useMemo(() => {
    if (!form) {
      return [] as string[];
    }
    return dashboardAccessRestricted
      ? form.employeeExperienceAccess.allowedDashboardAssetIds
      : DASHBOARD_ACCESS_IDS;
  }, [form, dashboardAccessRestricted]);
  const availablePerspectiveGroups = useMemo(
    () => resolvePerspectiveOptionsForDashboards(effectiveDashboardIds),
    [effectiveDashboardIds]
  );
  const defaultFilterRulePerspectiveId =
    availablePerspectiveGroups.allOptions[0]?.id ?? "integration.brandReport";
  const filterRuleFieldOptions = [
    "company",
    "brand",
    "location",
    "department",
    "division",
    "fieldCategory",
    "jobTitle",
    "supervisor",
  ];

  return (
    <div className="space-y-6">
      <AdminDirectoryShell
        filters={
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#102533]">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
                  className="mt-2 rounded-2xl border-[#D6DEE3]"
                >
                  <option value="all">All users</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                  Role
                </label>
                <Select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as "all" | FirebasePortalRole)}
                  className="mt-2 rounded-2xl border-[#D6DEE3]"
                >
                  <option value="all">All roles</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>
        }
        sidePanel={
          <div className="space-y-4">
            <Card className="rounded-[28px] border-[#D6DEE3] bg-white">
              <CardHeader>
                <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#102533]">
                  Access Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                    Internal roles
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                    `Super Admin` and `Internal Admin` users are managed centrally and do not require
                    client assignments.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                    Client roles
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                    `Client Admin`, `Executive`, `Management`, and `Employee` users should stay
                    attached only to the workspaces they need to access.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                    Password resets
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                    Enter a new password while editing a user if credentials need to be rotated or
                    reset.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      >
        <div className="space-y-8">
          <AdminDirectoryOverview
            title={title}
            description={description}
            metrics={summaryCards.map((item) => ({ label: item.label, value: item.value }))}
          />

          {bannerMessage ? (
            <div className="rounded-2xl border border-[#D6DEE3] bg-[#F5F8FA] px-4 py-3 text-sm text-[#355365]">
              {bannerMessage}
            </div>
          ) : null}

          <AdminDirectorySection
            title="Portal User Directory"
            description="A collective view of active and inactive users, their access level, and assigned client workspaces."
            columns={[
              { key: "user", label: "User" },
              { key: "access", label: "Access" },
              { key: "assignments", label: "Assignments" },
              { key: "updated", label: "Updated" },
              { key: "actions", label: "Actions" },
            ]}
            rows={tableRows.map((user) => ({
              id: user.id,
              cells: [
                <div key="user">
                  <p className="font-medium text-text-primary">{user.fullName}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>,
                <div key="access" className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant={user.isActive ? "success" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="default">{formatRoleLabel(user.role)}</Badge>
                </div>,
                <div key="assignments" className="space-y-1">
                  {user.clientIds.length === 0 ? (
                    <span className="text-text-muted">All internal access</span>
                  ) : (
                    <>
                      <p className="text-sm text-text-primary">
                        {user.clientIds.length} workspace{user.clientIds.length === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-text-muted">
                        {user.clientIds
                          .map((clientId) => clientNameById.get(clientId) ?? clientId)
                          .join(", ")}
                      </p>
                    </>
                  )}
                  {user.employeeExperienceAccess?.allowedPerspectiveIds?.length ||
                  user.employeeExperienceAccess?.brandReportAllowedBrands?.length ? (
                    <p className="text-xs text-[#60727D]">
                      Restricted EE access
                    </p>
                  ) : null}
                </div>,
                <span key="updated" className="font-medium text-[#60727D]">
                  {new Date(user.updatedAt).toLocaleDateString()}
                </span>,
                <div key="actions" className="flex items-center justify-center">
                  <Button
                    variant="outline"
                    className="rounded-full border-[#C9D2D8]"
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
                    Manage / Edit
                  </Button>
                </div>,
              ],
            }))}
            emptyMessage="No portal users found."
          />
        </div>
      </AdminDirectoryShell>

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
                  Set dashboard, perspective, and Brand Report filter visibility for this user.
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
                            ? current.employeeExperienceAccess.allowedDashboardAssetIds
                            : [];
                        const nextPerspectiveGroups = resolvePerspectiveOptionsForDashboards(
                          mode === "restricted" ? nextAllowedDashboardAssetIds : DASHBOARD_ACCESS_IDS
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
                    label="Filter rules"
                    value={form.employeeExperienceAccess.perspectiveFilterRules.length > 0 ? "configured" : "none"}
                    onChange={(event) =>
                      setForm((current) => {
                        if (!current) return current;
                        const mode = event.target.value as "configured" | "none";
                        return {
                          ...current,
                          employeeExperienceAccess: {
                            ...current.employeeExperienceAccess,
                            perspectiveFilterRules:
                              mode === "configured"
                                ? current.employeeExperienceAccess.perspectiveFilterRules.length > 0
                                  ? current.employeeExperienceAccess.perspectiveFilterRules
                                  : [
                                      {
                                        perspectiveId: defaultFilterRulePerspectiveId,
                                        field: "company",
                                        allowedValues: [],
                                      } satisfies PerspectiveFilterRule,
                                    ]
                                : [],
                          },
                        };
                      })
                    }
                  >
                    <option value="none">No filter rules</option>
                    <option value="configured">Configured</option>
                  </Select>
                </div>

                {dashboardAccessRestricted ? (
                  <div className="mt-4 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                      Allowed Dashboards
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {DASHBOARD_ACCESS_OPTIONS.map((option) => {
                        const checked = form.employeeExperienceAccess.allowedDashboardAssetIds.includes(
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
                                          ...current.employeeExperienceAccess.allowedDashboardAssetIds,
                                          option.id,
                                        ])
                                      )
                                    : current.employeeExperienceAccess.allowedDashboardAssetIds.filter(
                                        (value) => value !== option.id
                                      );
                                  const nextPerspectiveGroups = resolvePerspectiveOptionsForDashboards(
                                    next
                                  );
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
                  </div>
                ) : null}

                {perspectiveAccessRestricted ? (
                  <div className="mt-4 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                      Allowed Perspectives
                    </p>
                    <p className="mt-2 text-xs text-[#60727D]">
                      Perspective options only appear for the dashboard families selected above.
                    </p>
                    <div className="mt-4 space-y-4">
                      {availablePerspectiveGroups.integrationOptions.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60727D]">
                            Integration
                          </p>
                          <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            {availablePerspectiveGroups.integrationOptions.map((option) => {
                              const checked = form.employeeExperienceAccess.allowedPerspectiveIds.includes(
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
                                                ...current.employeeExperienceAccess.allowedPerspectiveIds,
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
                                    {trimIntegrationPrefix(option.label)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {availablePerspectiveGroups.employeeExperienceOptions.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60727D]">
                            Employee Experience
                          </p>
                          <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            {availablePerspectiveGroups.employeeExperienceOptions.map((option) => {
                              const checked = form.employeeExperienceAccess.allowedPerspectiveIds.includes(
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
                                                ...current.employeeExperienceAccess.allowedPerspectiveIds,
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
                                  <span className="block font-medium text-[#102533]">{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {availablePerspectiveGroups.allOptions.length === 0 ? (
                        <p className="rounded-2xl border border-[#D6DEE3] bg-[#F5F8FA] px-4 py-3 text-sm text-[#60727D]">
                          Select at least one Integration or Employee Experience dashboard to configure
                          perspective visibility.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {form.employeeExperienceAccess.perspectiveFilterRules.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-[#D6DEE3] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                      Perspective Filter Rules
                    </p>
                    <div className="mt-3 space-y-3">
                      {form.employeeExperienceAccess.perspectiveFilterRules.map((rule, index) => (
                        <div
                          key={`${rule.perspectiveId}-${rule.field}-${index}`}
                          className="rounded-2xl border border-[#D6DEE3] bg-[#F9FBFC] px-4 py-4"
                        >
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                            <Select
                              label="Perspective"
                              value={rule.perspectiveId}
                              onChange={(event) =>
                                setForm((current) => {
                                  if (!current) return current;
                                  const next = current.employeeExperienceAccess.perspectiveFilterRules.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, perspectiveId: event.target.value }
                                        : item
                                  );
                                  return {
                                    ...current,
                                    employeeExperienceAccess: {
                                      ...current.employeeExperienceAccess,
                                      perspectiveFilterRules: next,
                                    },
                                  };
                                })
                              }
                            >
                              <optgroup label="Integration">
                                {availablePerspectiveGroups.integrationOptions.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {trimIntegrationPrefix(option.label)}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Employee Experience">
                                {availablePerspectiveGroups.employeeExperienceOptions.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </optgroup>
                            </Select>
                            <Input
                              label="Filter field"
                              value={rule.field}
                              onChange={(event) =>
                                setForm((current) => {
                                  if (!current) return current;
                                  const next = current.employeeExperienceAccess.perspectiveFilterRules.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, field: event.target.value }
                                        : item
                                  );
                                  return {
                                    ...current,
                                    employeeExperienceAccess: {
                                      ...current.employeeExperienceAccess,
                                      perspectiveFilterRules: next,
                                    },
                                  };
                                })
                              }
                              placeholder="company"
                              list={`rule-field-options-${index}`}
                            />
                            <datalist id={`rule-field-options-${index}`}>
                              {filterRuleFieldOptions.map((value) => (
                                <option key={value} value={value} />
                              ))}
                            </datalist>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full border-[#C9D2D8]"
                              onClick={() =>
                                setForm((current) => {
                                  if (!current) return current;
                                  const next = current.employeeExperienceAccess.perspectiveFilterRules.filter(
                                    (_item, itemIndex) => itemIndex !== index
                                  );
                                  return {
                                    ...current,
                                    employeeExperienceAccess: {
                                      ...current.employeeExperienceAccess,
                                      perspectiveFilterRules: next,
                                    },
                                  };
                                })
                              }
                            >
                              Remove
                            </Button>
                          </div>
                          <Textarea
                            label="Allowed values (one per line)"
                            value={rule.allowedValues.join("\n")}
                            onChange={(event) =>
                              setForm((current) => {
                                if (!current) return current;
                                const values = Array.from(
                                  new Set(
                                    event.target.value
                                      .split(/\r?\n|,/)
                                      .map((value) => value.trim())
                                      .filter(Boolean)
                                  )
                                );
                                const next = current.employeeExperienceAccess.perspectiveFilterRules.map(
                                  (item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, allowedValues: values }
                                      : item
                                );
                                return {
                                  ...current,
                                  employeeExperienceAccess: {
                                    ...current.employeeExperienceAccess,
                                    perspectiveFilterRules: next,
                                  },
                                };
                              })
                            }
                            placeholder={"CNC"}
                            className="mt-3 min-h-[88px]"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
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
                                perspectiveFilterRules: [
                                  ...current.employeeExperienceAccess.perspectiveFilterRules,
                                  {
                                    perspectiveId: "integration.brandReport",
                                    field: "company",
                                    allowedValues: [],
                                  },
                                ],
                              },
                            };
                          })
                        }
                      >
                        Add Rule
                      </Button>
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
