import { Suspense } from "react";
import { InboxView } from "@/components/inbox/InboxView";
import { LoadingState } from "@/components/ui/LoadingState";

export default function InboxPage() {
  return (
    <Suspense fallback={<LoadingState label="Открываем входящие…" />}>
      <InboxView />
    </Suspense>
  );
}
