"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  PortalDashboard,
  PortalDashboardAccessGrant,
  PortalDashboardInstance,
} from "@/types/portal";

interface DashboardDirectoryClient {
  id: string;
  name: string;
  isDemo?: boolean;
}

type DashboardInstanceRow = PortalDashboardInstance & {
  dashboard: PortalDashboard | null;
  accessGrants: PortalDashboardAccessGrant[];
};

interface DashboardDirectoryListProps {
  clients: DashboardDirectoryClient[];
  instances: DashboardInstanceRow[];
  initialClientId: string;
}

function familyLabel(family: string) {
  return family.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusPill(status: string) {
  if (status === "active") {
    return "bg-[#E4EDE5] text-[#2F7048]";
  }
  if (status === "draft") {
    return "bg-[#FDF4E3] text-[#8A5E0A]";
  }
  return "bg-[#EDF2F5] text-[#60727D]";
}

function formatDateLabel(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function DashboardDirectoryList({
  clients,
  instances,
  initialClientId,
}: DashboardDirectoryListProps) {
  const [selectedClientId, setSelectedClientId] = useState(
    initialClientId || clients[0]?.id || ""
  );

  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;

  const clientInstances = useMemo(() => {
    return instances
      .filter((instance) =>
        instance.accessGrants.some(
          (grant) => grant.clientId === selectedClientId && grant.status !== "hidden"
        )
      )
      .sort((left, right) => {
        const leftStamp = left.lastUsedAt ?? left.updatedAt ?? left.createdAt ?? "";
        const rightStamp = right.lastUsedAt ?? right.updatedAt ?? right.createdAt ?? "";
        return rightStamp.localeCompare(leftStamp);
      });
  }, [instances, selectedClientId]);

  return (
    <div className="rounded-2xl border border-[#D4DAD4] bg-[#EEF2EE]">
      <div className="grid min-h-[680px] grid-cols-[220px_1fr]">
        <aside className="border-r border-[#D4DAD4] bg-[#F5F8F5] px-3 py-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9A8C]">
            Clients
          </p>
          <div className="mt-2 space-y-1">
            {clients.map((client) => {
              const active = client.id === selectedClientId;
              const count = instances.filter((instance) =>
                instance.accessGrants.some(
                  (grant) => grant.clientId === client.id && grant.status !== "hidden"
                )
              ).length;
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
                  {count > 0 ? (
                    <span className="ml-auto rounded-full bg-[#C8E0CB] px-2 py-0.5 text-[10px] font-bold text-[#386B45]">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="px-8 py-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#8A9A8C]">
                {selectedClient?.name ?? "Client"}
              </p>
              <h1 className="text-2xl font-bold text-[#152238]">Dashboards</h1>
            </div>
            <Button asChild className="rounded-full bg-[#386B45] text-white hover:bg-[#2E5738]">
              <Link href="/portal/dashboards/library/new">
                <Plus className="h-4 w-4" />
                Add dashboard
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#D4DAD4] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#F1F5F1]">
                <tr className="border-b-2 border-[#D4DAD4] text-left text-[11px] uppercase tracking-[0.1em] text-[#6E7E96]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last used</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientInstances.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-[#6E7E96]" colSpan={6}>
                      No dashboards assigned to this client yet.
                    </td>
                  </tr>
                ) : (
                  clientInstances.map((instance) => {
                    const grant = instance.accessGrants.find(
                      (item) => item.clientId === selectedClientId && item.status !== "hidden"
                    );
                    const status = grant?.published
                      ? instance.settings.status
                      : instance.settings.status === "active"
                        ? "draft"
                        : instance.settings.status;

                    return (
                      <tr
                        key={instance.id}
                        className="border-b border-[#EEF2EE] last:border-b-0"
                      >
                        <td className="px-4 py-3 font-semibold text-[#152238]">
                          {instance.title}
                        </td>
                        <td className="px-4 py-3 capitalize text-[#3B4B63]">
                          {instance.dashboard?.categoryLabels?.length
                            ? instance.dashboard.categoryLabels.join(", ")
                            : familyLabel(instance.family)}
                        </td>
                        <td className="px-4 py-3 text-[#6E7E96]">
                          {instance.dashboard?.versionLabel ?? "v.1.0"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPill(
                              status
                            )}`}
                          >
                            {status === "active" ? "Active" : status === "draft" ? "Draft" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6E7E96]">
                          {formatDateLabel(instance.lastUsedAt)}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/portal/dashboards/instances/${instance.id}/information`}
                              className="text-[#386B45]"
                            >
                              Manage
                            </Link>
                            <Link
                              href={`/portal/dashboards/instances/${instance.id}/access`}
                              className="text-[#5E7898]"
                            >
                              Assign
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs italic text-[#8A9A8C]">
            Select a client to review their dashboard instances. Use Manage for settings and Assign
            for workspace access.
          </p>
        </section>
      </div>
    </div>
  );
}
