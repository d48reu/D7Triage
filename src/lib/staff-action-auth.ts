import { redirect } from "next/navigation";
import { getStaffMemberById } from "@/lib/issues-repository";
import { getStaffSession } from "@/lib/staff-auth";

export type StaffActionActor = {
  staffMemberId: string;
  actorLabel: string;
};

export async function getStaffActionActor(): Promise<StaffActionActor | null> {
  const session = await getStaffSession();
  if (!session?.staffMemberId) return null;

  const staffMember = getStaffMemberById(session.staffMemberId);
  if (!staffMember?.isActive) return null;

  return {
    staffMemberId: staffMember.id,
    actorLabel: staffMember.name,
  };
}

export async function requireStaffActionActor() {
  const actor = await getStaffActionActor();
  if (!actor) {
    redirect("/staff/login");
  }
  return actor;
}
