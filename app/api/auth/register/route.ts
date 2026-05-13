import { registerUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      company?: string;
      email?: string;
      phone?: string;
      department?: string;
      city?: string;
      addressLine1?: string;
      addressLine2?: string;
      password?: string;
      confirmPassword?: string;
    };

    const fullName = body.fullName?.trim() || "";
    const email = body.email?.trim() || "";
    const department = body.department?.trim() || "";
    const city = body.city?.trim() || "";
    const addressLine1 = body.addressLine1?.trim() || "";
    const password = body.password || "";
    const confirmPassword = body.confirmPassword || "";

    if (!fullName || !email || !department || !city || !addressLine1 || !password || !confirmPassword) {
      return Response.json(
        { error: "Completa todos los campos obligatorios." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return Response.json(
        { error: "Las contraseñas no coinciden." },
        { status: 400 },
      );
    }

    const user = await registerUser({
      fullName,
      company: body.company,
      email,
      phone: body.phone,
      department,
      city,
      addressLine1,
      addressLine2: body.addressLine2,
      password,
    });

    return Response.json(
      {
        user,
        message: "Cuenta creada correctamente.",
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS"
        ? "Ya existe una cuenta registrada con ese correo."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? "La base de datos no está configurada todavía."
          : "No fue posible crear la cuenta.";

    return Response.json({ error: message }, { status: 500 });
  }
}
