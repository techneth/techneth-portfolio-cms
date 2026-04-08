import { getBlog } from '../../actions';
import EditBlogClient from './EditBlogClient';
import { notFound } from 'next/navigation';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const initialData = await getBlog(id);
    
    if (!initialData) {
        notFound();
    }
    
    return <EditBlogClient id={id} initialData={initialData} />;
}
