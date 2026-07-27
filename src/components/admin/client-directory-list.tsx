"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientDirectoryRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  dashboardCount: number;
  userCount: number;
}

interface ClientDirectoryListProps {
  clients: ClientDirectoryRow[];
}

function statusPill(status: string) {
  if (status === "active") {
    return "bg-[#E4EDE5] text-[#2F7048]";
  }
  if (status === "inactive") {
    return "bg-[#F7E8E8] text-[#975757]";
  }
  return "bg-[#FDF4E3] text-[#8A5E0A]";
}

function statusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "Demo";
}

export function ClientDirectoryList({ clients }: ClientDirectoryListProps) {
  return (
    <div className="rounded-2xl border border-[#D4DAD4] bg-[#EEF2EE]">
      <section className="px-8 py-7">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#8A9A8C]">Portal</p>
          <h1 className="text-2xl font-bold text-[#152238]">Clients</h1>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#D4DAD4] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#F1F5F1]">
              <tr className="border-b-2 border-[#D4DAD4] text-left text-[11px] uppercase tracking-[0.1em] text-[#6E7E96]">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Dashboards</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-[#6E7E96]" colSpan={6}>
                    No client workspaces are available yet.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-[#EEF2EE] last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#152238]">{client.name}</p>
                      <p className="text-xs text-[#6E7E96]">{client.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-[#3B4B63]">{client.id}</td>
                    <td className="px-4 py-3 font-semibold text-[#152238]">
                      {client.dashboardCount}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#152238]">{client.userCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPill(
                          client.status
                        )}`}
                      >
                        {statusLabel(client.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Link
                          href={`/portal/clients/${client.id}/information`}
                          className="text-[#6E7E96]"
                        >
                          Information
                        </Link>
                        <Link
                          href={`/portal/clients/${client.id}/settings`}
                          className="text-[#5E7898]"
                        >
                          Settings
                        </Link>
                        <Link
                          href={`/portal/clients/${client.id}`}
                          className="inline-flex items-center gap-1 text-[#386B45]"
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
