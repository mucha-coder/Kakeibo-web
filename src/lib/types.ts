export type TransactionType = 'income' | 'expense';
export type PaymentMethodType = 'cash' | 'credit' | 'emoney' | 'bank' | 'qr';

export interface Category {
    id: string;
    user_id: string;
    name: string;
    type: TransactionType;
    icon: string;
    sort_order: number;
    created_at: string;
}

export interface PaymentMethodRecord {
    id: string;
    user_id: string;
    name: string;
    type: PaymentMethodType;
    icon: string;
    closing_day: number | null;
    payment_day: number | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

export interface Transaction {
    id: string;
    user_id: string;
    category_id: string | null;
    payment_method_id: string | null;
    date: string;
    amount: number;
    type: TransactionType;
    memo: string;
    recurring_id: string | null;
    created_at: string;
    // Joined
    category?: Category;
    payment_method?: PaymentMethodRecord;
}

export interface RecurringTransaction {
    id: string;
    user_id: string;
    category_id: string | null;
    payment_method_id: string | null;
    amount: number;
    type: TransactionType;
    memo: string;
    day_of_month: number;
    is_active: boolean;
    created_at: string;
    // Joined
    category?: Category;
    payment_method?: PaymentMethodRecord;
}

export interface Budget {
    id: string;
    user_id: string;
    category_id: string;
    amount: number;
    month: string; // YYYY-MM
    created_at: string;
    // Joined
    category?: Category;
}

export interface Profile {
    id: string;
    display_name: string;
    created_at: string;
}

// Form types
export interface TransactionFormData {
    date: string;
    amount: number;
    type: TransactionType;
    category_id: string;
    payment_method_id: string;
    memo: string;
}

export interface RecurringFormData {
    amount: number;
    type: TransactionType;
    category_id: string;
    payment_method_id: string;
    memo: string;
    day_of_month: number;
}

export interface BudgetFormData {
    category_id: string;
    amount: number;
    month: string;
}

// Chart types
export interface MonthlyData {
    month: string;
    income: number;
    expense: number;
    balance: number;
}

export interface CategoryData {
    name: string;
    icon: string;
    amount: number;
    percentage: number;
    color: string;
}

export interface BudgetStatus {
    category: Category;
    budget: number;
    spent: number;
    remaining: number;
    percentage: number;
}

// Card template for preset credit cards
export interface CardTemplate {
    name: string;
    icon: string;
    closing_day: number; // 0 = month end
    payment_day: number;
}

// Payment method type labels
export const PAYMENT_TYPE_LABELS: Record<PaymentMethodType, string> = {
    cash: '現金',
    credit: 'クレジットカード',
    emoney: '電子マネー',
    bank: '銀行振込',
    qr: 'QRコード決済',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    income: '収入',
    expense: '支出',
};

// Preset card templates
export const CARD_TEMPLATES: CardTemplate[] = [
    { name: 'JCBカードW', icon: '💳', closing_day: 15, payment_day: 10 },
    { name: '三井住友カードNL（15日締め）', icon: '💳', closing_day: 15, payment_day: 10 },
    { name: '三井住友カードNL（月末締め）', icon: '💳', closing_day: 0, payment_day: 26 },
    { name: 'エポスゴールドカード（27日締め）', icon: '💳', closing_day: 27, payment_day: 27 },
    { name: 'エポスゴールドカード（4日締め）', icon: '💳', closing_day: 4, payment_day: 4 },
    { name: '楽天カード', icon: '💳', closing_day: 0, payment_day: 27 },
];
