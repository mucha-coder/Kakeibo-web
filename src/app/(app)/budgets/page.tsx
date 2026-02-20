'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatMonth, formatMonthJa, getMonthStart, getMonthEnd, getPrevMonth, getNextMonth } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import type { Category, Budget, Transaction, BudgetStatus } from '@/lib/types';

export default function BudgetsPage() {
    const supabase = createClient();
    const [currentMonth, setCurrentMonth] = useState(formatMonth(new Date()));
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Record<string, number>>({});
    const [spent, setSpent] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const startDate = getMonthStart(currentMonth);
        const endDate = getMonthEnd(currentMonth);

        const [catRes, budgetRes, txRes] = await Promise.all([
            supabase.from('categories').select('*').eq('type', 'expense').order('sort_order', { ascending: true }),
            supabase.from('budgets').select('*').eq('month', currentMonth),
            supabase.from('transactions').select('*').eq('type', 'expense').gte('date', startDate).lte('date', endDate),
        ]);

        setCategories(catRes.data || []);

        const budgetMap: Record<string, number> = {};
        (budgetRes.data || []).forEach((b: Budget) => {
            budgetMap[b.category_id] = b.amount;
        });
        setBudgets(budgetMap);

        const spentMap: Record<string, number> = {};
        (txRes.data || []).forEach((t: Transaction) => {
            if (t.category_id) {
                spentMap[t.category_id] = (spentMap[t.category_id] || 0) + t.amount;
            }
        });
        setSpent(spentMap);
        setLoading(false);
    }, [currentMonth, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function handleBudgetChange(categoryId: string, value: string) {
        setBudgets((prev) => ({
            ...prev,
            [categoryId]: value === '' ? 0 : Number(value),
        }));
    }

    async function handleSave() {
        setSaving(true);
        setSaveMsg('');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaveMsg('ログインしてください'); setSaving(false); return; }

        const upserts = categories
            .filter((c) => budgets[c.id] !== undefined && budgets[c.id] > 0)
            .map((c) => ({
                user_id: user.id,
                category_id: c.id,
                amount: budgets[c.id],
                month: currentMonth,
            }));

        // Delete old budgets for this month
        await supabase.from('budgets').delete().eq('month', currentMonth);

        if (upserts.length > 0) {
            const { error } = await supabase.from('budgets').insert(upserts);
            if (error) {
                setSaveMsg('保存に失敗しました: ' + error.message);
                setSaving(false);
                return;
            }
        }

        setSaveMsg('保存しました');
        setSaving(false);
        setTimeout(() => setSaveMsg(''), 3000);
    }

    // Copy from previous month
    async function handleCopyPrev() {
        const prevMonth = getPrevMonth(currentMonth);
        const { data } = await supabase.from('budgets').select('*').eq('month', prevMonth);
        if (data && data.length > 0) {
            const newBudgets: Record<string, number> = { ...budgets };
            data.forEach((b: Budget) => {
                newBudgets[b.category_id] = b.amount;
            });
            setBudgets(newBudgets);
        }
    }

    const totalBudget = Object.values(budgets).reduce((sum, val) => sum + val, 0);
    const totalSpent = Object.values(spent).reduce((sum, val) => sum + val, 0);

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
                    <h2>予算設定</h2>
                    <p>カテゴリ別の月間予算</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={handleCopyPrev}>
                        前月コピー
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        <Save size={16} />
                        {saving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>

            {saveMsg && (
                <div className="form-message success mb-4">{saveMsg}</div>
            )}

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

            {/* Total Summary */}
            <div className="summary-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="card summary-card">
                    <div className="card-label">予算合計</div>
                    <div className="card-value" style={{ color: 'var(--accent-primary-hover)' }}>{formatCurrency(totalBudget)}</div>
                </div>
                <div className="card summary-card">
                    <div className="card-label">支出合計</div>
                    <div className="card-value" style={{
                        color: totalSpent > totalBudget ? 'var(--expense-color)' : 'var(--income-color)'
                    }}>
                        {formatCurrency(totalSpent)}
                        <span className="text-sm text-muted" style={{ marginLeft: '8px' }}>
                            ({totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%)
                        </span>
                    </div>
                </div>
            </div>

            {/* Budget Items */}
            <div className="flex flex-col gap-3">
                {categories.map((cat) => {
                    const budget = budgets[cat.id] || 0;
                    const catSpent = spent[cat.id] || 0;
                    const pct = budget > 0 ? Math.round((catSpent / budget) * 100) : 0;

                    return (
                        <div key={cat.id} className="budget-item">
                            <div className="budget-item-header">
                                <div className="budget-category">
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                </div>
                                <div className="budget-amounts">
                                    使用: <strong>{formatCurrency(catSpent)}</strong>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-sm text-muted" style={{ minWidth: '36px' }}>予算</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ maxWidth: '160px' }}
                                    placeholder="0"
                                    value={budget || ''}
                                    onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                                    min="0"
                                />
                                <span className="text-sm text-muted">円</span>
                            </div>

                            {budget > 0 && (
                                <>
                                    <div className="progress-bar mt-2">
                                        <div
                                            className={`progress-bar-fill ${pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : ''}`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="budget-meta">
                                        <span>残り {formatCurrency(Math.max(0, budget - catSpent))}</span>
                                        <span>{pct}%</span>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
