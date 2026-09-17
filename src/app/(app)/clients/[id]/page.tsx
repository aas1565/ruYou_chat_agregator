import { ClientProfile } from "@/components/clients/ClientProfile";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientProfile id={id} />;
}
