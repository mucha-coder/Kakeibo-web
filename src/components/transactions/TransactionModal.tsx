'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Camera, Loader2 } from 'lucide-react';
import type { Category, Transaction, TransactionType, PaymentMethodRecord, ReceiptItem } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface Props {
    categories: Category[];
    paymentMethods: PaymentMethodRecord[];
    transaction?: Transaction | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function TransactionModal({ categories, paymentMethods, transaction, onClose, onSaved }: Props) {
    const supabase = createClient();
    const isEdit = !!transaction;

    const [type, setType] = useState<TransactionType>(transaction?.type || 'expense');
    const [date, setDate] = useState(transaction?.date || formatDate(new Date()));
    const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
    const [categoryId, setCategoryId] = useState(transaction?.category_id || '');
    const [paymentMethodId, setPaymentMethodId] = useState(transaction?.payment_method_id || '');
    const [memo, setMemo] = useState(transaction?.memo || '');
    const [receiptItems, setReceiptItems] = useState<ReceiptItem[] | null>(transaction?.receipt_items || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Receipt scanning state
    const [scanning, setScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredCategories = categories.filter((c) => c.type === type);
    const activePaymentMethods = paymentMethods.filter((pm) => pm.is_active);

    async function handleReceiptScan(file: File) {
        setScanning(true);
        setScanMessage('レシートを読み取り中...');
        setError('');

        try {
            // Resize image to reduce payload
            const base64 = await resizeAndConvert(file, 1024);

            const res = await fetch('/api/receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || 'レシートの読み取りに失敗しました');
                return;
            }

            // Fill form with scanned data
            if (data.date) setDate(data.date);
            if (data.amount) setAmount(String(data.amount));
            if (data.memo) setMemo(data.memo);
            if (data.type) setType(data.type);
            if (data.items && data.items.length > 0) setReceiptItems(data.items);
            setScanMessage('✅ 読み取り完了！内容を確認してください');
        } catch {
            setError('レシート読み取りに失敗しました');
        } finally {
            setScanning(false);
        }
    }

    function resizeAndConvert(file: File, maxSize: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > maxSize || height > maxSize) {
                        const ratio = Math.min(maxSize / width, maxSize / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d')!;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            setError('金額を入力してください');
            return;
        }
        if (!categoryId) {
            setError('カテゴリを選択してください');
            return;
        }

        setLoading(true);
        setError('');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError('ログインしてください');
            setLoading(false);
            return;
        }

        const data = {
            date,
            amount: Number(amount),
            type,
            category_id: categoryId,
            payment_method_id: paymentMethodId || null,
            memo,
            receipt_items: receiptItems,
            user_id: user.id,
        };

        let result;
        if (isEdit) {
            result = await supabase.from('transactions').update(data).eq('id', transaction.id);
        } else {
            result = await supabase.from('transactions').insert(data);
        }

        if (result.error) {
            setError(result.error.message);
            setLoading(false);
            return;
        }

        onSaved();
    }

    async function handleDelete() {
        if (!isEdit || !confirm('この取引を削除しますか？')) return;
        setLoading(true);
        await supabase.from('transactions').delete().eq('id', transaction.id);
        onSaved();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isEdit ? '取引を編集' : '新しい取引'}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="form-message error">{error}</div>}
                        {scanMessage && !error && (
                            <div className="form-message success">{scanMessage}</div>
                        )}

                        {/* Receipt Scan Button */}
                        {!isEdit && (
                            <div className="form-group">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleReceiptScan(file);
                                        e.target.value = '';
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary w-full"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={scanning}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        background: scanning ? 'var(--accent-primary-glow)' : 'var(--bg-card-hover)',
                                        border: '1px dashed var(--accent-primary)',
                                        color: 'var(--accent-primary)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                >
                                    {scanning ? (
                                        <><Loader2 size={18} className="spin" /> 読み取り中...</>
                                    ) : (
                                        <><Camera size={18} /> 📷 レシートを読み取る</>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Type Toggle */}
                        <div className="form-group">
                            <label className="form-label">種別</label>
                            <div className="type-toggle">
                                <button
                                    type="button"
                                    className={`type-toggle-btn ${type === 'expense' ? 'active-expense' : ''}`}
                                    onClick={() => { setType('expense'); setCategoryId(''); }}
                                >
                                    支出
                                </button>
                                <button
                                    type="button"
                                    className={`type-toggle-btn ${type === 'income' ? 'active-income' : ''}`}
                                    onClick={() => { setType('income'); setCategoryId(''); }}
                                >
                                    収入
                                </button>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="tx-date">日付</label>
                                <input
                                    id="tx-date"
                                    type="date"
                                    className="form-input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="tx-amount">金額</label>
                                <input
                                    id="tx-amount"
                                    type="number"
                                    className="form-input"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="tx-category">カテゴリ</label>
                                <select
                                    id="tx-category"
                                    className="form-select"
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    required
                                >
                                    <option value="">選択してください</option>
                                    {filteredCategories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="tx-payment">支払方法</label>
                                <select
                                    id="tx-payment"
                                    className="form-select"
                                    value={paymentMethodId}
                                    onChange={(e) => setPaymentMethodId(e.target.value)}
                                >
                                    <option value="">選択なし</option>
                                    {activePaymentMethods.map((pm) => (
                                        <option key={pm.id} value={pm.id}>{pm.icon} {pm.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="tx-memo">メモ</label>
                            <textarea
                                id="tx-memo"
                                className="form-textarea"
                                placeholder="メモ（任意）"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Receipt Items Display */}
                        {receiptItems && receiptItems.length > 0 && (
                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label className="form-label">レシート内訳</label>
                                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                                    <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            {receiptItems.map((item, i) => (
                                                <tr key={i} style={{ borderBottom: i < receiptItems.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                                    <td style={{ padding: '6px 0', color: 'var(--text-primary)' }}>{item.name}</td>
                                                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>¥{item.price.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        {isEdit && (
                            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={loading}>
                                削除
                            </button>
                        )}
                        <div style={{ flex: 1 }} />
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            キャンセル
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? '保存中...' : isEdit ? '更新' : '追加'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
