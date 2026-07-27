import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "./admin";
import type { FirebasePortalRole } from "./roles";
import {
  sanitizeEmployeeExperienceUserAccess,
  type EmployeeExperienceUserAccess,
} from "./user-access";
export type { FirebasePortalRole } from "./roles";

const USERS_COLLECTION = "users";

export interface FirebaseUserDoc {
  uid: string;
  email: string;
  fullName: string;
  role: FirebasePortalRole;
  clientIds: string[];
  employeeExperienceAccess: EmployeeExperienceUserAccess;
  isActive: boolean;
  /** When true, the user must set a new password before using the portal. */
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateFirebasePortalUserInput {
  email: string;
  password: string;
  fullName: string;
  role: FirebasePortalRole;
  clientIds?: string[];
  employeeExperienceAccess?: EmployeeExperienceUserAccess;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

interface UpdateFirebasePortalUserInput {
  uid: string;
  email: string;
  fullName: string;
  role: FirebasePortalRole;
  clientIds?: string[];
  employeeExperienceAccess?: EmployeeExperienceUserAccess;
  isActive: boolean;
  password?: string;
  mustChangePassword?: boolean;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeFirebaseUserDoc(doc: FirebaseUserDoc) {
  return {
    ...doc,
    mustChangePassword: Boolean(doc.mustChangePassword),
    employeeExperienceAccess: sanitizeEmployeeExperienceUserAccess(
      doc.employeeExperienceAccess
    ),
  } satisfies FirebaseUserDoc;
}

export async function getFirebaseUserDoc(uid: string) {
  const snapshot = await getFirebaseAdminFirestore().collection(USERS_COLLECTION).doc(uid).get();
  return snapshot.exists ? normalizeFirebaseUserDoc(snapshot.data() as FirebaseUserDoc) : null;
}

export async function listFirebaseUsersByClientId(clientId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection(USERS_COLLECTION)
    .where("clientIds", "array-contains", clientId)
    .get();

  return snapshot.docs
    .map((doc) => normalizeFirebaseUserDoc(doc.data() as FirebaseUserDoc))
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      return left.fullName.localeCompare(right.fullName);
    });
}

export async function listAllFirebaseUsers() {
  const snapshot = await getFirebaseAdminFirestore().collection(USERS_COLLECTION).get();

  return snapshot.docs
    .map((doc) => normalizeFirebaseUserDoc(doc.data() as FirebaseUserDoc))
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      return left.fullName.localeCompare(right.fullName);
    });
}

export async function upsertFirebaseUserDoc(
  uid: string,
  input: Omit<FirebaseUserDoc, "uid" | "createdAt" | "updatedAt">,
  createdAt?: string
) {
  const timestamp = nowIso();
  const payload: FirebaseUserDoc = {
    uid,
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    clientIds: input.clientIds,
    employeeExperienceAccess: sanitizeEmployeeExperienceUserAccess(
      input.employeeExperienceAccess
    ),
    isActive: input.isActive,
    mustChangePassword: Boolean(input.mustChangePassword),
    createdAt: createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await getFirebaseAdminFirestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .set(payload, { merge: true });

  return payload;
}

export async function clearFirebaseUserMustChangePassword(uid: string) {
  const existingDoc = await getFirebaseUserDoc(uid);
  if (!existingDoc) {
    throw new Error("User not found.");
  }

  return upsertFirebaseUserDoc(
    uid,
    {
      email: existingDoc.email,
      fullName: existingDoc.fullName,
      role: existingDoc.role,
      clientIds: existingDoc.clientIds,
      employeeExperienceAccess: existingDoc.employeeExperienceAccess,
      isActive: existingDoc.isActive,
      mustChangePassword: false,
    },
    existingDoc.createdAt
  );
}

export async function createFirebasePortalUser(input: CreateFirebasePortalUserInput) {
  const auth = getFirebaseAdminAuth();
  const normalizedEmail = input.email.trim().toLowerCase();
  const isActive = input.isActive ?? true;

  let authUser;

  try {
    authUser = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(authUser.uid, {
      email: normalizedEmail,
      password: input.password,
      displayName: input.fullName,
      disabled: !isActive,
    });
  } catch {
    authUser = await auth.createUser({
      email: normalizedEmail,
      password: input.password,
      displayName: input.fullName,
      disabled: !isActive,
    });
  }

  const existingDoc = await getFirebaseUserDoc(authUser.uid);
  const userDoc = await upsertFirebaseUserDoc(
    authUser.uid,
    {
      email: normalizedEmail,
      fullName: input.fullName,
      role: input.role,
      clientIds: input.clientIds ?? [],
      employeeExperienceAccess: sanitizeEmployeeExperienceUserAccess(
        input.employeeExperienceAccess
      ),
      isActive,
      // Password changes are voluntary via the portal key control — never force on login.
      mustChangePassword: input.mustChangePassword ?? false,
    },
    existingDoc?.createdAt
  );

  return {
    authUser,
    userDoc,
  };
}

export async function updateFirebasePortalUser(input: UpdateFirebasePortalUserInput) {
  const auth = getFirebaseAdminAuth();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existingDoc = await getFirebaseUserDoc(input.uid);

  if (!existingDoc) {
    throw new Error("User not found.");
  }

  await auth.updateUser(input.uid, {
    email: normalizedEmail,
    displayName: input.fullName,
    disabled: !input.isActive,
    ...(input.password ? { password: input.password } : {}),
  });

  const userDoc = await upsertFirebaseUserDoc(
    input.uid,
    {
      email: normalizedEmail,
      fullName: input.fullName,
      role: input.role,
      clientIds: input.clientIds ?? [],
      employeeExperienceAccess: sanitizeEmployeeExperienceUserAccess(
        input.employeeExperienceAccess
      ),
      isActive: input.isActive,
      // Keep any explicit override; otherwise never re-arm a forced password gate.
      mustChangePassword: input.mustChangePassword ?? false,
    },
    existingDoc.createdAt
  );

  return userDoc;
}
