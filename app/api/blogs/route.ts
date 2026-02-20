import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from('blogs')
        .select('id, title, slug, excerpt, featured_image, published_at, author_name')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
