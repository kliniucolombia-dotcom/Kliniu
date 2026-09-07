import { requirePermission } from "@/lib/permissions";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { MATERIAL_BUCKET, canViewFolder, resolveFolderAccess, collectFolderContents } from "@/lib/material";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const folderId = new URL(request.url).searchParams.get("folder") || null;
  const superAdmin = isSuperAdmin(access.user);

  const path = await resolveFolderAccess(folderId, access.user, superAdmin);
  if (!path.ok) return Response.json({ error: "Carpeta no encontrada" }, { status: 404 });

  const [folders, files] = await Promise.all([
    prisma.materialFolder.findMany({ where: { parentId: folderId }, orderBy: { name: "asc" } }),
    prisma.materialFile.findMany({ where: { folderId }, orderBy: { createdAt: "desc" } }),
  ]);

  // El cliente no debe adivinar quién puede borrar qué: se lo decimos aquí para
  // no pintar botones que el servidor iba a rechazar igual.
  const canDelete = (createdById: string | null) => superAdmin || createdById === access.user.id;

  return Response.json({
    breadcrumb: path.breadcrumb,
    folders: folders
      .filter((f) => canViewFolder(f, access.user, superAdmin))
      .map((f) => ({ ...f, canDelete: canDelete(f.createdById) })),
    files: files.map((f) => ({ ...f, canDelete: canDelete(f.createdById) })),
  });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { name, parentId, isPrivate } = (await request.json()) as {
    name?: string;
    parentId?: string | null;
    isPrivate?: boolean;
  };
  if (!name?.trim()) return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });

  // No se puede colgar nada de una carpeta que ni siquiera puedes ver.
  const parentAccess = await resolveFolderAccess(parentId || null, access.user, isSuperAdmin(access.user));
  if (!parentAccess.ok) return Response.json({ error: "Carpeta no encontrada" }, { status: 404 });

  const folder = await prisma.materialFolder.create({
    data: {
      name: name.trim(),
      isPrivate: isPrivate === true,
      parentId: parentId || null,
      createdById: access.user.id,
    },
  });

  return Response.json(folder, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { type, id, name } = (await request.json()) as { type?: string; id?: string; name?: string };
  if (!id || !name?.trim()) return Response.json({ error: "Datos incompletos" }, { status: 400 });

  const superAdmin = isSuperAdmin(access.user);

  if (type === "folder") {
    const folder = await prisma.materialFolder.findUnique({ where: { id } });
    if (!folder) return Response.json({ error: "Carpeta no encontrada" }, { status: 404 });

    const reachable = await resolveFolderAccess(id, access.user, superAdmin);
    if (!reachable.ok) return Response.json({ error: "Carpeta no encontrada" }, { status: 404 });

    await prisma.materialFolder.update({ where: { id }, data: { name: name.trim() } });
  } else {
    const file = await prisma.materialFile.findUnique({ where: { id } });
    if (!file) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });

    const reachable = await resolveFolderAccess(file.folderId, access.user, superAdmin);
    if (!reachable.ok) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });

    await prisma.materialFile.update({ where: { id }, data: { name: name.trim() } });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const id = params.get("id");
  if (!id) return Response.json({ error: "id es obligatorio" }, { status: 400 });

  // Solo SUPERADMIN borra material ajeno; el resto, únicamente lo que subió.
  const superAdmin = isSuperAdmin(access.user);
  const supabase = createSupabaseStorageClient();

  if (type === "folder") {
    const folder = await prisma.materialFolder.findUnique({ where: { id } });
    if (!folder) return Response.json({ error: "Carpeta no encontrada" }, { status: 404 });

    if (!superAdmin && folder.createdById !== access.user.id) {
      return Response.json({ error: "Solo puedes eliminar las carpetas que creaste." }, { status: 403 });
    }

    // Borrar arrastra el subárbol entero, así que una carpeta propia con
    // material de otros tampoco se puede tumbar sin ser SUPERADMIN.
    const { paths, hasForeignContent } = await collectFolderContents(id, access.user.id);
    if (!superAdmin && hasForeignContent) {
      return Response.json(
        { error: "Esta carpeta contiene material de otras personas. Pide a un superadmin que la elimine." },
        { status: 403 },
      );
    }

    if (supabase && paths.length) await supabase.storage.from(MATERIAL_BUCKET).remove(paths);
    await prisma.materialFolder.delete({ where: { id } });
  } else {
    const file = await prisma.materialFile.findUnique({ where: { id } });
    if (!file) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });

    if (!superAdmin && file.createdById !== access.user.id) {
      return Response.json({ error: "Solo puedes eliminar los archivos que subiste." }, { status: 403 });
    }

    if (supabase) await supabase.storage.from(MATERIAL_BUCKET).remove([file.path]);
    await prisma.materialFile.delete({ where: { id } });
  }

  return Response.json({ ok: true });
}
