import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import Card, { CardContent, CardHeader } from '../components/Card';
import { TrashIcon, ShieldCheckIcon } from '../components/Icons';
import Modal from '../components/Modal';

// Simple Pie Chart Component using SVG
const PieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  if (total === 0) {
    return (
      <div className="w-48 h-48 rounded-full bg-slate-200 flex items-center justify-center">
        <span className="text-slate-500 text-sm">No Data</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <svg width="200" height="200" viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
        {data.map((item, index) => {
          const sliceAngle = (item.value / total) * 2 * Math.PI;
          const x1 = Math.cos(currentAngle);
          const y1 = Math.sin(currentAngle);
          currentAngle += sliceAngle;
          const x2 = Math.cos(currentAngle);
          const y2 = Math.sin(currentAngle);
          const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

          // If it's a full circle (only one item has value)
          if (item.value === total) {
            return <circle key={index} cx="0" cy="0" r="1" fill={item.color} />;
          }

          const pathData = [
            `M 0 0`,
            `L ${x1} ${y1}`,
            `A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `Z`
          ].join(' ');

          return <path key={index} d={pathData} fill={item.color} />;
        })}
      </svg>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
            <span className="text-sm font-medium text-slate-700">
              {item.label}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminScreen: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [deleteTarget, setDeleteTarget] = useState<{id: string, email: string} | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const fetchUsers = async () => {
      try {
        const snapshot = await db.collection('users').get();
        const usersData = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const confirmDeleteUser = async () => {
    if (!db || !deleteTarget) return;
    try {
      await db.collection('users').doc(deleteTarget.id).delete();
      setUsers(users.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setAlertMessage('User deleted successfully.');
    } catch (error) {
      console.error("Error deleting user:", error);
      setDeleteTarget(null);
      setAlertMessage('Failed to delete user.');
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-slate-600 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const proUsersCount = users.filter(u => u.isPro).length;
  const basicUsersCount = users.length - proUsersCount;

  const chartData = [
    { label: 'Premium (PRO)', value: proUsersCount, color: '#3b82f6' }, // blue-500
    { label: 'Basic', value: basicUsersCount, color: '#94a3b8' } // slate-400
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-bold text-slate-800">User Distribution</h3>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            {isLoading ? (
              <div className="text-slate-500">Loading data...</div>
            ) : (
              <PieChart data={chartData} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-lg font-bold text-slate-800">Manage Users</h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-slate-500 py-4">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-sm text-slate-500">
                      <th className="py-3 px-4 font-bold">Email</th>
                      <th className="py-3 px-4 font-bold">Name</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{u.email}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{u.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm">
                          {u.isPro ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">PRO</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600">Basic</span>
                          )}
                          {u.isAdmin && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 ml-2">Admin</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDeleteTarget({id: u.id, email: u.email})}
                            disabled={u.id === user.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                            title={u.id === user.id ? "Cannot delete yourself" : "Delete User"}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {deleteTarget && (
        <Modal isOpen={true} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to delete user <span className="font-bold text-slate-800">{deleteTarget.email}</span>?
            </p>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </Modal>
      )}

      {alertMessage && (
        <Modal isOpen={true} onClose={() => setAlertMessage(null)} title="Notification">
          <div className="space-y-4">
            <p className="text-slate-600">{alertMessage}</p>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminScreen;
