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
  role: "CUSTOMER" | "ADMIN";
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
      createdAt: true,
    },
  });

  return user;
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
      createdAt: true,
    },
  });
}
