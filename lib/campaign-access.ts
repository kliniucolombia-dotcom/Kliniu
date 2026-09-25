// Vendedor David (SELLER) puede editar campañas de cualquier vendedor.
const CAMPAIGN_EDIT_ALL_USER_IDS = ["cmrfci83p0003mvjqg88w3el9"];

/** Un SELLER solo edita sus campañas, salvo los usuarios de la lista de excepción. */
export function sellerBlockedFromCampaign(session: { role: string; userId: string }, campaignSellerId: string) {
  return session.role === "SELLER" && campaignSellerId !== session.userId && !CAMPAIGN_EDIT_ALL_USER_IDS.includes(session.userId);
}
