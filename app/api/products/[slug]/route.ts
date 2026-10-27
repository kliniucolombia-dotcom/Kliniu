import {
  deleteProduct,
  extendProductOutlet,
  setProductOutletFlag,
  updateOutletProductPricing,
  updateProduct,
} from "@/lib/products";
import {
  getEffectivePermission,
  requireActiveUser,
  requireAnyPermission,
  requirePermission,
  type AuthResult,
} from "@/lib/permissions";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";

const OUTLET_OR_CATALOG_EDIT = [
  { module: "MODULE_OUTLET", action: "edit" },
  { module: "MODULE_PRODUCTOS", action: "edit" },
] as const;

async function isOutletProduct(slug: string) {
  if (!prisma) return false;
  const product = await prisma.product.findUnique({ where: { slug }, select: { isOutlet: true } });
  return product?.isOutlet === true;
}

function assertAccess(access: AuthResult): asserts access is Extract<AuthResult, { ok: true }> {
  if (!access.ok) throw new Error(access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN");
}

function getProductErrorResponse(
  error: unknown,
  fallbackMessage: string,
  databaseMessage: string,
) {
  const message =
    error instanceof Error && error.message === "UNAUTHORIZED"
      ? "No autorizado."
      : error instanceof Error && error.message === "FORBIDDEN"
        ? "No tienes permiso para esta acción."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? databaseMessage
          : error instanceof Error && error.message === "PRODUCT_NOT_FOUND"
            ? "No encontramos el producto que intentas editar."
            : fallbackMessage;

  const status =
    error instanceof Error && error.message === "UNAUTHORIZED"
      ? 401
      : error instanceof Error && error.message === "FORBIDDEN"
        ? 403
        : 500;

  const details =
    error instanceof Error &&
    ![
      "UNAUTHORIZED",
      "FORBIDDEN",
      "DATABASE_NOT_CONFIGURED",
      "PRODUCT_NOT_FOUND",
    ].includes(error.message)
      ? error.message
      : undefined;

  return Response.json(
    details ? { error: message, details } : { error: message },
    { status },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const ip = getClientIp(request);
  try {
    const { slug } = await context.params;
    const body = await request.json();

    // Poner/quitar de Outlet y extender su vigencia son operaciones de Outlet,
    // no del catálogo: las gobierna MODULE_OUTLET (o MODULE_PRODUCTOS).
    if (typeof body.isOutlet === "boolean" && Object.keys(body).length === 1) {
      const access = await requireAnyPermission([...OUTLET_OR_CATALOG_EDIT]);
      assertAccess(access);
      const product = await setProductOutletFlag(slug, body.isOutlet, { id: access.user.id, email: access.user.email, ip });
      return Response.json({ product });
    }

    if (typeof body.extendOutletDays === "number" && Object.keys(body).length === 1) {
      const access = await requireAnyPermission([...OUTLET_OR_CATALOG_EDIT]);
      assertAccess(access);
      const product = await extendProductOutlet(slug, body.extendOutletDays, { id: access.user.id, email: access.user.email, ip });
      return Response.json({ product });
    }

    // Editar la ficha: con permiso de catálogo se edita todo. Con permiso solo
    // de Outlet, únicamente precio y stock de un producto que ya esté en Outlet.
    const auth = await requireActiveUser();
    assertAccess(auth);
    const actor = { id: auth.user.id, email: auth.user.email, ip };

    const superAdmin = isSuperAdmin(auth.user);
    const canEditCatalog =
      superAdmin || (await getEffectivePermission(auth.user, "MODULE_PRODUCTOS")).canEdit;

    if (canEditCatalog) {
      const product = await updateProduct(slug, body, auth.user.id, actor);
      return Response.json({ product });
    }

    const canEditOutlet = (await getEffectivePermission(auth.user, "MODULE_OUTLET")).canEdit;
    if (!canEditOutlet || !(await isOutletProduct(slug))) {
      throw new Error("FORBIDDEN");
    }

    const product = await updateOutletProductPricing(slug, body, auth.user.id, actor);

    return Response.json({ product });
  } catch (error) {
    return getProductErrorResponse(
      error,
      "No fue posible actualizar el producto.",
      "Configura Supabase antes de editar productos desde el panel.",
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const access = await requirePermission("MODULE_PRODUCTOS", "delete");
    assertAccess(access);
    const { slug } = await context.params;
    await deleteProduct(slug, { id: access.user.id, email: access.user.email, ip: getClientIp(request) });

    return new Response(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "No autorizado."
        : error instanceof Error && error.message === "FORBIDDEN"
          ? "No tienes permiso para esta acción."
          : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
            ? "Configura Supabase antes de eliminar productos desde el panel."
            : "No fue posible eliminar el producto.";

    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error && error.message === "FORBIDDEN"
          ? 403
          : 500;

    return Response.json({ error: message }, { status });
  }
}
