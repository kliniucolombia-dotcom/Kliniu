import assert from "node:assert/strict";
import test from "node:test";

import { digitsTail, matchesAdvisorPhone, needsAdvisorReminder, replyRequestsAdvisor } from "../lib/wati-escalation";
import { classifyExitIntent } from "../lib/wati-followup";
import { institutionalQuoteReply, isInstitutionalQuoteRequest } from "../lib/wati-campaign";
import { isClaimMessage } from "../lib/wati-upselling";

test("replyRequestsAdvisor detecta handoff explícito", () => {
  assert.equal(replyRequestsAdvisor("Listo, un asesor continuará por este mismo chat."), true);
  assert.equal(replyRequestsAdvisor("Te contactará un asesor muy pronto."), true);
  assert.equal(replyRequestsAdvisor("Un asesor revisará tu caso."), true);
});

test("replyRequestsAdvisor no dispara con menciones normales", () => {
  assert.equal(replyRequestsAdvisor("Un asesor confirmará el despacho."), false);
  assert.equal(replyRequestsAdvisor("El envío es gratis en Bogotá."), false);
  assert.equal(replyRequestsAdvisor("Gracias por tu compra."), false);
});

test("digitsTail toma los últimos dígitos sin importar el prefijo", () => {
  assert.equal(digitsTail("+57 310 575 0449"), "3105750449");
  assert.equal(digitsTail("573105750449"), "3105750449");
});

test("isInstitutionalQuoteRequest detecta el lead de campaña B2B", () => {
  assert.equal(isInstitutionalQuoteRequest("Quiero cotizar los dispensadores que fabrican e importan."), true);
  assert.equal(isInstitutionalQuoteRequest("precio de dispensadores al por mayor"), true);
  assert.equal(isInstitutionalQuoteRequest("Quiero información de dispensadores de papel"), false);
  assert.equal(isInstitutionalQuoteRequest("Q precio tiene"), false);
  assert.equal(isInstitutionalQuoteRequest("Hola"), false);
});

test("institutionalQuoteReply saluda por nombre si lo hay", () => {
  assert.match(institutionalQuoteReply("Jorge"), /^¡Claro, Jorge! 😊/);
  assert.match(institutionalQuoteReply(null), /^¡Claro! 😊/);
});

test("matchesAdvisorPhone compara por cola de 10 dígitos", () => {
  const advisors = ["573105750449", "+57 311 208 8806", null];
  assert.equal(matchesAdvisorPhone("573105750449", advisors), true);
  assert.equal(matchesAdvisorPhone("+57 311 208 8806", advisors), true);
  assert.equal(matchesAdvisorPhone("573001112233", advisors), false);
  assert.equal(matchesAdvisorPhone("123", advisors), false);
});

test("isClaimMessage no confunde la pregunta por tiempo de entrega con un reclamo", () => {
  assert.equal(isClaimMessage("Cuánto se demoraría?"), false);
  assert.equal(isClaimMessage("cuanto se demora el envío a Medellín"), false);
  assert.equal(isClaimMessage("mi pedido está demorado"), true);
  assert.equal(isClaimMessage("el pedido se demoró y no me llegó"), true);
});

test("classifyExitIntent reconoce rechazos suaves tras un remarketing", () => {
  assert.equal(classifyExitIntent("No señora gracias", true), "DECLINED");
  assert.equal(classifyExitIntent("hola buen día muchas gracias.. solo preguntava", true), "DECLINED");
  assert.equal(classifyExitIntent("ya me lo regalaron", true), "DECLINED");
  assert.equal(classifyExitIntent("No señora gracias", false), null);
  assert.equal(classifyExitIntent("y q vale ese", true), null);
});

test("needsAdvisorReminder solo avisa tras 1 h sin asesor y en horario laboral", () => {
  const now = new Date("2026-10-06T15:00:00Z"); // martes 10:00 en Bogotá
  const ago = (min: number) => new Date(now.getTime() - min * 60000);
  assert.equal(needsAdvisorReminder({ role: "USER", createdAt: ago(90) }, now), true);
  assert.equal(needsAdvisorReminder({ role: "ASSISTANT", createdAt: ago(90) }, now), true);
  assert.equal(needsAdvisorReminder({ role: "AGENT", createdAt: ago(90) }, now), false);
  assert.equal(needsAdvisorReminder({ role: "USER", createdAt: ago(30) }, now), false);
  assert.equal(needsAdvisorReminder({ role: "USER", createdAt: ago(60 * 72) }, now), false);
  assert.equal(needsAdvisorReminder(undefined, now), false);
  const night = new Date("2026-10-06T07:00:00Z"); // 02:00 en Bogotá
  assert.equal(needsAdvisorReminder({ role: "USER", createdAt: new Date(night.getTime() - 90 * 60000) }, night), false);
  const sunday = new Date("2026-10-04T15:00:00Z");
  assert.equal(needsAdvisorReminder({ role: "USER", createdAt: new Date(sunday.getTime() - 90 * 60000) }, sunday), false);
});
