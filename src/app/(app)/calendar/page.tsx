'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatMonth, formatMonthJa, getMonthStart, getMonthEnd, getPrevMonth, getNextMonth, formatDateJa } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, format, isSameMonth, isSameDay, parse,
} from 'date-fns';

export default function CalendarPage() {
    const supabase = createClient();
    const [currentMonth, setCurrentMonth] = useState(formatMonth(new Date()));
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const startDate = getMonthStart(currentMonth);
        const endDate = getMonthEnd(currentMonth);

        const { data } = await supabase
            .from('transactions')
            .select('*, category:categories(*), payment_method:payment_methods(*)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        setTransactions(data || []);
        setLoading(false);
    }, [currentMonth, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Build calendar grid
    const monthDate = parse(currentMonth, 'yyyy-MM', new Date());
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

    // Group transactions by date
    const txByDate: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((tx) => {
        if (!txByDate[tx.date]) txByDate[tx.date] = { income: 0, expense: 0 };
        if (tx.type === 'income') txByDate[tx.date].income += tx.amount;
        else txByDate[tx.date].expense += tx.amount;
    });

    // Selected day transactions
    const selectedTxs = selectedDate
        ? transactions.filter((tx) => tx.date === selectedDate)
        : [];

    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

    if (loading) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    return (
        <>
            <div className="mobile-header">
                <h1><img src="/icons/icon-192.png" alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', verticalAlign: 'middle', marginRight: '6px' }} />最強の家計簿</h1>
            </div>

            <div className="page-header">
                <h2>カレンダー</h2>
                <p>日別の収支を確認</p>
            </div>

            {/* Month Selector */}
            <div className="month-selector mb-4">
                <button className="btn btn-ghost btn-icon" onClick={() => { setCurrentMonth(getPrevMonth(currentMonth)); setSelectedDate(null); }}>
                    <ChevronLeft size={20} />
                </button>
                <span className="month-label">{formatMonthJa(currentMonth)}</span>
                <button className="btn btn-ghost btn-icon" onClick={() => { setCurrentMonth(getNextMonth(currentMonth)); setSelectedDate(null); }}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="card" style={{ padding: '16px' }}>
                {/* Week day headers */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '2px',
                    marginBottom: '4px',
                }}>
                    {weekDays.map((d, i) => (
                        <div key={d} style={{
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '4px 0',
                            color: i === 0 ? 'var(--expense-color)' : i === 6 ? 'var(--accent-primary)' : 'var(--text-muted)',
                        }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '2px',
                }}>
                    {calDays.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isCurrentMonth = isSameMonth(day, monthDate);
                        const isSelected = selectedDate === dateStr;
                        const isToday = isSameDay(day, new Date());
                        const dayData = txByDate[dateStr];
                        const dayOfWeek = day.getDay();

                        return (
                            <button
                                key={dateStr}
                                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '6px 2px',
                                    minHeight: '64px',
                                    border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    background: isSelected ? 'var(--accent-primary-light, rgba(99,102,241,0.1))' : 'transparent',
                                    cursor: 'pointer',
                                    opacity: isCurrentMonth ? 1 : 0.3,
                                    position: 'relative',
                                }}
                            >
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: isToday ? 700 : 400,
                                    color: isToday ? 'var(--accent-primary)' : dayOfWeek === 0 ? 'var(--expense-color)' : dayOfWeek === 6 ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    background: isToday ? 'var(--accent-primary-light, rgba(99,102,241,0.15))' : 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {format(day, 'd')}
                                </span>
                                {dayData && isCurrentMonth && (
                                    <div style={{ marginTop: '2px', textAlign: 'center' }}>
                                        {dayData.income > 0 && (
                                            <div style={{ fontSize: '0.6rem', color: 'var(--income-color)', lineHeight: 1.2 }}>
                                                +{dayData.income >= 10000 ? `${Math.round(dayData.income / 1000)}k` : dayData.income.toLocaleString()}
                                            </div>
                                        )}
                                        {dayData.expense > 0 && (
                                            <div style={{ fontSize: '0.6rem', color: 'var(--expense-color)', lineHeight: 1.2 }}>
                                                -{dayData.expense >= 10000 ? `${Math.round(dayData.expense / 1000)}k` : dayData.expense.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Detail */}
            {selectedDate && (
                <div className="card mt-4" style={{ padding: '16px' }}>
                    <h3 style={{ marginBottom: '12px' }}>
                        {formatDateJa(selectedDate)} の取引
                    </h3>
                    {selectedTxs.length === 0 ? (
                        <p className="text-muted text-sm">取引がありません</p>
                    ) : (
                        <div className="transaction-list">
                            {selectedTxs.map((tx) => (
                                <div key={tx.id} className="transaction-item">
                                    <div className="transaction-icon">{tx.category?.icon || '📁'}</div>
                                    <div className="transaction-info">
                                        <div className="tx-category">{tx.category?.name || '未分類'}</div>
                                        <div className="tx-meta">
                                            <span>{tx.payment_method?.name || ''}</span>
                                            {tx.memo && <span>• {tx.memo}</span>}
                                        </div>
                                    </div>
                                    <div className={`transaction-amount ${tx.type}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
