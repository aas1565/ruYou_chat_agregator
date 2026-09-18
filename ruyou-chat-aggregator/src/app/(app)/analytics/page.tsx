import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  const params = await searchParams;
  return <AnalyticsView initialChannel={params.channel} />;
}
