import { notFound, redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getEffectivePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deliveryPhotoDataUrl } from "@/lib/delivery-photo";

export const dynamic = "force-dynamic";

const VEHICLE_LABEL: Record<string, string> = { CAMIONETA: "Camioneta", MOTO: "Moto", FURGON: "Furgón", CAMION: "Camión" };
const fmtDay = (d: Date) => d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "long" });
const fmt = (d: Date) => d.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" });

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className="text-sm font-semibold text-[#1A1A1A]">{value}</p>
    </div>
  );
}

// Comprobante de una entrega registrada por el conductor (solo entregas con resultado DELIVERED).
export default async function DeliveryReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") redirect("/login");
  const permission = await getEffectivePermission(user, "MODULE_LOGISTICA");
  if (!permission.canView || !prisma) notFound();

  const { id } = await params;
  const attempt = await prisma.deliveryAttempt.findUnique({
    where: { id },
    include: {
      order: { select: { customerName: true, customerPhone: true, department: true, city: true, addressLine1: true, addressLine2: true, totalItems: true } },
      route: { select: { date: true, vehicle: { select: { plate: true, type: true } }, driver: { select: { fullName: true } } } },
    },
  });
  if (!attempt || attempt.outcome !== "DELIVERED") notFound();

  const photo = attempt.photoPath ? await deliveryPhotoDataUrl(attempt.photoPath) : null;
  const { order, route } = attempt;
  const ref = `KL-${attempt.id.slice(-8).toUpperCase()}`;
  const address = [order.addressLine1, order.addressLine2, order.city, order.department].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-[900px] bg-white p-8 text-[#1A1A1A] print:p-0">
      <div className="flex items-start justify-between border-b-2 border-[#1A1A1A] pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Kliniu" className="h-14 w-auto object-contain" />
        <div className="text-right">
          <h1 className="text-2xl font-black tracking-wide">COMPROBANTE DE ENTREGA</h1>
          <p className="text-sm font-bold text-[#64748B]">N.º {ref}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Generado el {fmt(new Date())}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4">
        <Field label="Cliente" value={order.customerName} />
        <Field label="Teléfono" value={order.customerPhone} />
        <div className="col-span-2"><Field label="Dirección de entrega" value={address} /></div>
        <Field label="Unidades entregadas" value={String(order.totalItems)} />
        <Field label="Fecha y hora de entrega" value={fmt(attempt.recordedAt)} />
        <Field label="Conductor" value={route.driver.fullName} />
        <Field label="Vehículo" value={`${VEHICLE_LABEL[route.vehicle.type] ?? route.vehicle.type} · ${route.vehicle.plate}`} />
      </div>

      <div className="mt-5 rounded-xl border border-[#E2E8F0] p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Verificación de ubicación (GPS del conductor)</p>
        {attempt.lat != null && attempt.lng != null ? (
          <p className="mt-1 text-sm">
            {attempt.lat.toFixed(5)}, {attempt.lng.toFixed(5)}
            {attempt.accuracy != null ? ` · precisión ±${Math.round(attempt.accuracy)} m` : ""}
            {attempt.distanceM != null ? ` · a ${Math.round(attempt.distanceM)} m de la dirección registrada` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-[#64748B]">Sin ubicación GPS registrada en esta entrega.</p>
        )}
      </div>

      {attempt.note && (
        <div className="mt-4"><Field label="Nota del conductor" value={attempt.note} /></div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Foto de la entrega</p>
        {photo
          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photo} alt="Foto de la entrega" className="mx-auto max-h-[420px] rounded-xl border border-[#E2E8F0] object-contain" />
          : <p className="rounded-xl border border-dashed border-[#CBD5E1] p-6 text-center text-sm text-[#64748B]">Esta entrega no tiene foto disponible.</p>}
      </div>

      <div className="mt-8 border-t border-[#E2E8F0] pt-4 text-[10px] text-[#94A3B8]">
        <p>Documento generado por el sistema Kliniu con los datos registrados por el conductor en la ruta del {fmtDay(route.date)}. La hora, la ubicación y la foto provienen del teléfono del conductor al confirmar la entrega.</p>
      </div>
    </div>
  );
}
