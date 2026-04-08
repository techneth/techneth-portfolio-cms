import { getJobs, getJobApplications } from './actions';
import CareersClient from './CareersClient';

export default async function CareersPage() {
    const [jobs, applications] = await Promise.all([
        getJobs(),
        getJobApplications(),
    ]);

    return <CareersClient initialJobs={jobs} initialApplications={applications} />;
}
