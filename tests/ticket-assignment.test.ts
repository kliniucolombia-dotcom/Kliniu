import assert from "node:assert/strict";
import test from "node:test";
import dotenv from "dotenv";
import {
  groupResponsiblesByDepartment,
  responsiblesForCategory,
  isAssigneeAllowed,
} from "../lib/tickets";

dotenv.config({ path: ".env.local", quiet: true });

const hasDb = Boolean(process.env.DATABASE_URL);
const PQRS_CATEGORIES = ["PQRS Diseño", "PQRS Venta"];

const EMPLOYEES = [
  { userId: "u-diseno-1", departmentId: "dept-diseno", user: { fullName: "Diseño Uno" } },
  { userId: "u-diseno-2", departmentId: "dept-diseno", user: { fullName: "Diseño Dos" } },
  { userId: "u-venta-1", departmentId: "dept-venta", user: { fullName: "Venta Uno" } },
  { userId: "u-sin-depto", departmentId: null, user: { fullName: "Sin Depto" } },
];

async function getPrisma() {
  const { prisma } = await import("../lib/prisma");
  return prisma!;
}

test("groupResponsiblesByDepartment agrupa por departamento y omite los que no tienen", () => {
  const byDepartment = groupResponsiblesByDepartment(EMPLOYEES);
  assert.deepEqual(Object.keys(byDepartment).sort(), ["dept-diseno", "dept-venta"]);
  assert.deepEqual(byDepartment["dept-diseno"].map((r) => r.id), ["u-diseno-1", "u-diseno-2"]);
  assert.deepEqual(byDepartment["dept-venta"].map((r) => r.id), ["u-venta-1"]);
});

test("responsiblesForCategory solo ofrece candidatos si hay un único departamento", () => {
  const byDepartment = groupResponsiblesByDepartment(EMPLOYEES);
  assert.equal(responsiblesForCategory(byDepartment, []).length, 0);
  assert.equal(responsiblesForCategory(byDepartment, ["dept-diseno", "dept-venta"]).length, 0);
  assert.deepEqual(
    responsiblesForCategory(byDepartment, ["dept-diseno"]).map((r) => r.id),
    ["u-diseno-1", "u-diseno-2"],
  );
  assert.deepEqual(responsiblesForCategory(byDepartment, ["dept-venta"]).map((r) => r.id), ["u-venta-1"]);
});

test("isAssigneeAllowed acepta solo responsables del departamento de la categoría", () => {
  const byDepartment = groupResponsiblesByDepartment(EMPLOYEES);
  assert.equal(isAssigneeAllowed(byDepartment, ["dept-diseno"], "u-diseno-1"), true);
  assert.equal(isAssigneeAllowed(byDepartment, ["dept-diseno"], "u-venta-1"), false);
  assert.equal(isAssigneeAllowed(byDepartment, ["dept-venta"], "u-diseno-1"), false);
  assert.equal(isAssigneeAllowed(byDepartment, [], "u-venta-1"), true);
  assert.equal(isAssigneeAllowed(byDepartment, [], "u-sin-depto"), false);
});

test("las categorías PQRS están activas y ligadas a un único departamento distinto", async (t) => {
  if (!hasDb) return t.skip("DATABASE_URL no configurada");
  const prisma = await getPrisma();
  const categories = await prisma.requestCategory.findMany({ where: { name: { in: PQRS_CATEGORIES } } });

  assert.equal(categories.length, PQRS_CATEGORIES.length);
  for (const category of categories) {
    assert.equal(category.active, true, `${category.name} debe estar activa`);
    assert.equal(category.allowedDepartmentIds.length, 1, `${category.name} debe tener un solo departamento`);
  }
  const [diseno, venta] = categories;
  assert.notEqual(diseno.allowedDepartmentIds[0], venta.allowedDepartmentIds[0]);
});

