import { prisma } from "@/lib/prisma";

export const MATERIAL_BUCKET = "material-comercial";

export type Crumb = { id: string; name: string };

// Sube por parentId hasta la raíz. Máx 20 niveles como corte de seguridad por
// si alguna vez queda un ciclo en la tabla.
export async function getBreadcrumb(folderId: string | null): Promise<Crumb[]> {
  if (!folderId || !prisma) return [];

  const crumbs: Crumb[] = [];
  let currentId: string | null = folderId;

  for (let i = 0; i < 20 && currentId; i += 1) {
    const folder: { id: string; name: string; parentId: string | null } | null =
      await prisma.materialFolder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }

  return crumbs;
}

// Rutas de Storage de todos los archivos del subárbol, para poder limpiarlos
// antes de borrar la carpeta en la DB.
export async function collectFolderFilePaths(folderId: string): Promise<string[]> {
  if (!prisma) return [];

  const paths: string[] = [];
  let level = [folderId];

  for (let depth = 0; depth < 20 && level.length; depth += 1) {
    const [files, children] = await Promise.all([
      prisma.materialFile.findMany({ where: { folderId: { in: level } }, select: { path: true } }),
      prisma.materialFolder.findMany({ where: { parentId: { in: level } }, select: { id: true } }),
    ]);
    paths.push(...files.map((f) => f.path));
    level = children.map((c) => c.id);
  }

  return paths;
}
