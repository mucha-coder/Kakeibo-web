import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initializeUserData } from '@/lib/init-user';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Initialize profile and default categories for new users
            await initializeUserData(supabase);
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/login`);
}
