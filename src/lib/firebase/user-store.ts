import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "./admin";

const USERS_COLLECTION = "users";

export type FirebasePortalRole =
  | "super_admin"
  | "internal_admin"
  | "client_admin"
  | "client_viewer";

export interface FirebaseUserDoc {
  uid: string;
  email: string;
  fullName: string;
  role: FirebasePortalRole;
  clientIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateFirebasePortalUserInput {
  email: string;
  password: string;
  fullName: string;
  role: FirebasePortalRole;
  clientIds?: string[];
}

function nowIso() {
  return new Date().toISOString();
}

export async function getFirebaseUserDoc(uid: string) {
  const snapshot = await getFirebaseAdminFirestore().collection(USERS_COLLECTION).doc(uid).get();
  return snapshot.exists ? (snapshot.data() as FirebaseUserDoc) : null;
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
    isActive: input.isActive,
    createdAt: createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await getFirebaseAdminFirestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .set(payload, { merge: true });

  return payload;
}

export async function createFirebasePortalUser(input: CreateFirebasePortalUserInput) {
  const auth = getFirebaseAdminAuth();
  const normalizedEmail = input.email.trim().toLowerCase();

  let authUser;

  try {
    authUser = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(authUser.uid, {
      email: normalizedEmail,
      password: input.password,
      displayName: input.fullName,
      disabled: false,
    });
  } catch {
    authUser = await auth.createUser({
      email: normalizedEmail,
      password: input.password,
      displayName: input.fullName,
      disabled: false,
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
      isActive: true,
    },
    existingDoc?.createdAt
  );

  return {
    authUser,
    userDoc,
  };
}
