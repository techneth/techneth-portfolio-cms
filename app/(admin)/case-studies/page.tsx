import { getCaseStudies } from './actions';
import CaseStudiesClient from './CaseStudiesClient';

export default async function CaseStudiesPage() {
    const caseStudies = await getCaseStudies();
    return <CaseStudiesClient initialCaseStudies={caseStudies} />;
}
