const WATI_BASE_URL = process.env.WATI_BASE_URL;

export async function sendWatiMessage(phone: string, message: string) {
  const token = process.env.WATI_API_TOKEN;
  if (!token || !WATI_BASE_URL) throw new Error("WATI_NOT_CONFIGURED");

  const url = `${WATI_BASE_URL}/api/v1/sendSessionMessage/${phone}?messageText=${encodeURIComponent(message)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WATI_SEND_FAILED: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { result?: boolean; info?: string };
  if (data.result !== true) {
    throw new Error(`WATI_SEND_FAILED: ${data.info ?? "respuesta inesperada"}`);
  }
}
