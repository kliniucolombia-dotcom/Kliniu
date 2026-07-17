"use client";
import { MdEventNote } from "react-icons/md";
import { TimeOffPage } from "../_components/time-off-page";

export default function PermisosPage() {
  return (
    <TimeOffPage
      type="PERMIT"
      title="Mis permisos"
      subtitle="Solicita un permiso personal"
      Icon={MdEventNote}
    />
  );
}
