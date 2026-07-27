"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from "firebase/auth";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

interface PortalPasswordDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, the dialog cannot be dismissed until a new password is set. */
  forced?: boolean;
  /** When true, require the current password (voluntary change). */
  requireCurrentPassword?: boolean;
  onSuccess?: () => void;
}

function getPasswordErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code?: string }).code || "");
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      return "Current password is incorrect.";
    }
    if (code === "auth/weak-password") {
      return "Choose a stronger password (at least 8 characters).";
    }
    if (code === "auth/requires-recent-login") {
      return "For security, sign out and sign back in, then try again.";
    }
  }
  return "We could not update your password. Please try again.";
}

function waitForAuthUser() {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise<User>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Not signed in"));
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timeout);
      unsubscribe();
      if (user) {
        resolve(user);
        return;
      }
      reject(new Error("Not signed in"));
    });
  });
}

export function PortalPasswordDialog({
  open,
  onOpenChange,
  forced = false,
  requireCurrentPassword = false,
  onSuccess,
}: PortalPasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (forced && !nextOpen) {
      return;
    }
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange?.(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (requireCurrentPassword && !currentPassword) {
      setError("Enter your current password.");
      return;
    }

    setLoading(true);

    try {
      const user = await waitForAuthUser();

      if (!user.email) {
        throw new Error("Not signed in");
      }

      if (requireCurrentPassword) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user, newPassword);

      const response = await fetch("/api/portal/password", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Failed to clear password flag");
      }

      resetForm();
      onOpenChange?.(false);
      onSuccess?.();
    } catch (submitError) {
      setError(getPasswordErrorMessage(submitError));
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md rounded-[28px] border-[#D6DEE3] p-0",
          forced && "[&>button.absolute]:hidden"
        )}
        onPointerDownOutside={(event) => {
          if (forced) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (forced) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (forced) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b border-[#E1E7EB] px-6 py-5">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF4EA] text-[#386B45]">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl text-[#2B2B2B]">
            {forced ? "Set a new password" : "Change password"}
          </DialogTitle>
          <DialogDescription className="text-[#60727D]">
            {forced
              ? "Welcome. Before continuing, choose a password only you know. You’ll use this for future sign-ins."
              : "Enter your current password, then choose a new one."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {requireCurrentPassword ? (
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              className="h-12 rounded-2xl border-[#D7DDD4] bg-[#F7F8F4]"
            />
          ) : null}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            className="h-12 rounded-2xl border-[#D7DDD4] bg-[#F7F8F4]"
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="h-12 rounded-2xl border-[#D7DDD4] bg-[#F7F8F4]"
          />
          {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="mt-1 h-12 w-full rounded-2xl bg-[#2B2B2B] text-white hover:bg-[#386B45]"
          >
            {loading ? "Saving..." : forced ? "Save password & continue" : "Update password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
