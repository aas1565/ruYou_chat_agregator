export const CHANNELS = [
  "TELEGRAM",
  "WHATSAPP",
  "WEBSITE_FORM",
  "WEBSITE_CHAT",
  "EMAIL",
  "VK",
  "AVITO",
  "MAX",
  "OTHER",
] as const;

export type Channel = (typeof CHANNELS)[number];

export const CONVERSATION_STATUSES = ["OPEN", "PENDING", "CLOSED"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const HANDLER_TYPES = ["AI", "OPERATOR"] as const;
export type HandlerType = (typeof HANDLER_TYPES)[number];

export const MESSAGE_SENDERS = ["CLIENT", "AI", "OPERATOR", "SYSTEM"] as const;
export type MessageSender = (typeof MESSAGE_SENDERS)[number];

export const DELIVERY_STATUSES = ["SENT", "DELIVERED", "READ", "FAILED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CONTACT_TYPES = ["PHONE", "EMAIL", "TELEGRAM", "WHATSAPP", "VK"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const USER_ROLES = ["OWNER", "ADMIN", "MANAGER", "OPERATOR", "EMPLOYEE"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LEAD_FUNNELS = ["SERVICE", "SALES"] as const;
export type LeadFunnel = (typeof LEAD_FUNNELS)[number];

export const SERVICE_LEAD_STATUSES = [
  "NEW",
  "AI_PROCESSING",
  "OPERATOR_REQUIRED",
  "BOOKING_CREATED",
  "COMPLETED",
] as const;

export const SALES_LEAD_STATUSES = [
  "NEW",
  "CONSULTATION",
  "ESTIMATE",
  "APPROVAL",
  "SALE",
] as const;

export const ALL_LEAD_STATUSES = [
  ...SERVICE_LEAD_STATUSES,
  "CONSULTATION",
  "ESTIMATE",
  "APPROVAL",
  "SALE",
] as const;

export type LeadStatus =
  | (typeof SERVICE_LEAD_STATUSES)[number]
  | (typeof SALES_LEAD_STATUSES)[number];

export const FUNNEL_STATUSES: Record<LeadFunnel, readonly LeadStatus[]> = {
  SERVICE: SERVICE_LEAD_STATUSES,
  SALES: SALES_LEAD_STATUSES,
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  TELEGRAM: "Telegram",
  WHATSAPP: "WhatsApp",
  WEBSITE_FORM: "Форма сайта",
  WEBSITE_CHAT: "Чат сайта",
  EMAIL: "Email",
  VK: "VK",
  AVITO: "Avito",
  MAX: "MAX",
  OTHER: "Другое",
};

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: "Открыт",
  PENDING: "Ожидает",
  CLOSED: "Закрыт",
};

export const HANDLER_LABELS: Record<HandlerType, string> = {
  AI: "AI",
  OPERATOR: "Оператор",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Активен",
  INACTIVE: "Неактивен",
  ARCHIVED: "Архив",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Новая",
  AI_PROCESSING: "AI обрабатывает",
  OPERATOR_REQUIRED: "Нужен оператор",
  BOOKING_CREATED: "Запись создана",
  COMPLETED: "Завершена",
  CONSULTATION: "Консультация",
  ESTIMATE: "Смета",
  APPROVAL: "Согласование",
  SALE: "Продажа",
};

export const FUNNEL_LABELS: Record<LeadFunnel, string> = {
  SERVICE: "Сервис",
  SALES: "Продажи",
};

export const SENDER_LABELS: Record<MessageSender, string> = {
  CLIENT: "Клиент",
  AI: "AI",
  OPERATOR: "Оператор",
  SYSTEM: "Система",
};

export const KNOWLEDGE_ENTRY_TYPES = [
  "COMPANY",
  "ADDRESS",
  "WORKING_HOURS",
  "SERVICE",
  "PRICE",
  "EMPLOYEE",
  "SCHEDULE",
  "PROMOTION",
  "FAQ",
  "CANCELLATION_POLICY",
  "INTERNAL_INSTRUCTION",
] as const;

export type KnowledgeEntryType = (typeof KNOWLEDGE_ENTRY_TYPES)[number];

export const KNOWLEDGE_ENTRY_TYPE_LABELS: Record<KnowledgeEntryType, string> = {
  COMPANY: "Компания",
  ADDRESS: "Адреса",
  WORKING_HOURS: "Режим работы",
  SERVICE: "Услуги",
  PRICE: "Цены",
  EMPLOYEE: "Сотрудники",
  SCHEDULE: "Расписание",
  PROMOTION: "Акции",
  FAQ: "FAQ",
  CANCELLATION_POLICY: "Правила",
  INTERNAL_INSTRUCTION: "Инструкции",
};

export const KNOWLEDGE_SOURCE_TYPES = ["PDF", "DOCX", "XLSX", "URL"] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, string> = {
  PDF: "PDF",
  DOCX: "DOCX",
  XLSX: "XLSX",
  URL: "URL",
};

export const KNOWLEDGE_SOURCE_STATUSES = ["PROCESSING", "READY", "FAILED"] as const;
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number];

export const KNOWLEDGE_SOURCE_STATUS_LABELS: Record<KnowledgeSourceStatus, string> = {
  PROCESSING: "Обработка",
  READY: "Готово",
  FAILED: "Ошибка",
};

export const KNOWLEDGE_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const KNOWLEDGE_ALLOWED_MIME: Record<"PDF" | "DOCX" | "XLSX", readonly string[]> = {
  PDF: ["application/pdf"],
  DOCX: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  XLSX: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ],
};

export const NAV_ITEMS = [
  { href: "/home", label: "Главная", icon: "home", implemented: true },
  { href: "/inbox", label: "Обращения", icon: "inbox", implemented: true },
  { href: "/clients", label: "Клиенты", icon: "users", implemented: true },
  { href: "/appointments", label: "Заявки и записи", icon: "calendar", implemented: true },
  { href: "/attention", label: "Требуют внимания", icon: "alert", implemented: false },
  { href: "/knowledge", label: "База знаний", icon: "book", implemented: true },
  { href: "/integrations", label: "Интеграции", icon: "plug", implemented: false },
  { href: "/settings", label: "Настройки", icon: "settings", implemented: false },
] as const;
