import { redirect } from "next/navigation";

// El CRUD y la analítica de solicitudes viven ahora en /panel/tickets.
export default function SolicitudesRedirectPage() {
  redirect("/panel/tickets");
}
