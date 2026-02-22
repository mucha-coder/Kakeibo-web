// シンプルなインメモリ レート制限
// Vercel Serverless では完璧ではないが、外部サービス不要で基本的な保護を提供

interface RateEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateEntry>();

// 定期的に期限切れエントリを掃除（メモリリーク防止）
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 60_000);

/**
 * レート制限チェック
 * @param key  識別キー（通常はユーザーID）
 * @param limit  ウィンドウ内の最大リクエスト数
 * @param windowMs  ウィンドウの長さ（ミリ秒）
 * @returns { allowed, remaining, retryAfterMs }
 */
export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        // 新規 or リセット
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
    }

    if (entry.count < limit) {
        entry.count++;
        return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
    }

    // 制限超過
    return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.resetAt - now,
    };
}
