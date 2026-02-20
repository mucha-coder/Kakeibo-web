'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatMonth, formatMonthJa, formatDateJa, getMonthStart, getMonthEnd, getPrevMonth, getNextMonth, calculateTotals, getUpcomingPayments } from '@/lib/utils';
import type { UpcomingPayment } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Transaction, Category, BudgetStatus, PaymentMethodRecord } from '@/lib/types';
import TransactionModal from '@/components/transactions/TransactionModal';

export default function DashboardPage() {
    const supabase = createClient();
    const [currentMonth, setCurrentMonth] = useState(formatMonth(new Date()));
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
    const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
    const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const startDate = getMonthStart(currentMonth);
        const endDate = getMonthEnd(currentMonth);

        const [txRes, catRes, budgetRes, pmRes] = await Promise.all([
            supabase
                .from('transactions')
                .select('*, category:categories(*), payment_method:payment_methods(*)')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false })
                .limit(10),
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

        setTransactions(txRes.data || []);
        setCategories(catRes.data || []);
        setPaymentMethods(pmRes.data || []);

        // Calc budget statuses
        const expenseTxs = (txRes.data || []).filter((t: Transaction) => t.type === 'expense');
        const statuses: BudgetStatus[] = (budgetRes.data || []).map((b: { category: Category; amount: number }) => {
            const spent = expenseTxs
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

        // Upcoming payments - fetch wider range for billing periods
        const allPms: PaymentMethodRecord[] = pmRes.data || [];
        const billingStart = getMonthStart(getPrevMonth(currentMonth));
        const billingEnd = getMonthEnd(getNextMonth(currentMonth));
        const { data: allTxData } = await supabase
            .from('transactions')
            .select('payment_method_id, type, amount, date')
            .gte('date', billingStart)
            .lte('date', billingEnd);
        const upcoming = getUpcomingPayments(allPms, allTxData || []);
        setUpcomingPayments(upcoming);

        setLoading(false);
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
                <h1>💰 家計簿</h1>
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
