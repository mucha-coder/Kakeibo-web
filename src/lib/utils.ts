import { format, parse, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Transaction } from './types';

/** Format a number as JPY currency string */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        maximumFractionDigits: 0,
    }).format(amount);
}

/** Format date as YYYY-MM-DD */
export function formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/** Format date in Japanese style */
export function formatDateJa(dateStr: string): string {
    const date = new Date(dateStr);
    return format(date, 'M月d日(E)', { locale: ja });
}

/** Format month as YYYY-MM */
export function formatMonth(date: Date): string {
    return format(date, 'yyyy-MM');
}

/** Format month in Japanese display */
export function formatMonthJa(monthStr: string): string {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return format(date, 'yyyy年M月', { locale: ja });
}

/** Get start of month date */
export function getMonthStart(monthStr: string): string {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return formatDate(startOfMonth(date));
}

/** Get end of month date */
export function getMonthEnd(monthStr: string): string {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return formatDate(endOfMonth(date));
}

/** Get previous month string */
export function getPrevMonth(monthStr: string): string {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return formatMonth(subMonths(date, 1));
}

/** Get next month string */
export function getNextMonth(monthStr: string): string {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return formatMonth(addMonths(date, 1));
}

/** Calculate totals from transactions */
export function calculateTotals(transactions: Transaction[]) {
    const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
}

/** Generate CSV from transactions */
export function generateCSV(transactions: Transaction[]): string {
    const header = '日付,種別,カテゴリ,金額,支払方法,メモ';
    const rows = transactions.map((t) => {
        const type = t.type === 'income' ? '収入' : '支出';
        const category = t.category?.name || '';
        const method = t.payment_method?.name || '';
        const memo = `"${(t.memo || '').replace(/"/g, '""')}"`;
        return `${t.date},${type},${category},${t.amount},${method},${memo}`;
    });
    return '\uFEFF' + [header, ...rows].join('\n');
}

/** Download string as file */
export function downloadFile(content: string, filename: string, type = 'text/csv') {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/** Upcoming payment info */
export interface UpcomingPayment {
    methodName: string;
    methodIcon: string;
    amount: number;
    dueDate: string; // YYYY-MM-DD
    dueDateJa: string;
}

/** Calculate upcoming credit card payments */
export function getUpcomingPayments(
    paymentMethods: { id: string; name: string; icon: string; type: string; closing_day: number | null; payment_day: number | null }[],
    transactions: { payment_method_id: string | null; type: string; amount: number; date: string }[],
    today: Date = new Date(),
): UpcomingPayment[] {
    const results: UpcomingPayment[] = [];

    const creditCards = paymentMethods.filter(
        (pm) => pm.type === 'credit' && pm.closing_day !== null && pm.payment_day !== null,
    );

    for (const card of creditCards) {
        const closingDay = card.closing_day!;
        const paymentDay = card.payment_day!;

        // Determine the billing period: from last closing day to next closing day
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth(); // 0-indexed
        const todayDate = today.getDate();

        // Actual closing day considering month-end
        const effectiveClosing = closingDay === 0
            ? new Date(todayYear, todayMonth + 1, 0).getDate() // last day of current month
            : closingDay;

        // Determine the closing period
        let periodStart: Date;
        let periodEnd: Date;
        let dueMonth: number;
        let dueYear: number;

        if (todayDate <= effectiveClosing) {
            // We're before this month's closing -> billing covers (prev closing+1) to (this closing)
            const prevMonth = todayMonth === 0 ? 11 : todayMonth - 1;
            const prevYear = todayMonth === 0 ? todayYear - 1 : todayYear;
            const prevEffective = closingDay === 0
                ? new Date(prevYear, prevMonth + 1, 0).getDate()
                : closingDay;
            periodStart = new Date(prevYear, prevMonth, prevEffective + 1);
            periodEnd = new Date(todayYear, todayMonth, effectiveClosing);
            // Payment is next month
            dueMonth = todayMonth + 1;
            dueYear = todayYear;
            if (dueMonth > 11) { dueMonth = 0; dueYear++; }
        } else {
            // After closing -> billing covers (this closing+1) to (next closing)
            periodStart = new Date(todayYear, todayMonth, effectiveClosing + 1);
            const nextMonth = todayMonth + 1 > 11 ? 0 : todayMonth + 1;
            const nextYear = todayMonth + 1 > 11 ? todayYear + 1 : todayYear;
            const nextEffective = closingDay === 0
                ? new Date(nextYear, nextMonth + 1, 0).getDate()
                : closingDay;
            periodEnd = new Date(nextYear, nextMonth, nextEffective);
            // Payment is month after next
            dueMonth = todayMonth + 2;
            dueYear = todayYear;
            if (dueMonth > 11) { dueMonth -= 12; dueYear++; }
        }

        const periodStartStr = formatDate(periodStart);
        const periodEndStr = formatDate(periodEnd);

        // Sum transactions in this billing period for this card
        const amount = transactions
            .filter((tx) =>
                tx.payment_method_id === card.id &&
                tx.type === 'expense' &&
                tx.date >= periodStartStr &&
                tx.date <= periodEndStr
            )
            .reduce((sum, tx) => sum + tx.amount, 0);

        if (amount > 0) {
            const dueDate = new Date(dueYear, dueMonth, paymentDay);
            results.push({
                methodName: card.name,
                methodIcon: card.icon,
                amount,
                dueDate: formatDate(dueDate),
                dueDateJa: formatDateJa(formatDate(dueDate)),
            });
        }
    }

    return results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Chart color palette */
export const CHART_COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#84cc16', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#2563eb', '#7c3aed',
];

/** Parse CSV text into rows of string arrays */
export function parseCSVText(text: string): string[][] {
    const lines = text.trim().split(/\r?\n/);
    return lines.map((line) => {
        const row: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
                else if (ch === '"') { inQuotes = false; }
                else { current += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === ',') { row.push(current.trim()); current = ''; }
                else { current += ch; }
            }
        }
        row.push(current.trim());
        return row;
    });
}

