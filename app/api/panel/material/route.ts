import { requirePermission, requireSuperAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { MATERIAL_BUCKET, getBreadcrumb, collectFolderFilePaths } from "@/lib/material";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const folderId = new URL(request.url).searchParams.get("folder") || null;

  const [folders, files, breadcrumb] = await Promise.all([
    prisma.materialFolder.findMany({ where: { parentId: folderId }, orderBy: { name: "asc" } }),
    prisma.materialFile.findMany({ where: { folderId }, orderBy: { createdAt: "desc" } }),
    getBreadcrumb(folderId),
  ]);

  return Response.json({ breadcrumb, folders, files });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { name, parentId } = (await request.json()) as { name?: string; parentId?: string | null };
  if (!name?.trim()) return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const folder = await prisma.materialFolder.create({
    data: { name: name.trim(), parentId: parentId || null, createdById: access.user.id },
  });

  return Response.json(folder, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { type, id, name } = (await request.json()) as { type?: string; id?: string; name?: string };
  if (!id || !name?.trim()) return Response.json({ error: "Datos incompletos" }, { status: 400 });

  if (type === "folder") {
    await prisma.materialFolder.update({ where: { id }, data: { name: name.trim() } });
  } else {
    await prisma.materialFile.update({ where: { id }, data: { name: name.trim() } });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  // Borrar es irreversible y arrastra el subárbol completo: solo SUPERADMIN.
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const id = params.get("id");
  if (!id) return Response.json({ error: "id es obligatorio" }, { status: 400 });

  const supabase = createSupabaseStorageClient();

  if (type === "folder") {
    // Los archivos del árbol se borran en cascada en la DB, pero el objeto en
    // Storage hay que quitarlo a mano o queda huérfano ocupando espacio.
    const paths = await collectFolderFilePaths(id);
    if (supabase && paths.length) await supabase.storage.from(MATERIAL_BUCKET).remove(paths);
    await prisma.materialFolder.delete({ where: { id } });
  } else {
    const file = await prisma.materialFile.findUnique({ where: { id } });
    if (!file) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
    if (supabase) await supabase.storage.from(MATERIAL_BUCKET).remove([file.path]);
    await prisma.materialFile.delete({ where: { id } });
  }

  return Response.json({ ok: true });
}
