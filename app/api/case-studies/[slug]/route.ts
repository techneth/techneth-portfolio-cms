import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const slug = (await params).slug;
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from('case_studies')
        .select('*')
        .eq('status', 'published')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
}
