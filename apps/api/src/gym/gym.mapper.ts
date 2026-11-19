export interface GymRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  status: string;
  expiringDays: number;
  graceDays: number;
}

export const toGymDto = (g: GymRow) => ({
  id: g.id,
  slug: g.slug,
  name: g.name,
  city: g.city,
  address: g.address,
  phone: g.phone,
  status: g.status,
  expiringDays: g.expiringDays,
  graceDays: g.graceDays,
});
