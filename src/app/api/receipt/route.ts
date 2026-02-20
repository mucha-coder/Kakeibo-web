import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 });
    }

    try {
        const { image } = await req.json();
        if (!image) {
            return NextResponse.json({ error: '画像データがありません' }, { status: 400 });
        }

        // Remove data URL prefix to get pure base64
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // Using gemini-2.5-flash which has quota available for this account
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `このレシート画像を解析して、以下のJSON形式で情報を返してください。
必ず有効なJSONのみを返してください。マークダウンや説明文は不要です。

{
  "date": "YYYY-MM-DD形式の日付",
  "amount": 合計金額(数値),
  "memo": "店名や主な品目（短く）",
  "type": "expense",
  "items": [
    { "name": "商品名1", "price": 100 },
    { "name": "商品名2", "price": 200 }
  ]
}

注意:
- dateはレシートに記載の日付。見つからない場合は今日の日付(${new Date().toISOString().split('T')[0]})
- amountは合計金額（税込）。数値のみ、カンマなし
- memoは店名 + 品目の概要などを簡潔に
- typeは通常"expense"。入金・収入の場合のみ"income"
- itemsはレシートに記載されている個別の品目と金額のリスト。見つからない場合は空配列 [] を返す。割引などはマイナスで記録。
- レシートが読み取れない場合は {"error": "読み取れません"} を返す`
                            },
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: base64Data,
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 256,
                    }
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini API error:', errorData);
            let detail = 'AI解析に失敗しました';
            try {
                const errJson = JSON.parse(errorData);
                detail = errJson?.error?.message || detail;
            } catch { /* ignore */ }
            return NextResponse.json({ error: detail }, { status: 502 });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'レシートを読み取れませんでした' }, { status: 422 });
        }

        const result = JSON.parse(jsonMatch[0]);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 422 });
        }

        return NextResponse.json({
            date: result.date || new Date().toISOString().split('T')[0],
            amount: Number(result.amount) || 0,
            memo: result.memo || '',
            type: result.type || 'expense',
            items: Array.isArray(result.items) ? result.items : [],
        });

    } catch (err) {
        console.error('Receipt parse error:', err);
        return NextResponse.json({ error: 'レシートの解析に失敗しました' }, { status: 500 });
    }
}
