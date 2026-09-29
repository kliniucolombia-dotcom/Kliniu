// Vendedores (SELLER) con acceso ampliado: ven todos los pedidos y pueden
// crear/editar campañas asignándolas a cualquier vendedor. El resto de
// vendedores solo ve y gestiona lo suyo.
export const SELLER_FULL_ACCESS_USER_IDS = ["cmrfci83p0003mvjqg88w3el9"];

export function sellerHasFullAccess(userId: string) {
  return SELLER_FULL_ACCESS_USER_IDS.includes(userId);
}

/** Un SELLER solo edita sus campañas, salvo los usuarios con acceso ampliado. */
export function sellerBlockedFromCampaign(session: { role: string; userId: string }, campaignSellerId: string) {
  return session.role === "SELLER" && campaignSellerId !== session.userId && !sellerHasFullAccess(session.userId);
}
