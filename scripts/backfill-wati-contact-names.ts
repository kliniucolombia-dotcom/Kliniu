import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { getWatiContactNames } from "../lib/wati.ts";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const names = await getWatiContactNames();
  console.log(`contactos en WATI: ${names.size}`);

  const conversations = await prisma.watiConversation.findMany({
    select: { id: true, phone: true, contactName: true },
  });

  let updated = 0;
  let skipped = 0;
  for (const conversation of conversations) {
    const digits = conversation.phone.replace(/\D/g, "");
    const name = names.get(digits);
    if (!name || name === conversation.contactName) {
      skipped += 1;
      continue;
    }
    await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: { contactName: name },
    });
    updated += 1;
  }

  console.log(`actualizadas: ${updated} · sin cambio: ${skipped} · total: ${conversations.length}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
