import { prisma } from "@/lib/prisma";

export const MATERIAL_BUCKET = "material-comercial";

export type Crumb = { id: string; name: string };

type FolderNode = { id: string; name: string; parentId: string | null; isPrivate: boolean; createdById: string | null };

// Sube por parentId hasta la raíz. Máx 20 niveles como corte de seguridad por
// si alguna vez queda un ciclo en la tabla.
async function getAncestry(folderId: string | null): Promise<FolderNode[]> {
  if (!folderId || !prisma) return [];

  const chain: FolderNode[] = [];
  let currentId: string | null = folderId;

  for (let i = 0; i < 20 && currentId; i += 1) {
    const folder: FolderNode | null = await prisma.materialFolder.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true, isPrivate: true, createdById: true },
    });
    if (!folder) break;
    chain.unshift(folder);
    currentId = folder.parentId;
  }

  return chain;
}

export function canViewFolder(
  folder: { isPrivate: boolean; createdById: string | null },
  user: { id: string },
  superAdmin: boolean,
): boolean {
  return !folder.isPrivate || superAdmin || folder.createdById === user.id;
}

// Una carpeta solo es accesible si TODA su cadena de ancestros lo es: si no, se
// podría saltar una carpeta privada pidiendo directamente el id de una hija.
export async function resolveFolderAccess(
  folderId: string | null,
  user: { id: string },
  superAdmin: boolean,
): Promise<{ ok: true; breadcrumb: Crumb[] } | { ok: false }> {
  const chain = await getAncestry(folderId);
  if (folderId && !chain.length) return { ok: false };
  if (chain.some((f) => !canViewFolder(f, user, superAdmin))) return { ok: false };

  return { ok: true, breadcrumb: chain.map(({ id, name }) => ({ id, name })) };
}

// Recorre el subárbol de una carpeta. Devuelve las rutas de Storage (hay que
// borrarlas a mano antes de la cascada de la DB o quedan huérfanas) y si algo
// ahí dentro lo subió alguien distinto de `userId`.
export async function collectFolderContents(
  folderId: string,
  userId: string,
): Promise<{ paths: string[]; hasForeignContent: boolean }> {
  if (!prisma) return { paths: [], hasForeignContent: false };

  const paths: string[] = [];
  let hasForeignContent = false;
  let level = [folderId];

  for (let depth = 0; depth < 20 && level.length; depth += 1) {
    const [files, children] = await Promise.all([
      prisma.materialFile.findMany({
        where: { folderId: { in: level } },
        select: { path: true, createdById: true },
      }),
      prisma.materialFolder.findMany({
        where: { parentId: { in: level } },
        select: { id: true, createdById: true },
      }),
    ]);

    for (const file of files) {
      paths.push(file.path);
      if (file.createdById !== userId) hasForeignContent = true;
    }
    for (const child of children) {
      if (child.createdById !== userId) hasForeignContent = true;
    }

    level = children.map((c) => c.id);
  }

  return { paths, hasForeignContent };
}
