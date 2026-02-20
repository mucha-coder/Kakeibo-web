'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatMonth, formatMonthJa, formatDateJa, getMonthStart, getMonthEnd, getPrevMonth, getNextMonth, calculateTotals, getUpcomingPayments, CHART_COLORS } from '@/lib/utils';
import type { UpcomingPayment } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Transaction, Category, BudgetStatus, PaymentMethodRecord, CategoryData } from '@/lib/types';
import TransactionModal from '@/components/transactions/TransactionModal';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
    const supabase = createClient();
    const [currentMonth, setCurrentMonth] = useState(formatMonth(new Date()));
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
    const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
    const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
    const [expenseCategoryData, setExpenseCategoryData] = useState<CategoryData[]>([]);
    const [incomeCategoryData, setIncomeCategoryData] = useState<CategoryData[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const startDate = getMonthStart(currentMonth);
        const endDate = getMonthEnd(currentMonth);

        const [allTxRes, catRes, budgetRes, pmRes] = await Promise.all([
            supabase
                .from('transactions')
                .select('*, category:categories(*), payment_method:payment_methods(*)')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false }),
            supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true }),
            supabase
                .from('budgets')
                .select('*, category:categories(*)')
                .eq('month', currentMonth),
            supabase
                .from('payment_methods')
                .select('*')
                .order('sort_order', { ascending: true }),
        ]);

        const allTxs: Transaction[] = allTxRes.data || [];
        const cats: Category[] = catRes.data || [];

        setTransactions(allTxs.slice(0, 10));
        setCategories(cats);
        setPaymentMethods(pmRes.data || []);

        // Expense by category
        const eTxs = allTxs.filter((t) => t.type === 'expense');
        const totalExp = eTxs.reduce((s, t) => s + t.amount, 0);
        const eByCat: Record<string, { name: string; icon: string; amount: number }> = {};
        eTxs.forEach((t) => {
            const cat = cats.find((c) => c.id === t.category_id);
            const key = t.category_id || 'none';
            if (!eByCat[key]) eByCat[key] = { name: cat?.name || '未分類', icon: cat?.icon || '📁', amount: 0 };
            eByCat[key].amount += t.amount;
        });
        setExpenseCategoryData(
            Object.values(eByCat).sort((a, b) => b.amount - a.amount).map((item, i) => ({
                ...item, percentage: totalExp > 0 ? Math.round((item.amount / totalExp) * 100) : 0,
                color: CHART_COLORS[i % CHART_COLORS.length],
            }))
        );

        // Income by category
        const iTxs = allTxs.filter((t) => t.type === 'income');
        const totalInc = iTxs.reduce((s, t) => s + t.amount, 0);
        const iByCat: Record<string, { name: string; icon: string; amount: number }> = {};
        iTxs.forEach((t) => {
            const cat = cats.find((c) => c.id === t.category_id);
            const key = t.category_id || 'none';
            if (!iByCat[key]) iByCat[key] = { name: cat?.name || '未分類', icon: cat?.icon || '📁', amount: 0 };
            iByCat[key].amount += t.amount;
        });
        setIncomeCategoryData(
            Object.values(iByCat).sort((a, b) => b.amount - a.amount).map((item, i) => ({
                ...item, percentage: totalInc > 0 ? Math.round((item.amount / totalInc) * 100) : 0,
                color: CHART_COLORS[i % CHART_COLORS.length],
            }))
        );

        // Calc budget statuses
        const statuses: BudgetStatus[] = (budgetRes.data || []).map((b: { category: Category; amount: number }) => {
            const spent = eTxs
                .filter((t: Transaction) => t.category_id === b.category.id)
                .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
            return {
                category: b.category,
                budget: b.amount,
                spent,
                remaining: b.amount - spent,
                percentage: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
            };
        });
        setBudgetStatuses(statuses);

        setLoading(false);

        // Upcoming payments — deferred (non-blocking)
        const allPms: PaymentMethodRecord[] = pmRes.data || [];
        const billingStart = getMonthStart(getPrevMonth(currentMonth));
        const billingEnd = getMonthEnd(getNextMonth(currentMonth));
        const { data: allTxData } = await supabase
            .from('transactions')
            .select('payment_method_id, type, amount, date')
            .gte('date', billingStart)
            .lte('date', billingEnd);
        setUpcomingPayments(getUpcomingPayments(allPms, allTxData || []));
    }, [currentMonth, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totals = calculateTotals(transactions);

    if (loading) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    return (
        <>
            <div className="mobile-header">
                <h1><img src="/icons/icon-192.png" alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', verticalAlign: 'middle', marginRight: '6px' }} />最強の家計簿</h1>
            </div>

            <div className="page-header flex items-center justify-between">
                <div>
                    <h2>ダッシュボード</h2>
                    <p>{formatMonthJa(currentMonth)}の収支概要</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        追加
                    </button>
                </div>
            </div>

            {/* Month Selector */}
            <div className="month-selector mb-4">
                <button className="btn btn-ghost btn-icon" onClick={() => setCurrentMonth(getPrevMonth(currentMonth))}>
                    <ChevronLeft size={20} />
                </button>
                <span className="month-label">{formatMonthJa(currentMonth)}</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setCurrentMonth(getNextMonth(currentMonth))}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="card summary-card income">
                    <div className="card-label">収入</div>
                    <div className="card-value">{formatCurrency(totals.income)}</div>
                </div>
                <div className="card summary-card expense">
                    <div className="card-label">支出</div>
                    <div className="card-value">{formatCurrency(totals.expense)}</div>
                </div>
                <div className="card summary-card balance">
                    <div className="card-label">収支</div>
                    <div className="card-value">{formatCurrency(totals.balance)}</div>
                </div>
            </div>

            <div className="grid-2">
                {/* Recent Transactions */}
                <div className="card">
                    <div className="card-header">
                        <h3>最近の取引</h3>
                    </div>
                    {transactions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📝</div>
                            <h3>取引がありません</h3>
                            <p>「追加」ボタンから最初の取引を登録しましょう</p>
                        </div>
                    ) : (
                        <div className="transaction-list">
                            {transactions.slice(0, 5).map((tx) => (
                                <div key={tx.id} className="transaction-item">
                                    <div className="transaction-icon">{tx.category?.icon || '📁'}</div>
                                    <div className="transaction-info">
                                        <div className="tx-category">{tx.category?.name || '未分類'}</div>
                                        <div className="tx-meta">
                                            <span>{formatDateJa(tx.date)}</span>
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

                {/* Budget Status */}
                <div className="card">
                    <div className="card-header">
                        <h3>予算状況</h3>
                    </div>
                    {budgetStatuses.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🎯</div>
                            <h3>予算未設定</h3>
                            <p>予算ページから設定できます</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {budgetStatuses.map((bs) => (
                                <div key={bs.category.id} className="budget-item">
                                    <div className="budget-item-header">
                                        <div className="budget-category">
                                            <span>{bs.category.icon}</span>
                                            <span>{bs.category.name}</span>
                                        </div>
                                        <div className="budget-amounts">
                                            <strong>{formatCurrency(bs.spent)}</strong> / {formatCurrency(bs.budget)}
                                        </div>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className={`progress-bar-fill ${bs.percentage >= 100 ? 'danger' : bs.percentage >= 80 ? 'warning' : ''}`}
                                            style={{ width: `${Math.min(bs.percentage, 100)}%` }}
                                        />
                                    </div>
                                    <div className="budget-meta">
                                        <span>残り {formatCurrency(Math.max(0, bs.remaining))}</span>
                                        <span>{bs.percentage}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Pie Charts */}
            <div className="grid-2" style={{ marginTop: '16px' }}>
                <div className="card">
                    <div className="card-header">
                        <h3>支出カテゴリ</h3>
                    </div>
                    {expenseCategoryData.length === 0 ? (
                        <div className="empty-state"><p>データがありません</p></div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={expenseCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="amount" nameKey="name">
                                        {expenseCategoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(v: number) => formatCurrency(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 mt-2">
                                {expenseCategoryData.map((cat, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
                                            <span className="text-sm">{cat.icon} {cat.name}</span>
                                        </div>
                                        <span className="text-sm">{formatCurrency(cat.amount)} ({cat.percentage}%)</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className="card">
                    <div className="card-header">
                        <h3>収入カテゴリ</h3>
                    </div>
                    {incomeCategoryData.length === 0 ? (
                        <div className="empty-state"><p>データがありません</p></div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={incomeCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="amount" nameKey="name">
                                        {incomeCategoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(v: number) => formatCurrency(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 mt-2">
                                {incomeCategoryData.map((cat, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
                                            <span className="text-sm">{cat.icon} {cat.name}</span>
                                        </div>
                                        <span className="text-sm">{formatCurrency(cat.amount)} ({cat.percentage}%)</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Upcoming Payments */}
            {upcomingPayments.length > 0 && (
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3>💳 次回の引き落とし予定</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {upcomingPayments.map((payment, i) => (
                            <div key={i} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: i < upcomingPayments.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>
                                        {payment.methodIcon} {payment.methodName}
                                    </div>
                                    <div className="text-sm text-muted">
                                        {payment.dueDateJa} 引き落とし
                                    </div>
                                </div>
                                <div style={{ fontWeight: 700, color: 'var(--expense-color)', fontSize: '1.1rem' }}>
                                    {formatCurrency(payment.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showModal && (
                <TransactionModal
                    categories={categories}
                    paymentMethods={paymentMethods}
                    onClose={() => setShowModal(false)}
                    onSaved={() => { setShowModal(false); fetchData(); }}
                />
            )}
        </>
    );
}
