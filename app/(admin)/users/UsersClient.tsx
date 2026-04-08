'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Power, PowerOff, Shield, User as UserIcon, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
    getUsers, createUser, updateUser, toggleUserStatus, deleteUser,
    getCurrentUserRole, approveUser, rejectUser,
    User, CreateUserData, UpdateUserData
} from './actions';
import { toast } from 'react-hot-toast';
import { UserRole } from '@/lib/auth';
import Modal from '@/components/admin/Modal';

export default function UsersClient({
    initialUsers,
    initialRole
}: { initialUsers: User[], initialRole: UserRole | null }) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToApprove, setUserToApprove] = useState<User | null>(null);
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<string>('');
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(initialRole);

    useEffect(() => {
        // Skip full fetch if we already have users populated and no filter applied
        if (!roleFilter && !statusFilter && activeFilter === '') {
            loadUsers(false); // background refresh
        } else {
            loadUsers(true);
        }
    }, [roleFilter, statusFilter, activeFilter]);

    const loadUsers = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const filters: any = {};
            if (roleFilter) filters.role = roleFilter;
            if (statusFilter) filters.status = statusFilter;
            if (activeFilter !== '') filters.is_active = activeFilter === 'active';

            const data = await getUsers(filters);
            setUsers(data);
        } catch (error: any) {
            console.error('Error loading users:', error);
            toast.error(error.message || 'Failed to load users');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleToggleStatus = async (userId: string) => {
        const toastId = toast.loading('Updating user status...');
        try {
            await toggleUserStatus(userId);
            toast.success('User status updated successfully', { id: toastId });
            loadUsers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user status', { id: toastId });
        }
    };

    const handleReject = async (user: User) => {
        const toastId = toast.loading('Rejecting user...');
        try {
            await rejectUser(user.id);
            toast.success(`${user.name}'s account has been rejected`, { id: toastId });
            loadUsers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject user', { id: toastId });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                        <Clock size={12} className="mr-1" />
                        Pending
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary-dark">
                        <CheckCircle size={12} className="mr-1" />
                        Approved
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                        <XCircle size={12} className="mr-1" />
                        Rejected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {status}
                    </span>
                );
        }
    };

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'super_admin':
                return 'bg-secondary text-white'; // Navy for highest authority
            case 'admin':
                return 'bg-primary text-white'; // Teal for standard admins
            case 'editor':
                return 'bg-primary/10 text-primary-dark'; // Light Teal for editors
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleLabel = (role: UserRole) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Count pending users for badge
    const pendingCount = users.filter(u => u.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                    <p className="text-gray-600 mt-2">Manage admin users, approvals, and permissions</p>
                </div>

                {currentUserRole === 'super_admin' && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                    >
                        <Plus size={20} />
                        <span>Add User</span>
                    </button>
                )}
            </div>

            {/* Pending approval banner */}
            {pendingCount > 0 && currentUserRole === 'super_admin' && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded flex items-center gap-3">
                    <Clock className="text-primary flex-shrink-0" size={20} />
                    <div>
                        <p className="text-primary-dark font-medium">
                            {pendingCount} user{pendingCount > 1 ? 's' : ''} awaiting approval
                        </p>
                        <p className="text-primary-dark/80 text-sm">Review and approve or reject new account requests below.</p>
                    </div>
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className="ml-auto px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                    >
                        View Pending
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="admin-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Approval Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-field"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending Approval</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input-field"
                        >
                            <option value="">All Roles</option>
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Active Status</label>
                        <select
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="admin-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading users...</div>
                ) : users.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No users found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className={`table-row ${user.status === 'pending' ? 'bg-primary/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0">
                                                    <div className="h-10 w-10 rounded-full bg-[#00A99D]/10 flex items-center justify-center">
                                                        <UserIcon className="text-[#00A99D]" size={20} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.status === 'pending' ? (
                                                <span className="text-xs text-gray-400 italic">Not assigned</span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                    <Shield size={12} className="mr-1" />
                                                    {getRoleLabel(user.role)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(user.status || 'approved')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.status === 'approved' && !(currentUserRole === 'admin' && user.role !== 'editor') && (
                                                <button
                                                    onClick={() => handleToggleStatus(user.id)}
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${user.is_active
                                                        ? 'bg-primary/10 text-primary-dark hover:bg-primary/20'
                                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                        }`}
                                                >
                                                    {user.is_active ? <Power size={12} className="mr-1" /> : <PowerOff size={12} className="mr-1" />}
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                {/* Pending user actions */}
                                                {user.status === 'pending' && currentUserRole === 'super_admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => { setUserToApprove(user); setIsApproveModalOpen(true); }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-white text-xs rounded hover:bg-primary-dark transition-colors"
                                                            title="Approve user"
                                                        >
                                                            <CheckCircle size={14} />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(user)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                                                            title="Reject user"
                                                        >
                                                            <XCircle size={14} />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {/* Approved user actions */}
                                                {user.status !== 'pending' && currentUserRole === 'super_admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}
                                                            className="text-[#00A99D] hover:text-[#008F84]"
                                                            title="Edit user"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setUserToDelete(user); setIsDeleteModalOpen(true); }}
                                                            className="text-[#DC3545] hover:text-[#DC3545]/90"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <AddUserModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => { setIsAddModalOpen(false); loadUsers(); }}
                />
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
                    onSuccess={() => { setIsEditModalOpen(false); setSelectedUser(null); loadUsers(); }}
                />
            )}

            {/* Delete User Modal */}
            {isDeleteModalOpen && userToDelete && (
                <DeleteUserModal
                    user={userToDelete}
                    onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
                    onSuccess={() => { setIsDeleteModalOpen(false); setUserToDelete(null); loadUsers(); }}
                />
            )}

            {/* Approve User Modal */}
            {isApproveModalOpen && userToApprove && (
                <ApproveUserModal
                    user={userToApprove}
                    onClose={() => { setIsApproveModalOpen(false); setUserToApprove(null); }}
                    onSuccess={() => { setIsApproveModalOpen(false); setUserToApprove(null); loadUsers(); }}
                />
            )}
        </div>
    );
}

