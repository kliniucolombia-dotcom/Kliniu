import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    const data = await res.json();
    return NextResponse.json({ rates: data?.rates ?? {} });
  } catch {
    return NextResponse.json({ rates: {} });
  }
}
