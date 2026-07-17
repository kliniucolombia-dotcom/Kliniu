"use client";
import { MdBeachAccess } from "react-icons/md";
import { TimeOffPage } from "../_components/time-off-page";

export default function VacacionesPage() {
  return (
    <TimeOffPage
      type="VACATION"
      title="Mis vacaciones"
      subtitle="Solicita y revisa el estado de tus vacaciones"
      Icon={MdBeachAccess}
    />
  );
}
