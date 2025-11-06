const currencyFormatter = new Intl.NumberFormat("ko-KR");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function toInputDateValue(dateString: string): string {
  // ISO 8601 날짜 문자열을 YYYY-MM-DD 형식으로 변환
  if (!dateString) return todayInputValue();

  // 이미 YYYY-MM-DD 형식이면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // ISO 8601 형식 (2025-11-04T00:00:00.000Z)을 파싱
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return todayInputValue();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0";
  }
  return currencyFormatter.format(Math.round(amount));
}

export function formatCurrencyInput(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return "";
  }
  return currencyFormatter.format(Math.abs(Math.round(amount)));
}

export function parseCurrencyInput(value: string): number {
  if (!value) {
    return 0;
  }
  const numeric = Number(value.replace(/[^\d-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateFormatter.format(date);
}

export function monthKey(date: string | Date): string {
  const instance = typeof date === "string" ? new Date(date) : date;
  const safe = Number.isNaN(instance.getTime()) ? new Date() : instance;
  const month = String(safe.getMonth() + 1).padStart(2, "0");
  return `${safe.getFullYear()}-${month}`;
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
}

export function distinct<T>(items: T[]): T[] {
  return Array.from(new Set(items)).filter((item) => Boolean(item));
}

export function getMonthRange(month: string): { from: string; to: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const from = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-${String(firstDay.getDate()).padStart(2, "0")}`;
  const to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
  return { from, to };
}

export function buildRecentMonths(length = 12): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(date));
  }
  return months;
}
