"use server";

import { redirect } from "next/navigation";
import {
  clearStaffSession,
  createStaffSession,
  hasStaffSession,
  setStaffIdentity,
  verifyStaffPassword,
} from "@/lib/staff-auth";
import { getStaffMemberById } from "@/lib/issues-repository";

export type LoginState = {
  status: "idle" | "error";
  message: string;
};

export async function loginStaffAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const staffMemberId = String(formData.get("staffMemberId") ?? "").trim();
  const staffMember = staffMemberId
    ? getStaffMemberById(staffMemberId)
    : null;

  if (!verifyStaffPassword(password)) {
    return {
      status: "error",
      message: "That password did not match the local staff password.",
    };
  }

  if (!staffMember?.isActive) {
    return {
      status: "error",
      message: "Choose your name before signing in.",
    };
  }

  await createStaffSession(staffMember.id);
  redirect("/staff/intake-board");
}

export async function selectStaffIdentityAction(formData: FormData) {
  if (!(await hasStaffSession())) {
    redirect("/staff/login");
  }

  const staffMemberId = String(formData.get("staffMemberId") ?? "").trim();
  const staffMember = staffMemberId
    ? getStaffMemberById(staffMemberId)
    : null;

  if (!staffMember?.isActive) {
    throw new Error("Choose an active staff member.");
  }

  if (!(await setStaffIdentity(staffMember.id))) {
    redirect("/staff/login");
  }

  redirect("/staff/my");
}

export async function logoutStaffAction() {
  await clearStaffSession();
  redirect("/staff/login");
}
