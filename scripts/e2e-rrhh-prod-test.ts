import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

const BASE_URL = "https://kliniu.vercel.app";
const PASSWORD = randomBytes(24).toString("base64");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function ok(label: string, cond: boolean, extra?: unknown) {
  console.log(`${cond ? "OK " : "FAIL"} ${label}${extra ? " -> " + JSON.stringify(extra) : ""}`);
  if (!cond) process.exitCode = 1;
}

async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = res.headers.get("set-cookie");
  const data = await res.json();
  return { status: res.status, cookie: cookie?.split(";")[0], data };
}

async function main() {
  const passwordHash = await hash(PASSWORD, 10);
  const ts = Date.now();

  const jefeUser = await prisma.user.create({
    data: { fullName: "E2E Jefe Test", email: `e2e.jefe.${ts}@kliniu.com`, passwordHash, role: "EMPLOYEE" },
  });
  const empUser = await prisma.user.create({
    data: { fullName: "E2E Empleado Test", email: `e2e.empleado.${ts}@kliniu.com`, passwordHash, role: "EMPLOYEE" },
  });
  const rrhhUser = await prisma.user.create({
    data: { fullName: "E2E RRHH Test", email: `e2e.rrhh.${ts}@kliniu.com`, passwordHash, role: "RRHH" },
  });

  const jefeEmp = await prisma.employee.create({
    data: { userId: jefeUser.id, employeeCode: `E2E-JEFE-${ts}`, jobTitle: "Jefe Test", hireDate: new Date() },
  });
  const empEmp = await prisma.employee.create({
    data: {
      userId: empUser.id,
      employeeCode: `E2E-EMP-${ts}`,
      jobTitle: "Empleado Test",
      hireDate: new Date(),
      managerId: jefeEmp.id,
    },
  });

  console.log("Cuentas creadas:", { jefe: jefeUser.email, empleado: empUser.email, rrhh: rrhhUser.email, password: "[REDACTED]" });

  try {
    // 1. Login de los 3 roles
    const loginEmp = await login(empUser.email, PASSWORD);
    ok("login empleado", loginEmp.status === 200 && !!loginEmp.cookie);

    const loginJefe = await login(jefeUser.email, PASSWORD);
    ok("login jefe", loginJefe.status === 200 && !!loginJefe.cookie);

    const loginRrhh = await login(rrhhUser.email, PASSWORD);
    ok("login rrhh", loginRrhh.status === 200 && !!loginRrhh.cookie);

    // 2. Empleado crea solicitud de permiso (vía Prisma directo, simulando el form)
    const tor = await prisma.timeOffRequest.create({
      data: {
        employeeId: empEmp.id,
        type: "PERMIT",
        subType: "PERSONAL",
        startDate: new Date(),
        endDate: new Date(),
        durationDays: 1,
        reason: "Prueba E2E",
        status: "PENDING",
      },
    });
    ok("solicitud creada PENDING", tor.status === "PENDING");

    // 3. Jefe ve la solicitud en /api/empleado/equipo
    const equipoRes = await fetch(`${BASE_URL}/api/empleado/equipo`, {
      headers: { Cookie: loginJefe.cookie! },
    });
    const equipoData = await equipoRes.json();
    const visible = equipoData.timeOff?.some((r: { id: string }) => r.id === tor.id);
    ok("jefe ve solicitud en equipo", equipoRes.status === 200 && visible);

    // 4. Jefe aprueba
    const approveRes = await fetch(`${BASE_URL}/api/rrhh-local/time-off/${tor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginJefe.cookie! },
      body: JSON.stringify({ status: "APPROVED", isPaid: true }),
    });
    const approveData = await approveRes.json();
    ok("jefe aprueba solicitud", approveRes.status === 200 && approveData.status === "APPROVED", approveData);

    // 5. RRHH intenta rechazar otra solicitud (control de permisos ajenos)
    const tor2 = await prisma.timeOffRequest.create({
      data: {
        employeeId: empEmp.id,
        type: "PERMIT",
        subType: "PERSONAL",
        startDate: new Date(),
        endDate: new Date(),
        durationDays: 1,
        reason: "Prueba E2E 2",
        status: "PENDING",
      },
    });
    const rejectRes = await fetch(`${BASE_URL}/api/rrhh-local/time-off/${tor2.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginJefe.cookie! },
      body: JSON.stringify({ status: "REJECTED", reviewNote: "Prueba rechazo E2E" }),
    });
    const rejectData = await rejectRes.json();
    ok("jefe rechaza solicitud", rejectRes.status === 200 && rejectData.status === "REJECTED", rejectData);

    // 6. Empleado sin ser el dueño no puede cancelar la de otro (usa el mismo emp aquí, solo valida flujo cancel propio)
    const tor3 = await prisma.timeOffRequest.create({
      data: {
        employeeId: empEmp.id,
        type: "PERMIT",
        subType: "PERSONAL",
        startDate: new Date(),
        endDate: new Date(),
        durationDays: 1,
        reason: "Prueba E2E cancel",
        status: "PENDING",
      },
    });
    const cancelRes = await fetch(`${BASE_URL}/api/rrhh-local/time-off/${tor3.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginEmp.cookie! },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    const cancelData = await cancelRes.json();
    ok("empleado cancela su propia solicitud", cancelRes.status === 200 && cancelData.status === "CANCELLED", cancelData);

    // 7. RRHH no puede aprobar directamente una solicitud con jefe asignado (debe ser 403)
    const tor4 = await prisma.timeOffRequest.create({
      data: {
        employeeId: empEmp.id,
        type: "PERMIT",
        subType: "PERSONAL",
        startDate: new Date(),
        endDate: new Date(),
        durationDays: 1,
        reason: "Prueba E2E rrhh-block",
        status: "PENDING",
      },
    });
    const rrhhBlockRes = await fetch(`${BASE_URL}/api/rrhh-local/time-off/${tor4.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginRrhh.cookie! },
      body: JSON.stringify({ status: "APPROVED", isPaid: true }),
    });
    ok("RRHH bloqueado en solicitud con jefe (403 esperado)", rrhhBlockRes.status === 403);

    // 8. Horas extra: empleado crea, jefe aprueba
    const ot1 = await prisma.overtimeRequest.create({
      data: {
        employeeId: empEmp.id,
        date: new Date(),
        startTime: "18:00",
        endTime: "20:00",
        hours: 2,
        overtimeType: "DIURNA",
        reason: "Prueba E2E overtime",
        status: "PENDING",
      },
    });
    const otApproveRes = await fetch(`${BASE_URL}/api/rrhh-local/overtime/${ot1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginJefe.cookie! },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    const otApproveData = await otApproveRes.json();
    ok("jefe aprueba horas extra", otApproveRes.status === 200 && otApproveData.status === "APPROVED", otApproveData);

    // 9. Horas extra: jefe rechaza otra
    const ot2 = await prisma.overtimeRequest.create({
      data: {
        employeeId: empEmp.id,
        date: new Date(),
        startTime: "18:00",
        endTime: "20:00",
        hours: 2,
        overtimeType: "NOCTURNA",
        reason: "Prueba E2E overtime reject",
        status: "PENDING",
      },
    });
    const otRejectRes = await fetch(`${BASE_URL}/api/rrhh-local/overtime/${ot2.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginJefe.cookie! },
      body: JSON.stringify({ status: "REJECTED", reviewNote: "Prueba rechazo overtime E2E" }),
    });
    const otRejectData = await otRejectRes.json();
    ok("jefe rechaza horas extra", otRejectRes.status === 200 && otRejectData.status === "REJECTED", otRejectData);

    // 10. Horas extra: RRHH bloqueado (hay jefe asignado)
    const ot3 = await prisma.overtimeRequest.create({
      data: {
        employeeId: empEmp.id,
        date: new Date(),
        startTime: "18:00",
        endTime: "20:00",
        hours: 2,
        overtimeType: "DIURNA",
        reason: "Prueba E2E overtime rrhh-block",
        status: "PENDING",
      },
    });
    const otRrhhBlockRes = await fetch(`${BASE_URL}/api/rrhh-local/overtime/${ot3.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginRrhh.cookie! },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    ok("RRHH bloqueado en horas extra con jefe (403 esperado)", otRrhhBlockRes.status === 403);

    // 11. Beneficios: RRHH aprueba solicitud de empleado (no pasa por jefe)
    const benefit = await prisma.benefit.create({
      data: { title: "Beneficio E2E Test", description: "Beneficio temporal de prueba" },
    });
    const br1 = await prisma.benefitRequest.create({
      data: { benefitId: benefit.id, employeeId: empEmp.id, status: "PENDING" },
    });
    const brApproveRes = await fetch(`${BASE_URL}/api/rrhh-local/benefit-requests/${br1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginRrhh.cookie! },
      body: JSON.stringify({ status: "APPROVED", reviewNote: "OK E2E" }),
    });
    const brApproveData = await brApproveRes.json();
    ok("RRHH aprueba beneficio", brApproveRes.status === 200 && brApproveData.status === "APPROVED", brApproveData);

    // 12. Beneficios: jefe NO puede aprobar (solo RRHH o dueño-cancelar)
    const br2 = await prisma.benefitRequest.create({
      data: { benefitId: benefit.id, employeeId: empEmp.id, status: "PENDING" },
    });
    const brJefeBlockRes = await fetch(`${BASE_URL}/api/rrhh-local/benefit-requests/${br2.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginJefe.cookie! },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    ok("jefe bloqueado en beneficios (403 esperado)", brJefeBlockRes.status === 403);

    // 13. Beneficios: empleado cancela la suya
    const br3 = await prisma.benefitRequest.create({
      data: { benefitId: benefit.id, employeeId: empEmp.id, status: "PENDING" },
    });
    const brCancelRes = await fetch(`${BASE_URL}/api/rrhh-local/benefit-requests/${br3.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginEmp.cookie! },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    const brCancelData = await brCancelRes.json();
    ok("empleado cancela su beneficio", brCancelRes.status === 200 && brCancelData.status === "CANCELLED", brCancelData);

    // 14. Certificado laboral: jefe bloqueado (solo RRHH aprueba)
    const cert1 = await prisma.certificateRequest.create({
      data: { employeeId: empEmp.id, includeSalary: false, status: "PENDING" },
    });
    const certJefeBlockRes = await fetch(`${BASE_URL}/api/rrhh-local/certificates/${cert1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginJefe.cookie! },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    ok("jefe bloqueado en certificado (403 esperado)", certJefeBlockRes.status === 403);

    // 15. Certificado laboral: RRHH aprueba
    const cert2 = await prisma.certificateRequest.create({
      data: { employeeId: empEmp.id, includeSalary: true, status: "PENDING" },
    });
    const certApproveRes = await fetch(`${BASE_URL}/api/rrhh-local/certificates/${cert2.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginRrhh.cookie! },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    const certApproveData = await certApproveRes.json();
    ok("RRHH aprueba certificado", certApproveRes.status === 200 && certApproveData.status === "APPROVED", certApproveData);

    // 16. Certificado laboral: RRHH rechaza
    const cert3 = await prisma.certificateRequest.create({
      data: { employeeId: empEmp.id, includeSalary: false, status: "PENDING" },
    });
    const certRejectRes = await fetch(`${BASE_URL}/api/rrhh-local/certificates/${cert3.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: loginRrhh.cookie! },
      body: JSON.stringify({ status: "REJECTED", reviewNote: "Prueba rechazo certificado E2E" }),
    });
    const certRejectData = await certRejectRes.json();
    ok("RRHH rechaza certificado", certRejectRes.status === 200 && certRejectData.status === "REJECTED", certRejectData);

    console.log("\nResumen: revisar líneas FAIL arriba si las hay.");
  } finally {
    // Limpieza total
    await prisma.overtimeRequest.deleteMany({ where: { employeeId: empEmp.id } });
    await prisma.timeOffRequest.deleteMany({ where: { employeeId: empEmp.id } });
    await prisma.benefitRequest.deleteMany({ where: { employeeId: empEmp.id } });
    await prisma.certificateRequest.deleteMany({ where: { employeeId: empEmp.id } });
    await prisma.benefit.deleteMany({ where: { title: "Beneficio E2E Test" } });
    await prisma.employee.deleteMany({ where: { id: { in: [jefeEmp.id, empEmp.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [jefeUser.id, empUser.id, rrhhUser.id] } } });
    console.log("Limpieza completa: cuentas y solicitudes de prueba eliminadas.");
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
