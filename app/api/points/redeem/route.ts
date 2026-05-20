import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { redeemReward } from "@/lib/points";

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const formData = await req.formData();
  const rewardId = formData.get("rewardId") as string | null;

  if (!rewardId) {
    return NextResponse.redirect(new URL("/mi-cuenta/puntos?error=invalid", req.url));
  }

  try {
    await redeemReward(session.userId, rewardId);
    return NextResponse.redirect(new URL("/mi-cuenta/puntos?redeemed=1", req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERROR";
    const code = msg === "INSUFFICIENT_POINTS" ? "no-points" : msg === "REWARD_OUT_OF_STOCK" ? "no-stock" : "error";
    return NextResponse.redirect(new URL(`/mi-cuenta/puntos?error=${code}`, req.url));
  }
}
