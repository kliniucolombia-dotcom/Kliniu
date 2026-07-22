import { getKommoConfig } from "./config";
import type { KommoContact, KommoCustomField } from "../types";

export interface UserInput {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  whatsappPhone?: string | null;
  company?: string | null;
  city?: string | null;
  department?: string | null;
  level?: string;
}

function buildCustomFields(user: UserInput): KommoCustomField[] {
  const cfg = getKommoConfig().customFields.contact;
  const fields: KommoCustomField[] = [];

  const add = (fieldId: number | undefined, value: string | null | undefined) => {
    if (fieldId && value) {
      fields.push({ field_id: fieldId, values: [{ value }] });
    }
  };

  add(cfg.phone, user.phone);
  add(cfg.email, user.email);
  add(cfg.whatsappPhone, user.whatsappPhone);
  add(cfg.company, user.company);
  add(cfg.city, user.city);
  add(cfg.customerLevel, user.level);

  return fields;
}

export function mapUserToContact(user: UserInput): KommoContact {
  const [first_name, ...rest] = user.fullName.trim().split(" ");
  const last_name = rest.join(" ") || undefined;
  const customFields = buildCustomFields(user);

  return {
    name: user.fullName,
    first_name,
    last_name,
    custom_fields_values: customFields.length > 0 ? customFields : undefined,
  };
}
