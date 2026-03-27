import { notFound } from "next/navigation";
import { FirebaseBootstrapForm } from "@/components/firebase/firebase-bootstrap-form";

export default function FirebaseSetupPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#EEF2F4] px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
            Local Setup
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#102533]">
            Firebase bootstrap
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#60727D]">
            This page is available only in local development. Use it to create the first real
            Firebase user account and ensure the default portal collections exist in Firestore.
          </p>
        </div>

        <FirebaseBootstrapForm />
      </div>
    </main>
  );
}
