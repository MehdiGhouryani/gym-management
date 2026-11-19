export interface PlanRow {
  id: string;
  name: string;
  days: number;
  price: number;
  active: boolean;
}

/** معادل ماهانه‌ی پلن (۳۰ روز)، گردشده به تومان */
export const planMonthly = (price: number, days: number): number => Math.round((price * 30) / days);

export const toPlanDto = (p: PlanRow) => ({
  id: p.id,
  name: p.name,
  days: p.days,
  price: p.price,
  active: p.active,
  monthlyPrice: planMonthly(p.price, p.days),
});
