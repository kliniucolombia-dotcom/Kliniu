type WatiApiResult = {
  result?: boolean | string;
  ok?: boolean;
  info?: string;
  error?: string | null;
  receivers?: Array<{
    isValidWhatsAppNumber?: boolean;
    errors?: Array<string | { message?: string }>;
  }>;
};

type WatiTemplateApiItem = {
  elementName?: string;
  status?: string;
  body?: string;
  bodyOriginal?: string;
  footer?: string | null;
  language?: { key?: string; value?: string; text?: string } | string;
  customParams?: Array<{ paramName?: string; paramValue?: string }>;
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
  const baseUrl = process.env.WATI_BASE_URL?.replace(/\/+$/, "");
  const token = process.env.WATI_API_TOKEN?.trim();
  if (!token || !baseUrl) throw new Error("WATI_NOT_CONFIGURED");

  return {
    baseUrl,
    authorization: token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`,
  };
}

async function parseWatiResponse(response: Response) {
  const raw = await response.text();
  let data: WatiApiResult = {};

  if (raw) {
    try {
      data = JSON.parse(raw) as WatiApiResult;
    } catch {
      if (!response.ok) throw new Error(`WATI_SEND_FAILED: ${response.status}`);
    }
  }

  if (!response.ok) {
    throw new Error(`WATI_SEND_FAILED: ${response.status} ${data.info ?? data.error ?? "Error de WATI"}`);
  }

  const receiverError = data.receivers?.find(
    (receiver) => receiver.isValidWhatsAppNumber === false || (receiver.errors?.length ?? 0) > 0,
  );
  if (data.result === false || data.ok === false || receiverError) {
    const firstError = receiverError?.errors?.[0];
    const detail =
      typeof firstError === "string"
        ? firstError
        : firstError?.message ?? data.info ?? data.error ?? "WATI rechazó el mensaje";
    throw new Error(`WATI_SEND_FAILED: ${detail}`);
  }

  return data;
}

export async function sendWatiMessage(phone: string, message: string) {
  const { baseUrl, authorization } = getWatiConfig();
  const url = `${baseUrl}/api/v1/sendSessionMessage/${phone}?messageText=${encodeURIComponent(message)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
  });

  await parseWatiResponse(response);
}

export async function sendWatiFileFromUrl(
  phone: string,
  input: { url: string; fileName: string; caption: string },
) {
  const { baseUrl, authorization } = getWatiConfig();
  const mediaResponse = await fetch(input.url, { cache: "force-cache" });
  if (!mediaResponse.ok) {
    throw new Error(`WATI_MEDIA_FETCH_FAILED: ${mediaResponse.status}`);
  }

  const formData = new FormData();
  formData.append("file", await mediaResponse.blob(), input.fileName);

  const query = new URLSearchParams({ caption: input.caption });
  const response = await fetch(
    `${baseUrl}/api/v1/sendSessionFile/${phone}?${query.toString()}`,
    {
      method: "POST",
      headers: { Authorization: authorization },
      body: formData,
    },
  );

  await parseWatiResponse(response);
}

export async function getWatiTemplates(): Promise<WatiTemplate[]> {
  const { baseUrl, authorization } = getWatiConfig();
  const response = await fetch(`${baseUrl}/api/v1/getMessageTemplates?pageSize=100&pageNumber=1`, {
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WATI_TEMPLATES_FAILED: ${response.status}`);
  }

  const data = (await response.json()) as { messageTemplates?: WatiTemplateApiItem[] };

  return (data.messageTemplates ?? [])
    .filter((template) => template.elementName && template.status === "APPROVED")
    .map((template) => {
      const bodyOriginal = template.bodyOriginal ?? template.body ?? "";
      const configuredParameters = new Map(
        (template.customParams ?? [])
          .filter((parameter) => parameter.paramName)
          .map((parameter) => [parameter.paramName!, parameter.paramValue ?? ""]),
      );

      for (const match of bodyOriginal.matchAll(/\{\{([^}]+)\}\}/g)) {
        const name = match[1].trim();
        if (!configuredParameters.has(name)) configuredParameters.set(name, "");
      }

      return {
        name: template.elementName!,
        status: template.status!,
        language:
          typeof template.language === "string"
            ? template.language
            : template.language?.text ?? template.language?.key ?? template.language?.value ?? "",
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
  const { baseUrl, authorization } = getWatiConfig();
  const query = new URLSearchParams({ whatsappNumber: phone });
  const response = await fetch(`${baseUrl}/api/v2/sendTemplateMessage?${query}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_name: templateName,
      broadcast_name: `kliniu_${templateName}_${Date.now()}`,
      parameters,
      ...(process.env.WATI_CHANNEL_PHONE_NUMBER
        ? { channel_number: process.env.WATI_CHANNEL_PHONE_NUMBER }
        : {}),
    }),
  });

  await parseWatiResponse(response);
}
