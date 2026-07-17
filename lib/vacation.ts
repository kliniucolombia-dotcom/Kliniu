/** Colombia: 15 días hábiles de vacaciones por cada 365 días trabajados. */
const VACATION_DAYS_PER_YEAR = 15;
const DAYS_PER_YEAR = 365;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type VacationTimeOff = { type: string; status: string; durationDays: number };

export type VacationBalance = {
  diasTrabajados: number;
  diasCausados: number;
  diasTomados: number;
  diasPendientes: number;
  diasDisponibles: number;
};

export function calcVacationBalance(hireDate: Date, requests: VacationTimeOff[], asOf: Date = new Date()): VacationBalance {
  const diasTrabajados = Math.max(0, Math.floor((asOf.getTime() - hireDate.getTime()) / MS_PER_DAY));
  const diasCausados = round2((diasTrabajados * VACATION_DAYS_PER_YEAR) / DAYS_PER_YEAR);

  const vacationRequests = requests.filter((r) => r.type === "VACATION");
  const diasTomados = round2(
    vacationRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.durationDays, 0),
  );
  const diasPendientes = round2(
    vacationRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + r.durationDays, 0),
  );
  const diasDisponibles = round2(Math.max(0, diasCausados - diasTomados - diasPendientes));

  return { diasTrabajados, diasCausados, diasTomados, diasPendientes, diasDisponibles };
}
