type WatiV3Error = {
  ok?: boolean;
  success?: boolean;
  error?: { code?: number; message?: string } | string | null;
  code?: number;
  message?: string;
  info?: string;
  recipients?: Array<{
    phone_number?: string;
    errors?: Array<string | { message?: string }> | null;
  }>;
};

type WatiV3TemplateItem = {
  name?: string;
  status?: string;
  body?: string;
  body_original?: string;
  footer?: string | null;
  language_option?: { key?: string; value?: string; text?: string } | string;
  custom_params?: Array<{ name?: string; value?: string }>;
};

export type WatiTemplate = {
  name: string;
  status: string;
  language: string;
  body: string;
  bodyOriginal: string;
  footer: string | null;
  parameters: Array<{ name: string; defaultValue: string }>;
};

function getWatiConfig() {
  const rawBaseUrl = process.env.WATI_BASE_URL?.trim();
  const token = process.env.WATI_API_TOKEN?.trim();
  if (!token || !rawBaseUrl) throw new Error("WATI_NOT_CONFIGURED");

  // La API V3 cuelga directo del host (sin tenantId en la ruta). Si WATI_BASE_URL
  // todavía trae un path de tenant legacy, nos quedamos solo con el origin.
  let host: string;
  try {
    host = new URL(rawBaseUrl).origin;
  } catch {
    host = rawBaseUrl.replace(/\/+$/, "");
  }

  return {
    host,
    authorization: token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`,
    channel: process.env.WATI_CHANNEL_PHONE_NUMBER?.trim() || null,
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

// V3 acepta target como "PhoneNumber" o "Channel:PhoneNumber"; fijar el canal
// evita que el mensaje salga por otra línea conectada a la misma cuenta.
function channelTarget(phone: string, channel: string | null) {
  const digits = normalizePhone(phone);
  return channel ? `${channel}:${digits}` : digits;
}

async function parseWatiResponse(response: Response) {
  const raw = await response.text();
  let data: WatiV3Error = {};

  if (raw) {
    try {
      data = JSON.parse(raw) as WatiV3Error;
    } catch {
      if (!response.ok) throw new Error(`WATI_SEND_FAILED: ${response.status}`);
    }
  }

  const errorMessage =
    (typeof data.error === "object" && data.error ? data.error.message : null) ??
    (typeof data.error === "string" ? data.error : null) ??
    data.message ??
    data.info ??
    null;

  if (!response.ok) {
    throw new Error(`WATI_SEND_FAILED: ${response.status} ${errorMessage ?? "Error de WATI"}`);
  }

  if (data.ok === false || data.success === false) {
    throw new Error(`WATI_SEND_FAILED: ${errorMessage ?? "WATI rechazó el mensaje"}`);
  }

  const receiverError = data.recipients?.find(
    (receiver) => Array.isArray(receiver.errors) && receiver.errors.length > 0,
  );
  if (receiverError) {
    const firstError = receiverError.errors?.[0];
    const detail =
      typeof firstError === "string"
        ? firstError
        : firstError?.message ?? errorMessage ?? "WATI rechazó el mensaje";
    throw new Error(`WATI_SEND_FAILED: ${detail}`);
  }

  return data;
}

export async function sendWatiMessage(phone: string, message: string) {
  const { host, authorization, channel } = getWatiConfig();

  const response = await fetch(`${host}/api/ext/v3/conversations/messages/text`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target: channelTarget(phone, channel), text: message }),
  });

  await parseWatiResponse(response);
}

export async function sendWatiFileFromUrl(
  phone: string,
  input: { url: string; fileName: string; caption: string },
) {
  const { host, authorization, channel } = getWatiConfig();

  const response = await fetch(`${host}/api/ext/v3/conversations/messages/fileViaUrl`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // La API V3 de fileViaUrl exige "Target" (capital) pero "file_url" en minúscula.
      Target: channelTarget(phone, channel),
      file_url: input.url,
      caption: input.caption,
    }),
  });

  await parseWatiResponse(response);
}

export async function getWatiTemplates(): Promise<WatiTemplate[]> {
  const { host, authorization, channel } = getWatiConfig();
  const url = new URL(`${host}/api/ext/v3/messageTemplates`);
  url.searchParams.set("page_number", "1");
  url.searchParams.set("page_size", "100");
  if (channel) url.searchParams.set("channel", channel);

  const response = await fetch(url, {
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WATI_TEMPLATES_FAILED: ${response.status}`);
  }

  const data = (await response.json()) as { templates?: WatiV3TemplateItem[] };

  return (data.templates ?? [])
    .filter((template) => template.name && template.status?.toUpperCase() === "APPROVED")
    .map((template) => {
      const bodyOriginal = template.body_original ?? template.body ?? "";
      const configuredParameters = new Map(
        (template.custom_params ?? [])
          .filter((parameter) => parameter.name)
          .map((parameter) => [parameter.name!, parameter.value ?? ""]),
      );

      for (const match of bodyOriginal.matchAll(/\{\{([^}]+)\}\}/g)) {
        const name = match[1].trim();
        if (!configuredParameters.has(name)) configuredParameters.set(name, "");
      }

      const languageOption = template.language_option;

      return {
        name: template.name!,
        status: template.status!,
        language:
          typeof languageOption === "string"
            ? languageOption
            : languageOption?.text ?? languageOption?.key ?? languageOption?.value ?? "",
        body: template.body ?? "",
        bodyOriginal,
        footer: template.footer ?? null,
        parameters: Array.from(configuredParameters, ([name, defaultValue]) => ({
          name,
          defaultValue,
        })),
      };
    })
    .sort((a, b) => {
      const priority = (template: WatiTemplate) => {
        const spanish = /^(es|spanish)/i.test(template.language) ? 0 : 10;
        const kliniu = template.name.startsWith("kliniu_") ? 0 : 1;
        return spanish + kliniu;
      };

      return priority(a) - priority(b) || a.name.localeCompare(b.name);
    });
}

export async function sendWatiTemplateMessage(
  phone: string,
  templateName: string,
  parameters: Array<{ name: string; value: string }>,
) {
  const { host, authorization, channel } = getWatiConfig();

  const response = await fetch(`${host}/api/ext/v3/messageTemplates/send`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(channel ? { channel } : {}),
      template_name: templateName,
      broadcast_name: `kliniu_${templateName}_${Date.now()}`,
      recipients: [
        {
          phone_number: normalizePhone(phone),
          custom_params: parameters,
        },
      ],
    }),
  });

  await parseWatiResponse(response);
}
