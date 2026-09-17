import type {
  Channel,
  ClientStatus,
  ConversationStatus,
  DeliveryStatus,
  HandlerType,
  KnowledgeEntryType,
  KnowledgeSourceStatus,
  KnowledgeSourceType,
  LeadFunnel,
  LeadStatus,
  MessageSender,
  UserRole,
} from "@/lib/constants";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type ClientContactDto = {
  id: string;
  type: string;
  value: string;
};

export type ChannelIdentityDto = {
  id: string;
  channel: Channel;
  externalId: string;
  displayName: string | null;
};

export type ManagerNoteDto = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string };
};

export type ClientListItem = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  firstChannel: Channel;
  lastContactAt: string;
  contactCount: number;
  status: ClientStatus;
};

export type ClientProfileDto = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  whatsapp: string | null;
  vk: string | null;
  firstChannel: Channel;
  firstContactAt: string;
  lastContactAt: string;
  contactCount: number;
  status: ClientStatus;
  contacts: ClientContactDto[];
  identities: ChannelIdentityDto[];
  notes: ManagerNoteDto[];
  conversations: ConversationListItem[];
  leads: LeadListItem[];
};

export type ConversationListItem = {
  id: string;
  channel: Channel;
  status: ConversationStatus;
  handlerType: HandlerType;
  unreadCount: number;
  lastMessageAt: string;
  lastMessageText: string;
  client: {
    id: string;
    firstName: string;
    lastName: string | null;
  };
};

export type MessageDto = {
  id: string;
  senderType: MessageSender;
  senderName: string;
  text: string;
  channel: Channel;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
};

export type ConversationDetail = {
  conversation: ConversationListItem & { createdAt: string };
  client: ClientProfileDto;
  messages: MessageDto[];
  leads: LeadListItem[];
};

export type LeadListItem = {
  id: string;
  shortId: number;
  title: string;
  status: LeadStatus;
  funnel: LeadFunnel;
  channel: Channel | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string | null;
  };
  assignee: { id: string; name: string } | null;
};

export type LeadStatusHistoryDto = {
  id: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  createdAt: string;
  changedBy: { id: string; name: string } | null;
};

export type LeadDetailDto = {
  lead: LeadListItem & { conversationId: string | null };
  client: ClientProfileDto;
  conversation: ConversationListItem | null;
  statusHistory: LeadStatusHistoryDto[];
  notes: ManagerNoteDto[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ApiError = {
  error: string;
  details?: unknown;
};

export type KnowledgeEntryDto = {
  id: string;
  type: KnowledgeEntryType;
  title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeChunkDto = {
  id: string;
  sourceId: string;
  content: string;
  position: number;
  createdAt: string;
};

export type KnowledgeSourceDto = {
  id: string;
  type: KnowledgeSourceType;
  name: string;
  originalFileName: string | null;
  url: string | null;
  status: KnowledgeSourceStatus;
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  chunks?: KnowledgeChunkDto[];
};

export type KnowledgeRetrievalResult = {
  entries: KnowledgeEntryDto[];
  chunks: Array<KnowledgeChunkDto & { sourceName: string; sourceType: KnowledgeSourceType }>;
  scoreById: Record<string, number>;
};
