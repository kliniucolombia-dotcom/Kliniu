export interface KommoTokenRecord {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface KommoTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface KommoContact {
  id?: number;
  name: string;
  first_name?: string;
  last_name?: string;
  custom_fields_values?: KommoCustomField[];
}

export interface KommoDeal {
  id?: number;
  name: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  custom_fields_values?: KommoCustomField[];
  _embedded?: {
    contacts?: Array<{ id: number }>;
    tags?: Array<{ name: string }>;
  };
}

export interface KommoNote {
  entity_id: number;
  note_type: "common" | "call_in" | "call_out" | "service_message";
  params: { text: string };
}

export interface KommoCustomField {
  field_id: number;
  values: Array<{ value: string | number; enum_id?: number }>;
}

export interface KommoWebhookEvent {
  account: { id: number; subdomain: string };
  leads?: {
    add?: KommoWebhookDeal[];
    update?: KommoWebhookDeal[];
    delete?: Array<{ id: number }>;
    status?: KommoWebhookDeal[];
  };
  contacts?: {
    add?: KommoWebhookContact[];
    update?: KommoWebhookContact[];
  };
}

export interface KommoWebhookDeal {
  id: number;
  name: string;
  status_id: number;
  pipeline_id: number;
  price?: number;
}

export interface KommoWebhookContact {
  id: number;
  name: string;
}

export type KommoSyncOperation =
  | "create_contact"
  | "update_contact"
  | "create_deal"
  | "update_deal"
  | "add_note";

export type KommoEntityType = "order" | "user" | "chat_lead";

export interface KommoSyncJobInput {
  entityType: KommoEntityType;
  entityId: string;
  operation: KommoSyncOperation;
  payload?: Record<string, unknown>;
}

export interface KommoApiError {
  status: number;
  title: string;
  detail?: string;
  "invalid-value"?: string[];
}
