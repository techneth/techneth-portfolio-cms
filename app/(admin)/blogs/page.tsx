import { getBlogs } from './actions';
import BlogsClient from './BlogsClient';

export default async function BlogsPage() {
    const blogs = await getBlogs();
    return <BlogsClient initialBlogs={blogs} />;
}
