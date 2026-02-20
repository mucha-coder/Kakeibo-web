import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Initialize profile, default categories, and default payment methods for a new user.
 * Called after successful signup/login if profile doesn't exist yet.
 */
export async function initializeUserData(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check if profile already exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (profile) return; // Already initialized

  // Create profile
  await supabase.from('profiles').insert({
    id: user.id,
    display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
  });

  // Create default expense categories
  const expenseCategories = [
    { name: '食費', icon: '🍽️', sort_order: 1 },
    { name: '家賃', icon: '🏠', sort_order: 2 },
    { name: '光熱費', icon: '💡', sort_order: 3 },
    { name: '通信費', icon: '📱', sort_order: 4 },
    { name: '交通費', icon: '🚃', sort_order: 5 },
    { name: '日用品', icon: '🧴', sort_order: 6 },
    { name: '医療費', icon: '🏥', sort_order: 7 },
    { name: '娯楽', icon: '🎮', sort_order: 8 },
    { name: '衣服', icon: '👕', sort_order: 9 },
    { name: '教育', icon: '📚', sort_order: 10 },
    { name: '保険', icon: '🛡️', sort_order: 11 },
    { name: 'サブスク', icon: '📺', sort_order: 12 },
    { name: 'ガジェット', icon: '🖥️', sort_order: 13 },
    { name: 'その他', icon: '📦', sort_order: 14 },
  ].map((c) => ({ ...c, user_id: user.id, type: 'expense' as const }));

  // Create default income categories
  const incomeCategories = [
    { name: '給与', icon: '💰', sort_order: 1 },
    { name: '副業', icon: '💼', sort_order: 2 },
    { name: 'ボーナス', icon: '🎁', sort_order: 3 },
    { name: '投資', icon: '📈', sort_order: 4 },
    { name: 'その他', icon: '💵', sort_order: 5 },
  ].map((c) => ({ ...c, user_id: user.id, type: 'income' as const }));

  await supabase.from('categories').insert([...expenseCategories, ...incomeCategories]);

  // Create default payment methods
  const defaultPaymentMethods = [
    { name: '現金', type: 'cash', icon: '💵', sort_order: 1 },
    { name: '電子マネー', type: 'emoney', icon: '📲', sort_order: 2 },
    { name: '銀行振込', type: 'bank', icon: '🏦', sort_order: 3 },
    { name: 'QRコード決済', type: 'qr', icon: '📱', sort_order: 4 },
  ].map((pm) => ({
    ...pm,
    user_id: user.id,
    closing_day: null,
    payment_day: null,
  }));

  await supabase.from('payment_methods').insert(defaultPaymentMethods);
}
