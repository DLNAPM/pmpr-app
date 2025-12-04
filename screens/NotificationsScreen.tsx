import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import Card, { CardContent, CardHeader } from '../components/Card';
import { BellIcon, CheckCircleIcon, TrashIcon } from '../components/Icons';
import { Notification } from '../types';

const NotificationsScreen: React.FC = () => {
    const { notifications, addNotification, updateNotification, deleteNotification } = useAppContext();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const { received, sent } = useMemo(() => {
        if (!user) return { received: [], sent: [] };
        const myEmail = user.email.toLowerCase();
        const received = notifications
            .filter(n => n.recipientEmail.toLowerCase() === myEmail)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const sent = notifications
            .filter(n => n.senderId === user.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return { received, sent };
    }, [notifications, user]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!recipientEmail || !message) {
            setError('Recipient email and message cannot be empty.');
            return;
        }
        if (recipientEmail.toLowerCase() === user?.email.toLowerCase()) {
            setError('You cannot send a notification to yourself.');
            return;
        }
        addNotification({ recipientEmail: recipientEmail.toLowerCase(), message });
        setRecipientEmail('');
        setMessage('');
        setActiveTab('sent');
    };

    const handleAcknowledge = (id: string) => {
        updateNotification(id, { isAcknowledged: true });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this notification?')) {
            deleteNotification(id);
        }
    };
    
    if (!user) {
         return (
            <div className="text-center py-10 text-gray-500">
                <BellIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                <p>You must be logged in to use notifications.</p>
            </div>
        );
    }

    const NotificationItem: React.FC<{ n: Notification, type: 'received' | 'sent' }> = ({ n, type }) => (
        <div className="p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-500">
                        {type === 'received' ? `From: ${n.senderName} (${n.senderEmail})` : `To: ${n.recipientEmail}`}
                    </p>
                    <p className="mt-2 text-gray-800">{n.message}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-gray-400">{new Date(n.timestamp).toLocaleString()}</p>
                    {type === 'sent' && (
                        <div className={`mt-2 flex items-center justify-end gap-1 text-sm ${n.isAcknowledged ? 'text-green-600' : 'text-gray-500'}`}>
                            {n.isAcknowledged ? <CheckCircleIcon className="w-4 h-4" /> : null}
                            {n.isAcknowledged ? 'Acknowledged' : 'Pending'}
                        </div>
                    )}
                </div>
            </div>
             {type === 'received' && (
                <div className="flex justify-end items-center gap-2 mt-3 pt-3 border-t">
                    {!n.isAcknowledged && <button onClick={() => handleAcknowledge(n.id)} className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200">Acknowledge</button>}
                    <button onClick={() => handleDelete(n.id)} className="text-gray-400 hover:text-red-600" aria-label="Delete Notification">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
             )}
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button onClick={() => setActiveTab('received')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'received' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    Received
                                </button>
                                <button onClick={() => setActiveTab('sent')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'sent' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    Sent
                                </button>
                            </nav>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {activeTab === 'received' && (
                           received.length > 0
                           ? received.map(n => <NotificationItem key={n.id} n={n} type="received" />)
                           : <p className="text-gray-500 text-center py-8">You have no received notifications.</p>
                       )}
                       {activeTab === 'sent' && (
                           sent.length > 0
                           ? sent.map(n => <NotificationItem key={n.id} n={n} type="sent" />)
                           : <p className="text-gray-500 text-center py-8">You have no sent notifications.</p>
                       )}
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Compose Notification</h3></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendMessage} className="space-y-4">
                            <div>
                                <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700">Recipient's Email</label>
                                <input
                                    id="recipientEmail"
                                    type="email"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    placeholder="landlord@example.com"
                                    required
                                    className="w-full p-2 border rounded mt-1"
                                />
                            </div>
                             <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                                <textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={4}
                                    required
                                    className="w-full p-2 border rounded mt-1"
                                    placeholder="e.g., Please share property data with me for 123 Main St."
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Send Message
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default NotificationsScreen;
