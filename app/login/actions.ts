"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function login(
  previousState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/",
    });

    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return "Invalid username or password.";
      }

      return "Unable to sign in.";
    }

    throw error;
  }
}