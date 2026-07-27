export type FirebasePortalRole =
  | "super_admin"
  | "internal_admin"
  | "client_admin"
  | "client_viewer"
  | "executive"
  | "management"
  | "employee";

export const FIREBASE_PORTAL_ROLES: FirebasePortalRole[] = [
  "super_admin",
  "internal_admin",
  "client_admin",
  "client_viewer",
  "executive",
  "management",
  "employee",
];

export const CLIENT_SCOPED_FIREBASE_ROLES = new Set<FirebasePortalRole>([
  "client_admin",
  "client_viewer",
  "executive",
  "management",
  "employee",
]);
