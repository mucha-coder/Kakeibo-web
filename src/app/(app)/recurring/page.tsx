'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, CHART_COLORS } from '@/lib/utils';
import { Plus, X, Power, PowerOff, Pencil } from 'lucide-react';
import type { Category, RecurringTransaction, TransactionType, PaymentMethodRecord } from '@/lib/types';

export default function RecurringPage() {
    const supabase = createClient();
    const [items, setItems] = useState<RecurringTransaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'list' | 'annual'>('list');

    // Form state
    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [memo, setMemo] = useState('');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [formError, setFormError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [recRes, catRes, pmRes] = await Promise.all([
            supabase
                .from('recurring_transactions')
                .select('*, category:categories(*), payment_method:payment_methods(*)')
                .order('day_of_month', { ascending: true }),
            supabase.from('categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('payment_methods').select('*').order('sort_order', { ascending: true }),
        ]);
        setItems(recRes.data || []);
        setCategories(catRes.data || []);
        setPaymentMethods(pmRes.data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function resetForm() {
        setType('expense');
        setAmount('');
        setCategoryId('');
        setPaymentMethodId('');
        setMemo('');
        setDayOfMonth('1');
        setFormError('');
        setEditItem(null);
    }

    function openEdit(item: RecurringTransaction) {
        setEditItem(item);
        setType(item.type);
        setAmount(item.amount.toString());
        setCategoryId(item.category_id || '');
        setPaymentMethodId(item.payment_method_id || '');
        setMemo(item.memo);
        setDayOfMonth(item.day_of_month.toString());
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) { setFormError('金額を入力してください'); return; }
        if (!categoryId) { setFormError('カテゴリを選択してください'); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setFormError('ログインしてください'); return; }

        const data = {
            amount: Number(amount),
            type,
            category_id: categoryId,
            payment_method_id: paymentMethodId || null,
            memo,
            day_of_month: Number(dayOfMonth),
            user_id: user.id,
        };

        if (editItem) {
            await supabase.from('recurring_transactions').update(data).eq('id', editItem.id);
        } else {
            await supabase.from('recurring_transactions').insert(data);
        }

        setShowForm(false);
        resetForm();
        fetchData();
    }

    async function handleToggle(item: RecurringTransaction) {
        await supabase
            .from('recurring_transactions')
            .update({ is_active: !item.is_active })
            .eq('id', item.id);
        fetchData();
    }

    async function handleDelete(id: string) {
        if (!confirm('この繰り返し取引を削除しますか？')) return;
        await supabase.from('recurring_transactions').delete().eq('id', id);
        fetchData();
    }

    const filteredCategories = categories.filter((c) => c.type === type);
    const activePaymentMethods = paymentMethods.filter((pm) => pm.is_active);
    const totalMonthly = items
        .filter((i) => i.is_active)
        .reduce((sum, i) => {
            return i.type === 'expense' ? sum - i.amount : sum + i.amount;
        }, 0);

    // Annual summary calculations
    const activeExpenseItems = items.filter((i) => i.is_active && i.type === 'expense');
    const totalAnnualExpense = activeExpenseItems.reduce((sum, i) => sum + i.amount * 12, 0);
    const categoryAnnual: Record<string, { name: string; icon: string; amount: number }> = {};
    activeExpenseItems.forEach((item) => {
        const catName = item.category?.name || '未分類';
        const catIcon = item.category?.icon || '📁';
        if (!categoryAnnual[catName]) categoryAnnual[catName] = { name: catName, icon: catIcon, amount: 0 };
        categoryAnnual[catName].amount += item.amount * 12;
    });
    const categoryAnnualList = Object.values(categoryAnnual).sort((a, b) => b.amount - a.amount);

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
                    <h2>繰り返し取引</h2>
                    <p>月額サブスク・固定費の管理</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { resetForm(); setShowForm(true); }}
                >
                    <Plus size={18} /> 追加
                </button>
            </div>

            {/* Tab Selector */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--card-bg)', borderRadius: '8px', padding: '4px' }}>
                <button
                    className={`type-toggle-btn ${tab === 'list' ? 'active-expense' : ''}`}
                    onClick={() => setTab('list')}
                    style={{ flex: 1 }}
                >
                    一覧
                </button>
                <button
                    className={`type-toggle-btn ${tab === 'annual' ? 'active-expense' : ''}`}
                    onClick={() => setTab('annual')}
                    style={{ flex: 1 }}
                >
                    年間サマリー
                </button>
            </div>

            {/* Monthly total */}
            <div className="card mb-4" style={{ padding: '16px 20px' }}>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">月額合計（有効なもの）</span>
                    <span className="font-bold" style={{ color: totalMonthly >= 0 ? 'var(--income-color)' : 'var(--expense-color)' }}>
                        {formatCurrency(Math.abs(totalMonthly))}
                        {' / 月'}
                    </span>
                </div>
                <div className="flex items-center justify-between" style={{ marginTop: '4px' }}>
                    <span className="text-sm text-muted">年間合計（支出のみ）</span>
                    <span className="font-bold" style={{ color: 'var(--expense-color)' }}>
                        {formatCurrency(totalAnnualExpense)}
                        {' / 年'}
                    </span>
                </div>
            </div>

            {/* List Tab */}
            {tab === 'list' && (
                <>
                    {items.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔄</div>
                            <h3>繰り返し取引がありません</h3>
                            <p>月額サブスクや固定費を登録しましょう</p>
                        </div>
                    ) : (
                        <div className="transaction-list">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="transaction-item"
                                    style={{ opacity: item.is_active ? 1 : 0.5 }}
                                >
                                    <div className="transaction-icon">{item.category?.icon || '📁'}</div>
                                    <div className="transaction-info">
                                        <div className="tx-category">
                                            {item.category?.name || '未分類'}
                                            {!item.is_active && ' (停止中)'}
                                        </div>
                                        <div className="tx-meta">
                                            <span>毎月{item.day_of_month}日</span>
                                            <span>{item.payment_method?.name || ''}</span>
                                            {item.memo && <span>• {item.memo}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className={`transaction-amount ${item.type}`}>
                                            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-icon btn-sm"
                                            onClick={() => openEdit(item)}
                                            title="編集"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-icon btn-sm"
                                            onClick={() => handleToggle(item)}
                                            title={item.is_active ? '停止' : '有効化'}
                                        >
                                            {item.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Annual Summary Tab */}
            {tab === 'annual' && (
                <>
                    {/* Per-item annual costs */}
                    <div className="card mb-4" style={{ padding: '16px' }}>
                        <h3 style={{ marginBottom: '12px' }}>📊 固定費一覧（年間）</h3>
                        {activeExpenseItems.length === 0 ? (
                            <p className="text-sm text-muted">有効な固定支出がありません</p>
                        ) : (
                            <div className="transaction-list">
                                {activeExpenseItems
                                    .sort((a, b) => b.amount - a.amount)
                                    .map((item) => (
                                        <div key={item.id} className="transaction-item">
                                            <div className="transaction-icon">{item.category?.icon || '📁'}</div>
                                            <div className="transaction-info">
                                                <div className="tx-category">
                                                    {item.memo || item.category?.name || '未分類'}
                                                </div>
                                                <div className="tx-meta">
                                                    <span>{formatCurrency(item.amount)} / 月</span>
                                                    <span>{item.payment_method?.name || ''}</span>
                                                </div>
                                            </div>
                                            <div className="transaction-amount expense" style={{ fontWeight: 700 }}>
                                                {formatCurrency(item.amount * 12)} / 年
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Category breakdown */}
                    <div className="card" style={{ padding: '16px' }}>
                        <h3 style={{ marginBottom: '12px' }}>🏷️ カテゴリ別年間コスト</h3>
                        {categoryAnnualList.length === 0 ? (
                            <p className="text-sm text-muted">データがありません</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {categoryAnnualList.map((cat, i) => {
                                    const pct = totalAnnualExpense > 0 ? (cat.amount / totalAnnualExpense) * 100 : 0;
                                    return (
                                        <div key={cat.name}>
                                            <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                                                <span>{cat.icon} {cat.name}</span>
                                                <span style={{ fontWeight: 600 }}>{formatCurrency(cat.amount)}</span>
                                            </div>
                                            <div style={{
                                                height: '8px',
                                                borderRadius: '4px',
                                                background: 'rgba(255,255,255,0.1)',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${pct}%`,
                                                    borderRadius: '4px',
                                                    background: CHART_COLORS[i % CHART_COLORS.length],
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                            <div className="text-sm text-muted" style={{ marginTop: '2px' }}>
                                                {pct.toFixed(1)}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editItem ? '繰り返し取引を編集' : '繰り返し取引を追加'}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setShowForm(false); resetForm(); }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {formError && <div className="form-message error">{formError}</div>}

                                <div className="form-group">
                                    <label className="form-label">種別</label>
                                    <div className="type-toggle">
                                        <button type="button" className={`type-toggle-btn ${type === 'expense' ? 'active-expense' : ''}`}
                                            onClick={() => { setType('expense'); setCategoryId(''); }}>支出</button>
                                        <button type="button" className={`type-toggle-btn ${type === 'income' ? 'active-income' : ''}`}
                                            onClick={() => { setType('income'); setCategoryId(''); }}>収入</button>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="rec-amount">金額</label>
                                        <input id="rec-amount" type="number" className="form-input" placeholder="0"
                                            value={amount} onChange={(e) => setAmount(e.target.value)} min="1" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="rec-day">毎月の日</label>
                                        <input id="rec-day" type="number" className="form-input"
                                            value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)}
                                            min="1" max="31" required />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="rec-category">カテゴリ</label>
                                        <select id="rec-category" className="form-select" value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)} required>
                                            <option value="">選択</option>
                                            {filteredCategories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="rec-payment">支払方法</label>
                                        <select id="rec-payment" className="form-select" value={paymentMethodId}
                                            onChange={(e) => setPaymentMethodId(e.target.value)}>
                                            <option value="">選択なし</option>
                                            {activePaymentMethods.map((pm) => (
                                                <option key={pm.id} value={pm.id}>{pm.icon} {pm.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="rec-memo">メモ</label>
                                    <textarea id="rec-memo" className="form-textarea" placeholder="メモ（任意）"
                                        value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
                                </div>
                            </div>

                            <div className="modal-footer">
                                {editItem && (
                                    <button type="button" className="btn btn-danger btn-sm"
                                        onClick={() => { handleDelete(editItem.id); setShowForm(false); resetForm(); }}>
                                        削除
                                    </button>
                                )}
                                <div style={{ flex: 1 }} />
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                                    キャンセル
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editItem ? '更新' : '追加'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
