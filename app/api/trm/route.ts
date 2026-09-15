import { NextResponse } from "next/server";
import { getTrmForDate } from "@/lib/trm";

export const revalidate = 3600;

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  if (date) {
    const rate = await getTrmForDate(date);
    return NextResponse.json({ rate });
  }

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
