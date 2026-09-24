// Clasificación de eficiencia (producidas vs. esperadas por ciclo).
// Verde = meta alcanzada (≥90%); ámbar = cerca (75–89%); rojo = por debajo (<75%).
export const efficiencyTone = (pct: number | null) => {
  if (pct === null) {
    return {
      label: "Sin ciclo",
      cardBg: "bg-white",
      border: "border-l-[#CBD5E1]",
      iconBg: "bg-[#F1F5F9]",
      iconFg: "text-[#64748B]",
      chip: "bg-[#F1F5F9] text-[#64748B]",
      bar: "bg-[#CBD5E1]",
    };
  }
  if (pct >= 90) {
    return {
      label: "Óptima",
      cardBg: "bg-[#F3FCF6]",
      border: "border-l-[#16A34A]",
      iconBg: "bg-[#DCFCE7]",
      iconFg: "text-[#15803D]",
      chip: "bg-[#DCFCE7] text-[#15803D]",
      bar: "bg-[#16A34A]",
    };
  }
  if (pct >= 75) {
    return {
      label: "Aceptable",
      cardBg: "bg-[#FFFAF0]",
      border: "border-l-[#F0A73C]",
      iconBg: "bg-[#FDEBCD]",
      iconFg: "text-[#B45309]",
      chip: "bg-[#FEF3C7] text-[#B45309]",
      bar: "bg-[#F0A73C]",
    };
  }
  return {
    label: "Baja",
    cardBg: "bg-[#FFF5F5]",
    border: "border-l-[#DC2626]",
    iconBg: "bg-[#FEE2E2]",
    iconFg: "text-[#B91C1C]",
    chip: "bg-[#FEE2E2] text-[#B91C1C]",
    bar: "bg-[#DC2626]",
  };
};
