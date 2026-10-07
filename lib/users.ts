import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";

export type RegisterUserInput = {
  fullName: string;
  company?: string;
  email: string;
  phone?: string;
  department?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  password: string;
};

export type PublicUser = {
  id: string;
  fullName: string;
  company: string | null;
  email: string;
  phone: string | null;
  whatsappPhone: string | null;
  department: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: Date;
};

export async function registerUser(input: RegisterUserInput) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const fullName = input.fullName.trim();
  const company = input.company?.trim() || null;
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const department = input.department?.trim() || null;
  const city = input.city?.trim() || null;
  const addressLine1 = input.addressLine1?.trim() || null;
  const addressLine2 = input.addressLine2?.trim() || null;

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      company,
      email,
      phone,
      department,
      city,
      addressLine1,
      addressLine2,
      passwordHash,
      // El route de registro ya exigió el checkbox de aceptación.
      acceptedTermsAt: new Date(),
    },
  });

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

// Confirma el correo solo si el token corresponde al correo actual de la cuenta:
// un enlace viejo no verifica un correo que el usuario ya cambió.
export async function markEmailVerified(userId: string, email: string): Promise<boolean> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const result = await prisma.user.updateMany({
    where: { id: userId, email: email.trim().toLowerCase(), status: "ACTIVE" },
    data: { emailVerifiedAt: new Date() },
  });

  return result.count > 0;
}

export async function authenticateUser(email: string, password: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordMatches = await compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("USER_NOT_ACTIVE");
  }

  return {
    id: user.id,
    fullName: user.fullName,
    company: user.company,
    email: user.email,
    phone: user.phone,
    department: user.department,
    city: user.city,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    role: user.role,
    status: user.status,
  };
}

export async function getUserById(userId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      company: true,
      email: true,
      phone: true,
      whatsappPhone: true,
      department: true,
      city: true,
      addressLine1: true,
      addressLine2: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      emailVerifiedAt: true,
    },
  });
}

export async function updateUserProfile(
  userId: string,
  input: {
    fullName: string;
    company?: string;
    email: string;
    phone?: string;
    department?: string;
    city?: string;
    addressLine1?: string;
    addressLine2?: string;
    newPassword?: string;
    currentPassword?: string;
  },
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  // Campo ausente = no se toca; cadena vacía = se borra. El modal de perfil del
  // panel solo envía nombre, correo, teléfono y empresa, y no debe vaciar el resto.
  const optional = (value: string | undefined) => (value === undefined ? undefined : value.trim() || null);
  const company = optional(input.company);
  const phone = optional(input.phone);
  const department = optional(input.department);
  const city = optional(input.city);
  const addressLine1 = optional(input.addressLine1);
  const addressLine2 = optional(input.addressLine2);

  const existingWithEmail = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: userId },
    },
  });

  if (existingWithEmail) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const data: {
    fullName: string;
    company?: string | null;
    email: string;
    phone?: string | null;
    department?: string | null;
    city?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    passwordHash?: string;
    emailVerifiedAt?: null;
  } = {
    fullName,
    company,
    email,
    phone,
    department,
    city,
    addressLine1,
    addressLine2,
  };

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });

  // Cambiar la contraseña o el correo exige la contraseña actual: una sesión robada
  // no basta para quedarse con la cuenta (con el correo cambiado, "olvidé mi
  // contraseña" entregaría la cuenta igual que cambiar la clave).
  const emailChanged = Boolean(current && current.email !== email);
  if (input.newPassword?.trim() || emailChanged) {
    if (!input.currentPassword) {
      throw new Error("CURRENT_PASSWORD_REQUIRED");
    }
    if (!current || !(await compare(input.currentPassword, current.passwordHash))) {
      throw new Error("INVALID_CREDENTIALS");
    }
  }

  if (input.newPassword?.trim()) {
    data.passwordHash = await hash(input.newPassword.trim(), 10);
  }

  // Un correo nuevo vuelve a quedar pendiente de confirmación.
  if (emailChanged) {
    data.emailVerifiedAt = null;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      fullName: true,
      company: true,
      email: true,
      phone: true,
      whatsappPhone: true,
      department: true,
      city: true,
      addressLine1: true,
      addressLine2: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return user;
}

