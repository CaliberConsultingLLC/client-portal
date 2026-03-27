import type { PortalClient } from "@/types/portal";

export const PORTAL_CLIENTS: PortalClient[] = [
  {
    id: "tsi",
    name: "Tech Systems, Inc.",
    shortName: "TSi",
    slug: "tech-systems-inc",
  },
  {
    id: "dws",
    name: "Deep Well Services",
    shortName: "DWS",
    slug: "deep-well-services",
  },
  {
    id: "csg",
    name: "Canopy Services Group",
    shortName: "CSG",
    slug: "canopy-services-group",
  },
  {
    id: "tf",
    name: "Top Flight, Inc",
    shortName: "TF",
    slug: "top-flight-inc",
  },
  {
    id: "pj",
    name: "Perricone Juices",
    shortName: "PJ",
    slug: "perricone-juices",
  },
  {
    id: "demo",
    name: "Demo Environment",
    shortName: "Demo",
    slug: "demo",
    isDemo: true,
  },
  {
    id: "st-davids-foundation",
    name: "St David's Foundation",
    shortName: "St David's",
    slug: "st-davids-foundation",
  },
];

export function getPortalClients() {
  return PORTAL_CLIENTS;
}

export function getPortalClientById(clientId: string) {
  return PORTAL_CLIENTS.find((client) => client.id === clientId) ?? null;
}
