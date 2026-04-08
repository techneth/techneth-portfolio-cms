import { getUsers, getCurrentUserRole } from './actions';
import UsersClient from './UsersClient';

export default async function UsersPage() {
    const [users, currentUserRole] = await Promise.all([
        getUsers(),
        getCurrentUserRole(),
    ]);

    return <UsersClient initialUsers={users} initialRole={currentUserRole} />;
}
