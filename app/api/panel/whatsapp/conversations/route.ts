import { requirePermission } from "@/lib/permissions";
import { getAllWatiConversations, startWatiConversation } from "@/lib/wati-conversations";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET() {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const conversations = await getAllWatiConversations();
  return Response.json(conversations);
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_WHATSAPP", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const body = (await request.json()) as {
      mode?: "session" | "template";
      phone?: string;
      text?: string;
      templateName?: string;
      parameters?: Array<{ name?: string; value?: string }>;
    };

    if (!body.phone || (body.mode !== "session" && body.mode !== "template")) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const conversation =
      body.mode === "session"
        ? await startWatiConversation({
            mode: "session",
            phone: body.phone,
            text: body.text ?? "",
          })
        : await startWatiConversation({
            mode: "template",
            phone: body.phone,
            templateName: body.templateName ?? "",
            parameters: (body.parameters ?? []).flatMap((parameter) =>
              parameter.name && typeof parameter.value === "string"
                ? [{ name: parameter.name, value: parameter.value }]
                : [],
            ),
          });

    await broadcastPanelUpdate("wati");
    return Response.json(conversation, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "No fue posible iniciar la conversación";
    const errorMessage = detail.startsWith("WATI_SEND_FAILED")
      ? "WATI rechazó el envío. Usa una plantilla aprobada si el cliente no ha escrito en las últimas 24 horas."
      : detail === "INVALID_PHONE"
        ? "Ingresa un número válido con indicativo de país."
        : detail.startsWith("TEMPLATE_PARAMETER_REQUIRED:")
          ? `Completa el campo ${detail.split(":")[1]}.`
          : detail === "TEMPLATE_NOT_FOUND"
            ? "La plantilla seleccionada ya no está disponible."
            : detail === "EMPTY_MESSAGE"
              ? "Escribe un mensaje."
              : detail;

    return Response.json({ error: errorMessage }, { status: 400 });
  }
}
