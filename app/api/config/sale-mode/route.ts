import { getSaleMode } from "@/lib/sale-mode";

export async function GET() {
  const mode = await getSaleMode();
  return Response.json({ mode });
}
