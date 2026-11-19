import { EmptyState } from '../../../src/ui/index';

/** در فاز ۷ با داشبورد و در فاز ۲۱ با گزارش‌های پیشرفته جایگزین می‌شود */
export default function ReportsPlaceholder() {
  return <EmptyState title="گزارش‌ها" hint="این بخش در فازهای بعد تکمیل می‌شود." />;
}
