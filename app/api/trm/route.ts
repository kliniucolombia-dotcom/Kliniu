import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    const data = await res.json();
    const rate = data?.rates?.COP;
    if (!rate) throw new Error("no rate");
    return NextResponse.json({ rate });
  } catch {
    return NextResponse.json({ rate: 4000 });
  }
}
