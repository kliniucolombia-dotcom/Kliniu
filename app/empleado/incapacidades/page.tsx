"use client";
import { MdHealthAndSafety } from "react-icons/md";
import { TimeOffPage } from "../_components/time-off-page";

export default function IncapacidadesPage() {
  return (
    <TimeOffPage
      type="INCAPACITY"
      title="Mis incapacidades"
      subtitle="Registra una incapacidad médica"
      Icon={MdHealthAndSafety}
    />
  );
}
