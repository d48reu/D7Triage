export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startAutomatedBackupScheduler } = await import(
    "@/lib/automated-backups"
  );
  startAutomatedBackupScheduler();
}