/** Parsed CSV import row */
export interface CSVImportRow {
    date: string;
    amount: number;
    type: 'income' | 'expense';
    memo: string;
}

/** Map PayPay CSV to import rows */
export function mapPayPayCSV(rows: string[][]): CSVImportRow[] {
    // PayPay CSV typically: 取引日時, 取引内容, 金額, ...
    // Skip header row
    if (rows.length <= 1) return [];
    const header = rows[0].map((h) => h.toLowerCase());
    const dateIdx = header.findIndex((h) => h.includes('日') || h.includes('date'));
    const amountIdx = header.findIndex((h) => h.includes('金額') || h.includes('amount'));
    const memoIdx = header.findIndex((h) => h.includes('内容') || h.includes('取引') || h.includes('memo'));

    if (dateIdx < 0 || amountIdx < 0) return [];

    return rows.slice(1).filter((r) => r.length > Math.max(dateIdx, amountIdx)).map((r) => {
        const rawDate = r[dateIdx];
        // Normalize date: try various formats
        const dateMatch = rawDate.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        const date = dateMatch
            ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
            : rawDate;

        const rawAmount = r[amountIdx].replace(/[,¥￥]/g, '');
        const amount = Math.abs(parseInt(rawAmount, 10) || 0);
        const isIncome = parseInt(rawAmount, 10) > 0;

        return {
            date,
            amount,
            type: isIncome ? 'income' as const : 'expense' as const,
            memo: memoIdx >= 0 ? r[memoIdx] : '',
        };
    }).filter((r) => r.amount > 0);
}

/** Map generic CSV (日付,金額,メモ) */
export function mapGenericCSV(rows: string[][]): CSVImportRow[] {
    if (rows.length <= 1) return [];
    return rows.slice(1).filter((r) => r.length >= 2).map((r) => {
        const rawDate = r[0];
        const dateMatch = rawDate.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        const date = dateMatch
            ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
            : rawDate;
        const rawAmount = r[1].replace(/[,¥￥]/g, '');
        const amount = Math.abs(parseInt(rawAmount, 10) || 0);
        const isIncome = parseInt(rawAmount, 10) > 0;
        return {
            date,
            amount,
            type: isIncome ? 'income' as const : 'expense' as const,
            memo: r[2] || '',
        };
    }).filter((r) => r.amount > 0);
}
