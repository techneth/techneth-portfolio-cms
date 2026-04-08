import { getCaseStudy } from '../../actions';
import EditCaseStudyClient from './EditCaseStudyClient';
import { notFound } from 'next/navigation';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const initialData = await getCaseStudy(id);
    
    if (!initialData) {
        notFound();
    }
    
    return <EditCaseStudyClient id={id} initialData={initialData} />;
}
