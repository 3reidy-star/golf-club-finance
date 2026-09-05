"use server";

import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ChangePasswordState = {
  error?: string;
  success?: string;
};

export async function changePassword(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "You must be signed in to change your password.",
    };
  }

  const currentPassword = String(
    formData.get("currentPassword") ?? "",
  );
  const newPassword = String(
    formData.get("newPassword") ?? "",
  );
  const confirmPassword = String(
    formData.get("confirmPassword") ?? "",
  );

  if (!currentPassword) {
    return {
      error: "Enter your current password.",
    };
  }

  if (newPassword.length < 12) {
    return {
      error: "Your new password must be at least 12 characters.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: "The new passwords do not match.",
    };
  }

  if (currentPassword === newPassword) {
    return {
      error: "Your new password must be different from your current password.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      passwordHash: true,
      active: true,
    },
  });

  if (!user?.active || !user.passwordHash) {
    return {
      error: "Your account is not available for password changes.",
    };
  }

  const currentPasswordMatches = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!currentPasswordMatches) {
    return {
      error: "Your current password is incorrect.",
    };
  }

  const passwordHash = await bcrypt.hash(
    newPassword,
    12,
  );

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      passwordHash,
    },
  });

  return {
    success: "Password changed successfully. Your new password will be used the next time you sign in.",
  };
}
