import {
  FileText,
  Hash,
  Mail,
  MessageCircle,
  MessagesSquare,
  Send,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { CHANNEL_LABELS, type Channel } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<Channel, typeof Send> = {
  TELEGRAM: Send,
  WHATSAPP: MessageCircle,
  WEBSITE_FORM: FileText,
  WEBSITE_CHAT: MessagesSquare,
  EMAIL: Mail,
  VK: Users,
  AVITO: ShoppingBag,
  MAX: Sparkles,
  OTHER: Hash,
};

export function ChannelIcon({
  channel,
  withLabel = false,
  className,
}: {
  channel: Channel;
  withLabel?: boolean;
  className?: string;
}) {
  const Icon = ICONS[channel] ?? Hash;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-muted", className)} title={CHANNEL_LABELS[channel]}>
      <Icon className="h-3.5 w-3.5" />
      {withLabel ? <span className="text-xs">{CHANNEL_LABELS[channel]}</span> : null}
    </span>
  );
}
