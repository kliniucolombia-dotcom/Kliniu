import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
  department: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH" | "EMPLOYEE";
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
    },
  });

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
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
      department: true,
      city: true,
      addressLine1: true,
      addressLine2: true,
      role: true,
      status: true,
      createdAt: true,
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
  },
) {
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
    company: string | null;
    email: string;
    phone: string | null;
    department: string | null;
    city: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    passwordHash?: string;
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

  if (input.newPassword?.trim()) {
    data.passwordHash = await hash(input.newPassword.trim(), 10);
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
  role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH" | "EMPLOYEE";
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
    },
    select: {
      id: true, fullName: true, company: true, email: true, phone: true,
      department: true, city: true, addressLine1: true, addressLine2: true,
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
      id: true, fullName: true, company: true, email: true, phone: true,
      department: true, city: true, addressLine1: true, addressLine2: true,
      role: true, status: true, createdAt: true,
    },
  });
}

export type UpdateUserByAdminInput = {
  fullName?: string;
  email?: string;
  role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH";
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  newPassword?: string;
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
    role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    passwordHash?: string;
  } = {};

  if (input.fullName?.trim()) data.fullName = input.fullName.trim();
  if (input.role) data.role = input.role;
  if (input.status) data.status = input.status;

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
      id: true, fullName: true, company: true, email: true, phone: true,
      department: true, city: true, addressLine1: true, addressLine2: true,
      role: true, status: true, createdAt: true,
    },
  });

  return user;
}
