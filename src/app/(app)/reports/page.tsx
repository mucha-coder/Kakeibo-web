'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatMonth, formatMonthJa, getMonthStart, getMonthEnd, CHART_COLORS } from '@/lib/utils';
import { subMonths } from 'date-fns';
import type { Transaction, Category, MonthlyData, CategoryData, PaymentMethodRecord } from '@/lib/types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';

type Period = '3' | '6' | '12';

export default function ReportsPage() {
    const supabase = createClient();
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [incomeCategoryData, setIncomeCategoryData] = useState<CategoryData[]>([]);
    const [paymentMethodData, setPaymentMethodData] = useState<{ name: string; icon: string; amount: number; color: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'monthly' | 'category' | 'payment'>('monthly');
    const [period, setPeriod] = useState<Period>('12');
    const currentMonth = formatMonth(new Date());

    const fetchData = useCallback(async () => {
        setLoading(true);
        const monthCount = parseInt(period, 10);

        // Generate months
        const months: string[] = [];
        for (let i = monthCount - 1; i >= 0; i--) {
            months.push(formatMonth(subMonths(new Date(), i)));
        }

        const startDate = getMonthStart(months[0]);
        const endDate = getMonthEnd(months[months.length - 1]);

        const [txRes, catRes, pmRes] = await Promise.all([
            supabase
                .from('transactions')
                .select('*, category:categories(*), payment_method:payment_methods(*)')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true }),
            supabase.from('categories').select('*'),
            supabase.from('payment_methods').select('*').order('sort_order', { ascending: true }),
        ]);

        const txs: Transaction[] = txRes.data || [];
        const cats: Category[] = catRes.data || [];
        const pms: PaymentMethodRecord[] = pmRes.data || [];

        // Monthly data
        const mData: MonthlyData[] = months.map((month) => {
            const monthStart = getMonthStart(month);
            const monthEnd = getMonthEnd(month);
            const monthTxs = txs.filter((t) => t.date >= monthStart && t.date <= monthEnd);
            const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            return {
                month: month.slice(5) + '月',
                income,
                expense,
                balance: income - expense,
            };
        });
        setMonthlyData(mData);

        // Category data for current month
        const cmStart = getMonthStart(currentMonth);
        const cmEnd = getMonthEnd(currentMonth);
        const currentTxs = txs.filter((t) => t.date >= cmStart && t.date <= cmEnd);

        // Expense categories
        const expenseTxs = currentTxs.filter((t) => t.type === 'expense');
        const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0);
        const expenseByCat: Record<string, { name: string; icon: string; amount: number }> = {};
        expenseTxs.forEach((t) => {
            const catId = t.category_id || 'uncategorized';
            const cat = cats.find((c) => c.id === catId);
            if (!expenseByCat[catId]) {
                expenseByCat[catId] = { name: cat?.name || '未分類', icon: cat?.icon || '📁', amount: 0 };
            }
            expenseByCat[catId].amount += t.amount;
        });
        const cData: CategoryData[] = Object.values(expenseByCat)
            .sort((a, b) => b.amount - a.amount)
            .map((item, i) => ({
                ...item,
                percentage: totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0,
                color: CHART_COLORS[i % CHART_COLORS.length],
            }));
        setCategoryData(cData);

        // Income categories
        const incomeTxs = currentTxs.filter((t) => t.type === 'income');
        const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);
        const incomeByCat: Record<string, { name: string; icon: string; amount: number }> = {};
        incomeTxs.forEach((t) => {
            const catId = t.category_id || 'uncategorized';
            const cat = cats.find((c) => c.id === catId);
            if (!incomeByCat[catId]) {
                incomeByCat[catId] = { name: cat?.name || '未分類', icon: cat?.icon || '📁', amount: 0 };
            }
            incomeByCat[catId].amount += t.amount;
        });
        const iData: CategoryData[] = Object.values(incomeByCat)
            .sort((a, b) => b.amount - a.amount)
            .map((item, i) => ({
                ...item,
                percentage: totalIncome > 0 ? Math.round((item.amount / totalIncome) * 100) : 0,
                color: CHART_COLORS[i % CHART_COLORS.length],
            }));
        setIncomeCategoryData(iData);

        // Payment method data (current month expenses)
        const pmExpenseTotal = expenseTxs.reduce((s, t) => s + t.amount, 0);
        const pmByMethod: Record<string, { name: string; icon: string; amount: number }> = {};
        expenseTxs.forEach((t) => {
            const pmId = t.payment_method_id || 'none';
            const pm = pms.find((p) => p.id === pmId);
            const key = pm ? pm.id : 'none';
            if (!pmByMethod[key]) {
                pmByMethod[key] = { name: pm?.name || '未設定', icon: pm?.icon || '❓', amount: 0 };
            }
            pmByMethod[key].amount += t.amount;
        });
        const pmData = Object.values(pmByMethod)
            .sort((a, b) => b.amount - a.amount)
            .map((item, i) => ({
                ...item,
                color: CHART_COLORS[i % CHART_COLORS.length],
            }));
        setPaymentMethodData(pmData);

        setLoading(false);
    }, [currentMonth, period, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    return (
        <>
            <div className="mobile-header">
                <h1><img src="/icons/icon-192.png" alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', verticalAlign: 'middle', marginRight: '6px' }} />最強の家計簿</h1>
            </div>

            <div className="page-header">
                <h2>レポート</h2>
                <p>収支の分析と可視化</p>
            </div>

            {/* Period Filter */}
            <div className="flex gap-2 mb-4">
                {(['3', '6', '12'] as Period[]).map((p) => (
                    <button
                        key={p}
                        className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPeriod(p)}
                    >
                        {p}ヶ月
                    </button>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab-btn ${tab === 'monthly' ? 'active' : ''}`}
                    onClick={() => setTab('monthly')}
                >
                    月別推移
                </button>
                <button
                    className={`tab-btn ${tab === 'category' ? 'active' : ''}`}
                    onClick={() => setTab('category')}
                >
                    カテゴリ別
                </button>
                <button
                    className={`tab-btn ${tab === 'payment' ? 'active' : ''}`}
                    onClick={() => setTab('payment')}
                >
                    支払方法別
                </button>
            </div>

            {tab === 'monthly' && (
                <div className="chart-container">
                    <h3>月別収支推移（過去{period}ヶ月）</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis
                                dataKey="month"
                                stroke="var(--text-muted)"
                                fontSize={12}
                            />
                            <YAxis
                                stroke="var(--text-muted)"
                                fontSize={12}
                                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-modal)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                }}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend />
                            <Bar dataKey="income" name="収入" fill="var(--income-color)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="支出" fill="var(--expense-color)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {tab === 'category' && (
                <div className="grid-2">
                    {/* Expense Pie */}
                    <div className="chart-container">
                        <h3>支出カテゴリ（{formatMonthJa(currentMonth)}）</h3>
                        {categoryData.length === 0 ? (
                            <div className="empty-state">
                                <p>データがありません</p>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="amount"
                                            nameKey="name"
                                        >
                                            {categoryData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--bg-modal)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                color: 'var(--text-primary)',
                                            }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-col gap-2 mt-2">
                                    {categoryData.map((cat, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
                                                <span className="text-sm">{cat.icon} {cat.name}</span>
                                            </div>
                                            <span className="text-sm">
                                                {formatCurrency(cat.amount)} ({cat.percentage}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Income Pie */}
                    <div className="chart-container">
                        <h3>収入カテゴリ（{formatMonthJa(currentMonth)}）</h3>
                        {incomeCategoryData.length === 0 ? (
                            <div className="empty-state">
                                <p>データがありません</p>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={incomeCategoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="amount"
                                            nameKey="name"
                                        >
                                            {incomeCategoryData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--bg-modal)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                color: 'var(--text-primary)',
                                            }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-col gap-2 mt-2">
                                    {incomeCategoryData.map((cat, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
                                                <span className="text-sm">{cat.icon} {cat.name}</span>
                                            </div>
                                            <span className="text-sm">
                                                {formatCurrency(cat.amount)} ({cat.percentage}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {tab === 'payment' && (
                <div className="chart-container">
                    <h3>支払方法別 支出（{formatMonthJa(currentMonth)}）</h3>
                    {paymentMethodData.length === 0 ? (
                        <div className="empty-state">
                            <p>データがありません</p>
                        </div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={paymentMethodData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis
                                        type="number"
                                        stroke="var(--text-muted)"
                                        fontSize={12}
                                        tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        stroke="var(--text-muted)"
                                        fontSize={12}
                                        width={80}
                                        tickFormatter={(v: string) => v.length > 8 ? v.slice(0, 8) + '…' : v}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-modal)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                        }}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Bar dataKey="amount" name="支出" radius={[0, 4, 4, 0]}>
                                        {paymentMethodData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>

                            {/* List view */}
                            <div className="flex flex-col gap-3 mt-4">
                                {paymentMethodData.map((pm, i) => {
                                    const total = paymentMethodData.reduce((s, p) => s + p.amount, 0);
                                    const pct = total > 0 ? (pm.amount / total * 100).toFixed(1) : '0';
                                    return (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div style={{ width: 12, height: 12, borderRadius: 3, background: pm.color }} />
                                                <span>{pm.icon} {pm.name}</span>
                                            </div>
                                            <span style={{ fontWeight: 600 }}>
                                                {formatCurrency(pm.amount)} ({pct}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
