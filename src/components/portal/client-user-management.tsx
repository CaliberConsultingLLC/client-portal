"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, UserPlus, Users } from "lucide-react";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FirebasePortalRole } from "@/lib/firebase/roles";
import type { FirebaseUserDoc } from "@/lib/firebase/user-store";

type ClientUserRecord = FirebaseUserDoc;

interface ClientUserManagementProps {
  clientId: string;
  clientName: string;
  initialUsers: ClientUserRecord[];
}

interface UserFormState {
  uid?: string;
  fullName: string;
  email: string;
  role: FirebasePortalRole;
  isActive: boolean;
  password: string;
}

const CLIENT_ROLE_OPTIONS: FirebasePortalRole[] = [
  "client_admin",
  "executive",
  "management",
  "employee",
];

function createEmptyForm(): UserFormState {
  return {
    fullName: "",
    email: "",
    role: "employee",
    isActive: true,
    password: "",
  };
}

function sortUsers(users: ClientUserRecord[]) {
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

export function ClientUserManagement({
  clientId,
  clientName,
  initialUsers,
}: ClientUserManagementProps) {
  const [users, setUsers] = useState(() => sortUsers(initialUsers));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<UserFormState>(createEmptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");

  const allowedRoles = CLIENT_ROLE_OPTIONS;
  const activeUsers = users.filter((user) => user.isActive);
  const clientAdmins = users.filter((user) => user.role === "client_admin" && user.isActive);
  const censusAdmins = users.filter((user) => user.role === "client_admin" && user.isActive);

  const summaryCards = useMemo(
    () => [
      { label: "Active users", value: activeUsers.length, icon: Users },
      { label: "Client admins", value: clientAdmins.length, icon: ShieldCheck },
      { label: "Census access", value: censusAdmins.length, icon: KeyRound },
    ],
    [activeUsers.length, clientAdmins.length, censusAdmins.length]
  );

  function openCreate() {
    setMode("create");
    setForm(createEmptyForm());
    setError("");
    setDialogOpen(true);
  }

  function openEdit(user: ClientUserRecord) {
    setMode("edit");
    setForm({
      uid: user.uid,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setBannerMessage("");

    try {
      const response = await fetch(`/api/portal/clients/${clientId}/users`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { error?: string; user?: ClientUserRecord };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Unable to save user.");
      }

      setUsers((current) => {
        const next =
          mode === "create"
            ? [...current, payload.user!]
            : current.map((user) => (user.uid === payload.user!.uid ? payload.user! : user));
        return sortUsers(next);
      });

      setBannerMessage(
        mode === "create"
          ? `${payload.user.fullName} was added to ${clientName}.`
          : `${payload.user.fullName} was updated successfully.`
      );
      setDialogOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalContentFrame>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
            Client Workspace
          </p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#2B2B2B]">
                {clientName} User Management
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
                Add and manage portal users for this client workspace. This stays intentionally
                minimal for now while leaving room to expand into more granular permissions and
                security controls.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/clients/${clientId}`}>Back to workspace</Link>
            </Button>
          </div>
        </div>

      {bannerMessage ? (
        <div className="rounded-2xl border border-[#D6DEE3] bg-[#F5F8FA] px-4 py-3 text-sm text-[#355365]">
          {bannerMessage}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        {summaryCards.map((item) => (
          <Card key={item.label} className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#386B45]">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#2B2B2B]">{item.value}</p>
                <p className="text-xs text-[#60727D]">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl text-[#2B2B2B]">Active Users</CardTitle>
              <CardDescription className="mt-2 text-[#60727D]">
                Workspace users, core access roles, and account status for this client.
              </CardDescription>
            </div>
            <Button
              onClick={openCreate}
              className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.length === 0 ? (
              <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm text-[#60727D]">
                No users have been assigned to this workspace yet.
              </div>
            ) : (
              users.map((user) => {
                const canEditUser = CLIENT_ROLE_OPTIONS.includes(user.role);

                return (
                  <div
                    key={user.uid}
                    className="rounded-2xl border border-[#D6DEE3] bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-[#2B2B2B]">{user.fullName}</p>
                          <Badge variant={user.isActive ? "success" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="default">{formatRoleLabel(user.role)}</Badge>
                        </div>
                        <p className="text-sm text-[#60727D]">{user.email}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#60727D]">
                          {user.clientIds.length > 1
                            ? `Assigned to ${user.clientIds.length} client workspaces`
                            : "Assigned to this client workspace"}
                        </p>
                      </div>
                      {canEditUser ? (
                        <Button
                          onClick={() => openEdit(user)}
                          variant="outline"
                          className="rounded-full border-[#C9D2D8]"
                        >
                          Manage user
                        </Button>
                      ) : (
                        <div className="rounded-full bg-[#F5F8FA] px-3 py-2 text-xs font-medium text-[#60727D]">
                          Internal role managed centrally
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#2B2B2B]">Permission Model</CardTitle>
            <CardDescription className="text-[#60727D]">
              Role-based access is kept simple for now so the workflow stays easy to manage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                Available now
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                Name, email, status, role, and password updates can all be managed here.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                Next step ready
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                This page is structured so more detailed permission toggles can be added without
                reworking the workspace flow later.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                Password changes
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                Enter a new password while editing a user to reset or change their credentials.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[28px] border-[#D6DEE3] p-0">
          <DialogHeader className="border-b border-[#E1E7EB] px-6 py-5">
            <DialogTitle className="text-xl text-[#2B2B2B]">
              {mode === "create" ? "Add Client User" : "Manage Client User"}
            </DialogTitle>
            <DialogDescription className="text-[#60727D]">
              {mode === "create"
                ? `Create a new user and assign them to ${clientName}.`
                : "Update profile details, permissions, account status, or password."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Full Name"
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <Select
                label="Role"
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as FirebasePortalRole,
                  }))
                }
              >
                {allowedRoles.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </Select>
              <Select
                label="Status"
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.value === "active",
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <Input
              label={mode === "create" ? "Temporary Password" : "New Password (optional)"}
              type="text"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={
                mode === "create" ? "Create an initial password" : "Leave blank to keep current password"
              }
              required={mode === "create"}
            />

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
                disabled={saving}
                className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
              >
                {saving
                  ? mode === "create"
                    ? "Creating User..."
                    : "Saving Changes..."
                  : mode === "create"
                    ? "Create User"
                    : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </PortalContentFrame>
  );
}
