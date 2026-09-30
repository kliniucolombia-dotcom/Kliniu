import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyLocal,
  normalizeForModeration,
  RESPECT_BOUNDARY_REPLY,
  ESCALATE_REPLY,
} from "../lib/moderation";

test("normalizeForModeration quita acentos, leet y separadores", () => {
  assert.equal(normalizeForModeration("PÚTA"), "puta");
  assert.equal(normalizeForModeration("m13rda"), "mierda");
  assert.equal(normalizeForModeration("p.u.t.a"), "puta");
  assert.equal(normalizeForModeration("p-u-t-a"), "puta");
  assert.equal(normalizeForModeration("p u t a"), "puta");
  assert.equal(normalizeForModeration("puuuta"), "puuuta");
});

test("clasifica groserías directas como BOUNDARY PROFANITY", () => {
  for (const text of ["eres una mierda", "qué puta tan cara", "PENDEJO", "hijueputa"]) {
    const result = classifyLocal(text);
    assert.equal(result?.action, "BOUNDARY", text);
    assert.equal(result?.category, "PROFANITY", text);
    assert.equal(result?.reply, RESPECT_BOUNDARY_REPLY, text);
  }
});

test("detecta evasiones (letras repetidas, separadores, leet)", () => {
  for (const text of ["puuuta", "p.u.t.a", "m13rd4", "p u t a", "MARIC0N"]) {
    const result = classifyLocal(text);
    assert.ok(result, `debería detectar: ${text}`);
    assert.equal(result?.action, "BOUNDARY", text);
  }
});

test("amenazas directas escalan (ESCALATE THREAT)", () => {
  for (const text of ["te voy a matar", "te voy a pegar", "voy a acuchillarte"]) {
    const result = classifyLocal(text);
    assert.equal(result?.action, "ESCALATE", text);
    assert.equal(result?.category, "THREAT", text);
    assert.equal(result?.reply, ESCALATE_REPLY, text);
  }
});

test("contenido sexual explícito se filtra", () => {
  const result = classifyLocal("mándame una foto porno");
  assert.equal(result?.action, "BOUNDARY");
  assert.equal(result?.category, "SEXUAL");
});

test("no hay falsos positivos en mensajes legítimos del negocio", () => {
  for (const text of [
    "necesito un dispensador de jabón para el baño",
    "¿tienen papel higiénico institucional?",
    "busco toallas interfoliadas para mi restaurante",
    "el secador de manos tiene garantía?",
  ]) {
    assert.equal(classifyLocal(text), null, text);
  }
});

test("no marca palabras que contienen substrings peligrosos", () => {
  for (const text of [
    "computador",
    "oculto",
    "cultura",
    "peru",
    "venganza",
    "repuesto de válvula",
  ]) {
    assert.equal(classifyLocal(text), null, text);
  }
});
