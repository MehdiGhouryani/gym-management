/** سازنده‌ی CSV خالص — BOM برای اکسل فارسی، جداکننده کاما */

export type CsvRow = Record<string, string | number | null | undefined>;

/** رندر CSV از ردیف‌ها با ترتیب ستون مشخص */
export function toCsv(headers: string[], rows: CsvRow[]): string {
  const escape = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.map(escape).join(',');
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(',')).join('\n');
  // BOM تا اکسل فارسی را درست بخواند
  return `\uFEFF${head}\n${body}`;
}