// Copia de los datos personales del titular (derecho de acceso). Nunca incluye el hash.
export async function exportUserData(userId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const [profile, orders, pointTransactions, rewardRedemptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true, company: true, email: true, phone: true, whatsappPhone: true,
        department: true, city: true, addressLine1: true, addressLine2: true,
        level: true, points: true, bonusBalance: true, bonusExpiry: true,
        createdAt: true, emailVerifiedAt: true, acceptedTermsAt: true,
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, createdAt: true, status: true, paymentStatus: true,
        customerName: true, customerEmail: true, customerPhone: true, company: true,
        department: true, city: true, addressLine1: true, addressLine2: true, notes: true,
        totalItems: true, subtotal: true, shippingCost: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: { name: true, sku: true, quantity: true, unitPrice: true, lineTotal: true },
        },
      },
    }),
    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { type: true, points: true, balance: true, description: true, orderId: true, createdAt: true },
    }),
    prisma.rewardRedemption.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { points: true, status: true, createdAt: true, reward: { select: { name: true } } },
    }),
  ]);

  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }

  return { exportedAt: new Date(), profile, orders, pointTransactions, rewardRedemptions };
}

// Eliminación a petición del titular. Anonimiza en vez de borrar: los pedidos se
// conservan por obligación contable (con el snapshot de cliente que ya traen) y el
// correo original queda libre. Solo clientes; el personal lo gestiona un admin.
export async function anonymizeCustomerAccount(userId: string, password: string): Promise<void> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, passwordHash: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("USER_NOT_FOUND");
  }
  if (user.role !== "CUSTOMER") {
    throw new Error("NOT_CUSTOMER");
  }
  if (!(await compare(password, user.passwordHash))) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // Hash de un valor aleatorio que nadie conoce: la cuenta queda sin contraseña utilizable.
  const passwordHash = await hash(randomBytes(32).toString("hex"), 10);

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        fullName: "Cuenta eliminada",
        email: `deleted-${userId}@anon.invalid`,
        passwordHash,
        company: null,
        phone: null,
        whatsappPhone: null,
        department: null,
        city: null,
        addressLine1: null,
        addressLine2: null,
        avatarUrl: null,
        points: 0,
        bonusBalance: 0,
        bonusExpiry: null,
        emailVerifiedAt: null,
        status: "INACTIVE",
        deletedAt: new Date(),
      },
    }),
  ]);
}

export async function resetUserPassword(userId: string, newPassword: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const passwordHash = await hash(newPassword.trim(), 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function getUserByEmail(email: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      fullName: true,
      company: true,
      email: true,
      phone: true,
      department: true,
      city: true,
      addressLine1: true,
      addressLine2: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
}

export type CreateUserByAdminInput = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  avatarUrl?: string | null;
};

export async function createUserByAdmin(input: CreateUserByAdminInput): Promise<PublicUser> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName || !email || !input.password) {
    throw new Error("MISSING_FIELDS");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      role: input.role,
      avatarUrl: input.avatarUrl?.trim() || null,
      // La crea un administrador con un correo que él mismo define: nace verificada.
      emailVerifiedAt: new Date(),
    },
    select: {
      id: true, fullName: true, company: true, email: true, phone: true, whatsappPhone: true,
      department: true, city: true, addressLine1: true, addressLine2: true, avatarUrl: true,
      role: true, status: true, createdAt: true,
    },
  });

  return user;
}

export async function listUsers(): Promise<PublicUser[]> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, company: true, email: true, phone: true, whatsappPhone: true,
      department: true, city: true, addressLine1: true, addressLine2: true, avatarUrl: true,
      role: true, status: true, createdAt: true, backupUserId: true,
    },
  });
}

export type UpdateUserByAdminInput = {
  fullName?: string;
  email?: string;
  whatsappPhone?: string | null;
  role?: UserRole;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  newPassword?: string;
  /** Quién cubre a este usuario cuando falta; "" o null lo deja sin respaldo. */
  backupUserId?: string | null;
  /** URL de la foto de perfil; "" o null la elimina. */
  avatarUrl?: string | null;
};

export type UserDeletionImpact = {
  orders: number;
  quotations: number;
  campaigns: number;
  productionRuns: number;
  productionOrders: number;
  priceHistory: number;
  sellerConfig: number;
  ordersUnassigned: number;
  productionOrdersUnapproved: number;
};

