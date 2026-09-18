export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startConversationClosureWorker } = await import("@/lib/services/conversation-closure.service");
    startConversationClosureWorker();
  }
}