// Approve User Modal
function ApproveUserModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: () => void }) {
    const [role, setRole] = useState<UserRole>('editor');
    const [saving, setSaving] = useState(false);

    const handleApprove = async () => {
        setSaving(true);
        const toastId = toast.loading('Approving user...');
        try {
            await approveUser(user.id, role);
            toast.success(`${user.name} has been approved as ${role.replace('_', ' ')}!`, { id: toastId });
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve user', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Approve User Account">
            <div className="space-y-4">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                    <p className="text-sm text-primary-dark">
                        You are approving <span className="font-semibold">{user.name}</span> ({user.email}) to access the admin panel.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Role *</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="input-field w-full"
                    >
                        <option value="editor">Editor — Can create and edit content</option>
                        <option value="admin">Admin — Can manage content and users (editors only)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        The role can be changed later from the user management panel.
                    </p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApprove}
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <CheckCircle size={16} />
                        {saving ? 'Approving...' : 'Approve & Assign Role'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// Add User Modal Component
function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState<CreateUserData>({
        name: '',
        email: '',
        password: '',
        role: 'editor',
        is_active: true,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.password) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Creating user...');

        try {
            await createUser(formData);
            toast.success('User created successfully!', { id: toastId });
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create user', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Add New User">
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 text-primary-dark rounded text-sm">
                Users created here are immediately approved and active.
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field w-full"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-field w-full"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input-field w-full"
                        required
                        minLength={6}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                        className="input-field w-full"
                    >
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                    </select>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-[#00A99D] focus:ring-[#00A99D] border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                        Active user
                    </label>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Creating...' : 'Create User'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState<UpdateUserData>({
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSaving(true);
        const toastId = toast.loading('Updating user...');

        try {
            await updateUser(user.id, formData);
            toast.success('User updated successfully!', { id: toastId });
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Edit User">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-field w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                        className="input-field w-full"
                    >
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                    </select>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="edit_is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-[#00A99D] focus:ring-[#00A99D] border-gray-300 rounded"
                    />
                    <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-900">
                        Active user
                    </label>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Updating...' : 'Update User'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// Delete User Modal Component
function DeleteUserModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: () => void }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        const toastId = toast.loading('Deleting user...');

        try {
            await deleteUser(user.id);
            toast.success('User deleted permanently', { id: toastId });
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete user', { id: toastId });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Delete User">
            <div className="space-y-4">
                <p className="text-gray-600">
                    Are you sure you want to <span className="font-bold text-red-600">PERMANENTLY DELETE</span> the user <span className="font-semibold">{user.email}</span>?
                </p>
                <p className="text-sm text-gray-500">
                    This action cannot be undone. The user will be completely removed from the database and will no longer be able to log in.
                </p>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                        {deleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
