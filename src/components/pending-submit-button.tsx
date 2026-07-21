"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  pendingLabel = "Working...",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
