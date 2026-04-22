"use server";

import { redirect } from "next/navigation";
import {
  clearStaffSession,
  createStaffSession,
  verifyStaffPassword,
} from "@/lib/staff-auth";

export type LoginState = {
  status: "idle" | "error";
  message: string;
};

export async function loginStaffAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (!verifyStaffPassword(password)) {
    return {
      status: "error",
      message: "That password did not match the local staff password.",
    };
  }

  await createStaffSession();
  redirect("/staff");
}

export async function logoutStaffAction() {
  await clearStaffSession();
  redirect("/staff/login");
}
