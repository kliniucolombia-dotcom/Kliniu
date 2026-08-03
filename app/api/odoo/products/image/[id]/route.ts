import { NextRequest, NextResponse } from "next/server";
import { executeOdooKw } from "@/lib/odoo";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const records = await executeOdooKw<Array<{ image_128?: string | false }>>(
      "product.product",
      "read",
      [[productId]],
      { fields: ["image_128"] },
    );

    const base64 = records[0]?.image_128;

    if (!base64) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(Buffer.from(base64, "base64"), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
