'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Pencil, Trash2, CreditCard, Upload, FileText, Repeat, BarChart3, ChevronRight } from 'lucide-react';
import type { PaymentMethodRecord, PaymentMethodType } from '@/lib/types';
import { CARD_TEMPLATES, PAYMENT_TYPE_LABELS } from '@/lib/types';
import { parseCSVText, mapPayPayCSV, mapGenericCSV, formatCurrency } from '@/lib/utils';
import type { CSVImportRow } from '@/lib/utils';
import Link from 'next/link';

export default function SettingsPage() {
    const supabase = createClient();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<PaymentMethodRecord | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

    // CSV Import state
    const [csvFormat, setCsvFormat] = useState<'paypay' | 'generic'>('paypay');
    const [csvRows, setCsvRows] = useState<CSVImportRow[]>([]);
    const [csvImporting, setCsvImporting] = useState(false);
    const [csvResult, setCsvResult] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [pmType, setPmType] = useState<PaymentMethodType>('credit');
    const [icon, setIcon] = useState('💳');
    const [closingDay, setClosingDay] = useState('');
    const [paymentDay, setPaymentDay] = useState('');
    const [formError, setFormError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('payment_methods')
            .select('*')
            .order('sort_order', { ascending: true });
        setPaymentMethods(data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function resetForm() {
        setName('');
        setPmType('credit');
        setIcon('💳');
        setClosingDay('');
        setPaymentDay('');
        setFormError('');
        setEditItem(null);
        setShowTemplates(false);
    }

    function openEdit(item: PaymentMethodRecord) {
        setEditItem(item);
        setName(item.name);
        setPmType(item.type);
        setIcon(item.icon);
        setClosingDay(item.closing_day?.toString() || '');
        setPaymentDay(item.payment_day?.toString() || '');
        setShowForm(true);
        setShowTemplates(false);
    }

    function applyTemplate(template: typeof CARD_TEMPLATES[0]) {
        setName(template.name);
        setPmType('credit');
        setIcon(template.icon);
        setClosingDay(template.closing_day === 0 ? '0' : template.closing_day.toString());
        setPaymentDay(template.payment_day.toString());
        setShowTemplates(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) { setFormError('名前を入力してください'); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setFormError('ログインしてください'); return; }

        const data = {
            user_id: user.id,
            name: name.trim(),
            type: pmType,
            icon,
            closing_day: closingDay ? (closingDay === '0' ? 0 : Number(closingDay)) : null,
            payment_day: paymentDay ? Number(paymentDay) : null,
            sort_order: editItem ? editItem.sort_order : paymentMethods.length,
        };

        if (editItem) {
            await supabase.from('payment_methods').update(data).eq('id', editItem.id);
        } else {
            await supabase.from('payment_methods').insert(data);
        }

        setShowForm(false);
        resetForm();
        fetchData();
    }

    async function handleDelete(id: string) {
        if (!confirm('この支払方法を削除しますか？')) return;
        await supabase.from('payment_methods').delete().eq('id', id);
        fetchData();
    }

    async function handleToggle(item: PaymentMethodRecord) {
        await supabase.from('payment_methods').update({ is_active: !item.is_active }).eq('id', item.id);
        fetchData();
    }

    function formatClosingDay(day: number | null): string {
        if (day === null) return '-';
        if (day === 0) return '月末';
        return `${day}日`;
    }

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
                    <h2>設定</h2>
                    <p>支払方法の管理</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { resetForm(); setShowForm(true); }}
                >
                    <Plus size={18} /> 追加
                </button>
            </div>

            {/* Payment Methods List */}
            {paymentMethods.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><CreditCard size={48} /></div>
                    <h3>支払方法がありません</h3>
                    <p>「追加」ボタンから支払方法を登録しましょう</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {paymentMethods.map((pm) => (
                        <div
                            key={pm.id}
                            className="card"
                            style={{ padding: '16px 20px', opacity: pm.is_active ? 1 : 0.5 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span style={{ fontSize: '1.5rem' }}>{pm.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {pm.name}
                                            {!pm.is_active && <span className="text-muted text-sm"> (無効)</span>}
                                        </div>
                                        <div className="text-sm text-muted">
                                            {PAYMENT_TYPE_LABELS[pm.type]}
                                            {pm.closing_day !== null && (
                                                <> • 締め日: {formatClosingDay(pm.closing_day)}</>
                                            )}
                                            {pm.payment_day !== null && (
                                                <> • 引き落とし: {pm.payment_day}日</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        onClick={() => handleToggle(pm)}
                                        title={pm.is_active ? '無効にする' : '有効にする'}
                                    >
                                        {pm.is_active ? '✅' : '⬜'}
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        onClick={() => openEdit(pm)}
                                        title="編集"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        onClick={() => handleDelete(pm.id)}
                                        title="削除"
                                        style={{ color: 'var(--expense-color)' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CSV Import Section */}
            <div className="card mt-6" style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '12px' }}><Upload size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />データインポート</h3>
                <p className="text-sm text-muted" style={{ marginBottom: '16px' }}>CSVファイルから取引を一括登録できます</p>

                <div className="form-row" style={{ marginBottom: '12px' }}>
                    <div className="form-group">
                        <label className="form-label">フォーマット</label>
                        <select
                            className="form-select"
                            value={csvFormat}
                            onChange={(e) => { setCsvFormat(e.target.value as 'paypay' | 'generic'); setCsvRows([]); setCsvResult(''); }}
                        >
                            <option value="paypay">PayPay CSV</option>
                            <option value="generic">汎用CSV（日付,金額,メモ）</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">ファイル選択</label>
                        <input
                            type="file"
                            accept=".csv"
                            className="form-input"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const text = await file.text();
                                const parsed = parseCSVText(text);
                                const mapped = csvFormat === 'paypay' ? mapPayPayCSV(parsed) : mapGenericCSV(parsed);
                                setCsvRows(mapped);
                                setCsvResult('');
                            }}
                        />
                    </div>
                </div>

                {csvRows.length > 0 && (
                    <>
                        <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>日付</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>種別</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>金額</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>メモ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvRows.slice(0, 50).map((row, i) => (
                                        <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '6px 12px' }}>{row.date}</td>
                                            <td style={{ padding: '6px 12px', color: row.type === 'income' ? 'var(--income-color)' : 'var(--expense-color)' }}>
                                                {row.type === 'income' ? '収入' : '支出'}
                                            </td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                                            <td style={{ padding: '6px 12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.memo}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted">{csvRows.length}件の取引{csvRows.length > 50 ? '（先頭50件を表示）' : ''}</span>
                            <button
                                className="btn btn-primary"
                                disabled={csvImporting}
                                onClick={async () => {
                                    setCsvImporting(true);
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) { setCsvResult('ログインしてください'); setCsvImporting(false); return; }
                                    const inserts = csvRows.map((r) => ({
                                        user_id: user.id,
                                        date: r.date,
                                        amount: r.amount,
                                        type: r.type,
                                        memo: r.memo,
                                        payment_method_id: null,
                                        category_id: null,
                                    }));
                                    const { error } = await supabase.from('transactions').insert(inserts);
                                    if (error) {
                                        setCsvResult(`エラー: ${error.message}`);
                                    } else {
                                        setCsvResult(`${csvRows.length}件のインポートが完了しました`);
                                        setCsvRows([]);
                                    }
                                    setCsvImporting(false);
                                }}
                            >
                                <FileText size={16} />
                                {csvImporting ? 'インポート中...' : `${csvRows.length}件をインポート`}
                            </button>
                        </div>
                    </>
                )}

                {csvResult && (
                    <div className={`form-message ${csvResult.startsWith('エラー') ? 'error' : 'success'}`} style={{ marginTop: '8px' }}>
                        {csvResult}
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="card mt-6" style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '12px' }}>その他の機能</h3>
                <div className="flex flex-col gap-2">
                    <Link href="/recurring" className="card" style={{ padding: '14px 18px', textDecoration: 'none', color: 'inherit', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Repeat size={20} style={{ color: 'var(--primary-color)' }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>繰り返し・固定費</div>
                                    <div className="text-sm text-muted">固定費の登録・年間サマリー</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-muted" />
                        </div>
                    </Link>
                    <Link href="/reports" className="card" style={{ padding: '14px 18px', textDecoration: 'none', color: 'inherit', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BarChart3 size={20} style={{ color: 'var(--primary-color)' }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>レポート</div>
                                    <div className="text-sm text-muted">月別・カテゴリ別・支払方法別分析</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-muted" />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editItem ? '支払方法を編集' : '支払方法を追加'}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setShowForm(false); resetForm(); }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {formError && <div className="form-message error">{formError}</div>}

                                {/* Template Selection */}
                                {!editItem && (
                                    <div className="form-group">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ width: '100%' }}
                                            onClick={() => setShowTemplates(!showTemplates)}
                                        >
                                            <CreditCard size={16} />
                                            カードテンプレートから選択
                                        </button>
                                        {showTemplates && (
                                            <div className="flex flex-col gap-2 mt-3">
                                                {CARD_TEMPLATES.map((t, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        className="card"
                                                        style={{
                                                            padding: '12px 16px',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            background: 'rgba(255,255,255,0.03)',
                                                        }}
                                                        onClick={() => applyTemplate(t)}
                                                    >
                                                        <div style={{ fontWeight: 600 }}>{t.icon} {t.name}</div>
                                                        <div className="text-sm text-muted">
                                                            締め日: {t.closing_day === 0 ? '月末' : `${t.closing_day}日`}
                                                            {' • '}引き落とし: 翌月{t.payment_day}日
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label" htmlFor="pm-name">名前</label>
                                    <input
                                        id="pm-name"
                                        type="text"
                                        className="form-input"
                                        placeholder="例: 楽天カード"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="pm-type">種類</label>
                                        <select
                                            id="pm-type"
                                            className="form-select"
                                            value={pmType}
                                            onChange={(e) => {
                                                const v = e.target.value as PaymentMethodType;
                                                setPmType(v);
                                                if (v === 'cash') { setIcon('💵'); setClosingDay(''); setPaymentDay(''); }
                                                else if (v === 'credit') setIcon('💳');
                                                else if (v === 'emoney') setIcon('📲');
                                                else if (v === 'bank') setIcon('🏦');
                                                else if (v === 'qr') setIcon('📱');
                                            }}
                                        >
                                            {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="pm-icon">アイコン</label>
                                        <input
                                            id="pm-icon"
                                            type="text"
                                            className="form-input"
                                            value={icon}
                                            onChange={(e) => setIcon(e.target.value)}
                                            style={{ maxWidth: '80px', textAlign: 'center', fontSize: '1.2rem' }}
                                        />
                                    </div>
                                </div>

                                {pmType === 'credit' && (
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="pm-closing">締め日</label>
                                            <select
                                                id="pm-closing"
                                                className="form-select"
                                                value={closingDay}
                                                onChange={(e) => setClosingDay(e.target.value)}
                                            >
                                                <option value="">未設定</option>
                                                <option value="0">月末</option>
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                                    <option key={d} value={d}>{d}日</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="pm-payment">引き落とし日</label>
                                            <select
                                                id="pm-payment"
                                                className="form-select"
                                                value={paymentDay}
                                                onChange={(e) => setPaymentDay(e.target.value)}
                                            >
                                                <option value="">未設定</option>
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                                    <option key={d} value={d}>翌月{d}日</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
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
