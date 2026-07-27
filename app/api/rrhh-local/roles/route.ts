import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  PACKING: "Empaque",
  SUPERADMIN: "Superadmin",
  RRHH: "Recursos Humanos",
  EMPLOYEE: "Empleado",
  BODEGA: "Bodega",
  DISENO: "Diseño",
  MARKETING: "Marketing",
  JEFE_VENTAS: "Jefe de Ventas",
  TESORERIA: "Tesorería",
  INGENIERIA: "Ingeniería",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Acceso total al sistema y configuración general.",
  SELLER: "Gestión de ventas y clientes.",
  PACKING: "Gestión de procesos y operaciones de empaque.",
  SUPERADMIN: "Control avanzado del sistema y seguridad.",
  RRHH: "Gestión de talento humano y documentación.",
  EMPLOYEE: "Acceso general para colaboradores.",
  BODEGA: "Control de inventario y stock en bodegas.",
  DISENO: "Gestión de piezas gráficas y diseño de marca.",
  MARKETING: "Gestión de campañas y contenido de marketing.",
  JEFE_VENTAS: "Supervisión del equipo comercial y metas de venta.",
  TESORERIA: "Gestión de pagos, cartera y finanzas.",
  INGENIERIA: "Acceso a módulos y herramientas de ingeniería.",
};

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const counts = await prisma.user.groupBy({
    by: ["role"],
    where: { role: { not: "CUSTOMER" } },
    _count: { _all: true },
  });

  const roles = counts
    .map((c) => ({
      role: c.role,
      name: ROLE_LABELS[c.role] ?? c.role,
      description: ROLE_DESCRIPTIONS[c.role] ?? "",
      userCount: c._count._all,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return Response.json(roles);
}