export function hasDeletionImpact(impact: UserDeletionImpact): boolean {
  return (
    impact.orders > 0 || impact.quotations > 0 || impact.campaigns > 0 ||
    impact.productionRuns > 0 || impact.productionOrders > 0 || impact.priceHistory > 0 ||
    impact.sellerConfig > 0 || impact.ordersUnassigned > 0 || impact.productionOrdersUnapproved > 0
  );
}

export async function getUserDeletionImpact(userId: string): Promise<UserDeletionImpact> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  const [
    orders, quotations, campaigns, productionRuns, productionOrders,
    priceHistory, sellerCostConfig, saleCalculators, ordersUnassigned, productionOrdersUnapproved,
  ] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.quotation.count({ where: { OR: [{ sellerId: userId }, { clientId: userId }] } }),
    prisma.campaign.count({ where: { sellerId: userId } }),
    prisma.productionRun.count({ where: { operatorId: userId } }),
    prisma.productionOrder.count({ where: { createdById: userId } }),
    prisma.priceHistory.count({ where: { changedBy: userId } }),
    prisma.sellerCostConfig.count({ where: { userId } }),
    prisma.saleCalculator.count({ where: { userId } }),
    prisma.order.count({ where: { assignedSellerId: userId } }),
    prisma.productionOrder.count({ where: { approvedById: userId } }),
  ]);
  return {
    orders, quotations, campaigns, productionRuns, productionOrders,
    priceHistory, sellerConfig: sellerCostConfig + saleCalculators,
    ordersUnassigned, productionOrdersUnapproved,
  };
}

export async function deleteUserByAdmin(userId: string, options?: { force?: boolean }): Promise<void> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  if (!options?.force) {
    await prisma.user.delete({ where: { id: userId } });
    return;
  }

  await prisma.$transaction([
    // Desvincular referencias opcionales antes de borrar registros dependientes.
    prisma.productionRun.updateMany({
      where: { productionOrder: { createdById: userId } },
      data: { productionOrderId: null },
    }),
    prisma.order.updateMany({ where: { assignedSellerId: userId }, data: { assignedSellerId: null } }),
    prisma.productionOrder.updateMany({ where: { approvedById: userId }, data: { approvedById: null } }),
    // Borrar registros dependientes con FK requerida hacia el usuario.
    prisma.productionOrder.deleteMany({ where: { createdById: userId } }),
    prisma.productionRun.deleteMany({ where: { operatorId: userId } }),
    prisma.quotation.deleteMany({ where: { OR: [{ sellerId: userId }, { clientId: userId }] } }),
    prisma.campaign.deleteMany({ where: { sellerId: userId } }),
    prisma.priceHistory.deleteMany({ where: { changedBy: userId } }),
    prisma.sellerCostConfig.deleteMany({ where: { userId } }),
    prisma.saleCalculator.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}

export async function updateUserByAdmin(userId: string, input: UpdateUserByAdminInput): Promise<PublicUser> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const data: {
    fullName?: string; email?: string;
    whatsappPhone?: string | null;
    role?: UserRole;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    passwordHash?: string;
    backupUserId?: string | null;
    avatarUrl?: string | null;
  } = {};

  if (input.fullName?.trim()) data.fullName = input.fullName.trim();
  // Nadie puede ser su propio respaldo.
  if (input.backupUserId !== undefined) {
    const backupId = input.backupUserId || null;
    data.backupUserId = backupId === userId ? null : backupId;
  }
  if (input.role) data.role = input.role;
  if (input.status) data.status = input.status;
  if (input.whatsappPhone !== undefined) data.whatsappPhone = input.whatsappPhone?.trim() || null;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl?.trim() || null;

  if (input.email?.trim()) {
    const email = input.email.trim().toLowerCase();
    const existingWithEmail = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
    if (existingWithEmail) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
    data.email = email;
  }

  if (input.newPassword?.trim()) {
    data.passwordHash = await hash(input.newPassword.trim(), 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, fullName: true, company: true, email: true, phone: true, whatsappPhone: true,
      department: true, city: true, addressLine1: true, addressLine2: true, avatarUrl: true,
      role: true, status: true, createdAt: true,
    },
  });

  return user;
}
