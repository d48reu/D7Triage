import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startAutomatedBackupScheduler } = await import(
    "@/lib/automated-backups"
  );
  startAutomatedBackupScheduler();
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const errorRecord =
      error && typeof error === "object"
        ? (error as { digest?: unknown; name?: unknown })
        : null;
    const { recordOperationalEvent } = await import(
      "@/lib/operational-events"
    );
    recordOperationalEvent({
      eventType: "server_request_error",
      severity: "error",
      action: context.routeType || "request",
      outcome: "failed",
      errorCode:
        typeof errorRecord?.digest === "string"
          ? "next_server_error"
          : typeof errorRecord?.name === "string"
            ? errorRecord.name
            : "Error",
      route: request.path,
    });
  } catch (monitoringError) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "monitoring_write_failed",
        errorCode:
          monitoringError instanceof Error
            ? monitoringError.name || "Error"
            : "unknown",
      }),
    );
  }
};
