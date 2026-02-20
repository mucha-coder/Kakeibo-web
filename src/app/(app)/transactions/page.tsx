'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatMonth, formatMonthJa, formatDateJa, getMonthStart, getMonthEnd, getPrevMonth, getNextMonth, calculateTotals, generateCSV, downloadFile } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Download, ArrowUpDown } from 'lucide-react';
import type { Transaction, Category, TransactionType, PaymentMethodRecord } from '@/lib/types';
import TransactionModal from '@/components/transactions/TransactionModal';

export default function TransactionsPage() {
    const supabase = createClient();
    const [currentMonth, setCurrentMonth] = useState(formatMonth(new Date()));
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editTx, setEditTx] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterType, setFilterType] = useState<TransactionType | ''>('');
    const [filterCategoryId, setFilterCategoryId] = useState('');
    const [filterPaymentId, setFilterPaymentId] = useState('');
    const [sortField, setSortField] = useState<'date' | 'amount'>('date');
    const [sortAsc, setSortAsc] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const startDate = getMonthStart(currentMonth);
        const endDate = getMonthEnd(currentMonth);

        const [txRes, catRes, pmRes] = await Promise.all([
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
                .from('payment_methods')
                .select('*')
                .order('sort_order', { ascending: true }),
        ]);

        setTransactions(txRes.data || []);
        setCategories(catRes.data || []);
        setPaymentMethods(pmRes.data || []);
        setLoading(false);
    }, [currentMonth, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Apply filters and sorting
    let filtered = [...transactions];
    if (filterType) filtered = filtered.filter((t) => t.type === filterType);
    if (filterCategoryId) filtered = filtered.filter((t) => t.category_id === filterCategoryId);
    if (filterPaymentId) filtered = filtered.filter((t) => t.payment_method_id === filterPaymentId);

    filtered.sort((a, b) => {
        const multiplier = sortAsc ? 1 : -1;
        if (sortField === 'date') return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
        return multiplier * (a.amount - b.amount);
    });

    const totals = calculateTotals(filtered);

    function handleSort(field: 'date' | 'amount') {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    }

    function handleExportCSV() {
        const csv = generateCSV(filtered);
        downloadFile(csv, `家計簿_${currentMonth}.csv`);
    }

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
                    <h2>収支一覧</h2>
                    <p>{formatMonthJa(currentMonth)} • {filtered.length}件</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                        <Download size={16} />
                        CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => { setEditTx(null); setShowModal(true); }}>
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

            {/* Summary */}
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

            {/* Filters */}
            <div className="filter-bar">
                <select
                    className="form-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
                >
                    <option value="">すべての種別</option>
                    <option value="income">収入</option>
                    <option value="expense">支出</option>
                </select>
                <select
                    className="form-select"
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                >
                    <option value="">すべてのカテゴリ</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                </select>
                <select
                    className="form-select"
                    value={filterPaymentId}
                    onChange={(e) => setFilterPaymentId(e.target.value)}
                >
                    <option value="">すべての支払方法</option>
                    {paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>{pm.icon} {pm.name}</option>
                    ))}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => handleSort('date')}>
                    <ArrowUpDown size={14} /> 日付{sortField === 'date' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleSort('amount')}>
                    <ArrowUpDown size={14} /> 金額{sortField === 'amount' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
            </div>

            {/* Transaction List */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3>取引がありません</h3>
                    <p>「追加」ボタンから取引を登録しましょう</p>
                </div>
            ) : (
                <div className="transaction-list">
                    {filtered.map((tx) => (
                        <div
                            key={tx.id}
                            className="transaction-item"
                            onClick={() => { setEditTx(tx); setShowModal(true); }}
                        >
                            <div className="transaction-icon">{tx.category?.icon || '📁'}</div>
                            <div className="transaction-info">
                                <div className="tx-category">{tx.category?.name || '未分類'}</div>
                                <div className="tx-meta">
                                    <span>{formatDateJa(tx.date)}</span>
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

            {showModal && (
                <TransactionModal
                    categories={categories}
                    paymentMethods={paymentMethods}
                    transaction={editTx}
                    onClose={() => { setShowModal(false); setEditTx(null); }}
                    onSaved={() => { setShowModal(false); setEditTx(null); fetchData(); }}
                />
            )}
        </>
    );
}
