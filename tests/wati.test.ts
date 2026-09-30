import assert from "node:assert/strict";
import test from "node:test";

import { digitsTail, matchesAdvisorPhone, replyRequestsAdvisor } from "../lib/wati-escalation";
import { institutionalQuoteReply, isInstitutionalQuoteRequest } from "../lib/wati-campaign";

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
  assert.match(institutionalQuoteReply("Jorge"), /Hola, Jorge!/);
  assert.match(institutionalQuoteReply(null), /¡Hola! Gracias/);
});

test("matchesAdvisorPhone compara por cola de 10 dígitos", () => {
  const advisors = ["573105750449", "+57 311 208 8806", null];
  assert.equal(matchesAdvisorPhone("573105750449", advisors), true);
  assert.equal(matchesAdvisorPhone("+57 311 208 8806", advisors), true);
  assert.equal(matchesAdvisorPhone("573001112233", advisors), false);
  assert.equal(matchesAdvisorPhone("123", advisors), false);
});