test("los selectores de PQRS Diseño y Venta devuelven empleados activos del departamento", async (t) => {
  if (!hasDb) return t.skip("DATABASE_URL no configurada");
  const prisma = await getPrisma();
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE", departmentId: { not: null } },
    select: { userId: true, departmentId: true, user: { select: { fullName: true } } },
  });
  const byDepartment = groupResponsiblesByDepartment(employees);

  for (const name of PQRS_CATEGORIES) {
    const category = await prisma.requestCategory.findUnique({ where: { name } });
    assert.ok(category, `Falta la categoría ${name}`);
    const options = responsiblesForCategory(byDepartment, category.allowedDepartmentIds);
    assert.ok(options.length > 0, `${name} debe tener al menos un responsable`);

    const activeUsers = await prisma.user.count({
      where: { id: { in: options.map((o) => o.id) }, status: "ACTIVE" },
    });
    assert.equal(activeUsers, options.length, `${name} solo debe listar usuarios activos`);
  }
});

test("rechaza asignar a alguien de otro departamento", async (t) => {
  if (!hasDb) return t.skip("DATABASE_URL no configurada");
  const prisma = await getPrisma();
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE", departmentId: { not: null } },
    select: { userId: true, departmentId: true, user: { select: { fullName: true } } },
  });
  const byDepartment = groupResponsiblesByDepartment(employees);
  const [diseno, venta] = await Promise.all(
    PQRS_CATEGORIES.map((name) => prisma.requestCategory.findUnique({ where: { name }, select: { allowedDepartmentIds: true } })),
  );
  const disenoOption = responsiblesForCategory(byDepartment, diseno!.allowedDepartmentIds)[0];
  assert.ok(disenoOption, "Diseño debe tener candidatos");
  assert.equal(isAssigneeAllowed(byDepartment, venta!.allowedDepartmentIds, disenoOption.id), false);
});

test("crear un ticket asignado persiste el responsable y notifica al asignado", async (t) => {
  if (!hasDb) return t.skip("DATABASE_URL no configurada");
  const prisma = await getPrisma();
  const { createNotification } = await import("../lib/notifications");

  const category = await prisma.requestCategory.findUnique({ where: { name: "PQRS Venta" } });
  assert.ok(category && category.active);
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE", departmentId: { not: null } },
    select: { userId: true, departmentId: true, user: { select: { fullName: true } } },
  });
  const byDepartment = groupResponsiblesByDepartment(employees);
  const assignee = responsiblesForCategory(byDepartment, category.allowedDepartmentIds)[0];
  assert.ok(assignee, "Venta debe tener responsables");

  const creator = await prisma.employee.findFirstOrThrow({ where: { userId: assignee.id } });
  const marker = `TEST-ASIGNACION-${Date.now()}`;
  let ticketId: string | undefined;
  let notificationId: string | undefined;

  try {
    const ticket = await prisma.ticket.create({
      data: {
        code: `TEST-${Date.now()}`,
        employeeId: creator.id,
        categoryId: category.id,
        priority: "MEDIA",
        subject: marker,
        description: "Prueba unitaria de asignación",
        responsibleId: assignee.id,
      },
    });
    ticketId = ticket.id;
    assert.equal(ticket.responsibleId, assignee.id);

    const notification = await createNotification({
      eventKey: "ticket.assigned",
      title: `Te asignaron la solicitud ${ticket.code}`,
      detail: `${category.name}: ${marker}`,
      targetUserId: assignee.id,
      metadata: { ticketId: ticket.id, code: ticket.code },
    });
    notificationId = notification?.id;
    assert.ok(notificationId, "Debe crearse la notificación");

    const stored = await prisma.notification.findUnique({ where: { id: notificationId } });
    assert.equal(stored?.targetUserId, assignee.id);
    assert.equal(stored?.category, "ticket_assigned");
  } finally {
    if (notificationId) await prisma.notification.delete({ where: { id: notificationId } }).catch(() => undefined);
    if (ticketId) await prisma.ticket.delete({ where: { id: ticketId } }).catch(() => undefined);
  }
});
