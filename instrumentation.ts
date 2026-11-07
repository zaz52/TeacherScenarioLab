/** Start Node-only workers after Next selects the runtime. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerTeacherlabIdentity } =
      await import('@/lib/server/identity/host/teacherlab-session');
    registerTeacherlabIdentity();
    const { registerNode } = await import('@/lib/server/startup');
    await registerNode();
  }
}
