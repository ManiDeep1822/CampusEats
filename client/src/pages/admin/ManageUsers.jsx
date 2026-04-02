import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiTrash2, FiEdit2, FiShield, FiX, FiCheck, FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, role) => {
    if (role === 'admin') {
      toast.error('Cannot delete an admin account');
      return;
    }
    if (window.confirm('Are you sure you want to completely remove this user? This cannot be undone.')) {
      const oldUsers = [...users];
      
      // ⚡ Optimistic UI: Remove user immediately from view
      setUsers(users.filter(u => u._id !== id));
      
      try {
        await api.delete(`/admin/users/${id}`);
        toast.success('User removed successfully');
      } catch (error) {
        // Rollback if server fails
        setUsers(oldUsers);
        toast.error(error.response?.data?.message || 'Error deleting user. Status restored.');
      }
    }
  };

  const handleUpdateRole = async (id) => {
    const oldUsers = [...users];
    const targetUser = users.find(u => u._id === id);
    
    // ⚡ Optimistic UI: Change role immediately
    setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u));
    setEditingRole(null);

    try {
      const { data } = await api.put(`/admin/users/${id}/role`, { role: newRole });
      toast.success(`User "${targetUser?.name || 'User'}" is now a ${data.role}`);
      // Re-sync with production server data
      setUsers(users.map(u => u._id === id ? { ...u, role: data.role } : u));
    } catch (error) {
      // Rollback if server fails
      setUsers(oldUsers);
      toast.error('Error updating role. Changes reverted.');
    }
  };

  const startEditing = (user) => {
    setEditingRole(user._id);
    setNewRole(user.role);
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                <FiUsers className="text-blue-500" />
                Manage Users
              </h1>
              <p className="text-gray-500 mt-2">Control access, assign roles, and remove rogue accounts.</p>
            </div>
            <Link to="/admin/dashboard" className="text-gray-500 hover:text-primary font-bold flex items-center gap-2 transition-colors bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md w-fit active:scale-95">
              <FiArrowLeft /> Back to Dashboard
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-sm font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email / Phone</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(users || []).map((user, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={user?._id} 
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-200">
                          {user?.profilePic ? (
                            <img src={user.profilePic} alt={user?.name} className="w-full h-full object-cover" />
                          ) : (
                            (user?.name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{user?.name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-400">ID: {user?._id?.slice(-6) || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                      <p className="text-xs text-gray-400">{user?.phone || 'No phone'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {editingRole === user?._id ? (
                        <div className="flex items-center gap-2">
                          <select 
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="text-sm border-gray-200 rounded-lg bg-gray-50 focus:ring-primary focus:border-primary px-2 py-1"
                          >
                            <option value="student">Student</option>
                            <option value="vendor">Vendor</option>
                            <option value="delivery">Delivery</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => handleUpdateRole(user?._id)} className="text-emerald-500 hover:bg-emerald-50 p-1.5 rounded-md"><FiCheck size={16}/></button>
                          <button onClick={() => setEditingRole(null)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-md"><FiX size={16}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-24">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            user?.role === 'vendor' ? 'bg-orange-100 text-orange-700' :
                            user?.role === 'delivery' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {user?.role === 'admin' && <FiShield className="mr-1" />}
                            {user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'User'}
                          </span>
                          {user?.role !== 'admin' && (
                            <button 
                              onClick={() => startEditing(user)}
                              className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit Role"
                            >
                              <FiEdit2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user?._id, user?.role)}
                        disabled={user?.role === 'admin'}
                        className="text-gray-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-gray-400 p-2 rounded-full hover:bg-rose-50 transition-all"
                        title="Delete User"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No users found.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ManageUsers;
