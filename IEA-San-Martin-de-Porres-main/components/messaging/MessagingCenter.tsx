import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { User, UserRole, AdminUser, Teacher, Student, Message } from '../../types';
import { PaperAirplaneIcon } from '../icons';

// Helper to determine which users a given user can chat with
const getAvailableContacts = (currentUser: User, allUsers: User[]): User[] => {
    // Super Admin can see everyone
    if (currentUser.role === UserRole.SUPER_ADMIN) {
        return allUsers.filter(u => u.id !== currentUser.id);
    }
    
    if (!currentUser.campusId) return [];

    const campusUsers = allUsers.filter(u => u.campusId === currentUser.campusId && u.id !== currentUser.id);
    const campusAdmin = allUsers.find(u => u.campusId === currentUser.campusId && u.role === UserRole.CAMPUS_ADMIN);
    const campusTeachers = campusUsers.filter(u => u.role === UserRole.TEACHER);

    switch (currentUser.role) {
        case UserRole.TEACHER: {
            const campusStudents = campusUsers.filter(u => u.role === UserRole.STUDENT);
            const campusParents = campusUsers.filter(u => u.role === UserRole.PARENT);
            return [campusAdmin, ...campusStudents, ...campusParents].filter(Boolean) as User[];
        }
        case UserRole.STUDENT:
        case UserRole.PARENT:
            return [campusAdmin, ...campusTeachers].filter(Boolean) as User[];
        case UserRole.CAMPUS_ADMIN:
            return campusUsers.filter(u => u.role !== UserRole.CAMPUS_ADMIN);
        default:
            return [];
    }
};


interface MessagingCenterProps {
    onClose: () => void;
    onMessagesRead: () => void;
}

const MessagingCenter: React.FC<MessagingCenterProps> = ({ onClose, onMessagesRead }) => {
    const { user: currentUser } = useAuth();
    const { admins, teachers, students, messages, addMessage, updateMessage } = useData();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [contacts, setContacts] = useState<User[]>([]);
    const [selectedContact, setSelectedContact] = useState<User | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load all potential users from DataContext
        // NOTE: We don't have a separate "parents" storage, so we'll use a mock one for now.
        const mockParents: User[] = [{ id: 'user-p-01', name: 'Maria González', email: 'parent@example.com', role: UserRole.PARENT, campusId: 'C001', avatar: 'https://picsum.photos/seed/parent/100/100' }];
        
        const loadedUsers = [...admins, ...teachers, ...students, ...mockParents];
        setAllUsers(loadedUsers as User[]);

        if (currentUser) {
            const availableContacts = getAvailableContacts(currentUser, loadedUsers as User[]);
            setContacts(availableContacts);
        }

    }, [currentUser, admins, teachers, students]);

    useEffect(() => {
        // Scroll to the latest message when a chat is opened or a new message is added
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedContact, messages]);

    // Add a robust guard to prevent rendering if the user is not available.
    if (!currentUser) {
        return null;
    }

    const handleSelectContact = (contact: User) => {
        setSelectedContact(contact);
        // Mark messages from this contact as read
        messages.forEach(msg => {
            if (msg.senderId === contact.id && msg.recipientId === currentUser.id && !msg.read) {
                updateMessage(msg.id, { read: true });
            }
        });
        onMessagesRead(); // Notify parent to update unread count
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        await addMessage({
            senderId: currentUser.id,
            recipientId: selectedContact.id,
            text: newMessage.trim(),
            read: false,
        });
        
        setNewMessage('');
    };
    
    const unreadCounts = contacts.reduce((acc, contact) => {
        const count = messages.filter(msg => msg.senderId === contact.id && msg.recipientId === currentUser.id && !msg.read).length;
        if (count > 0) {
            acc[contact.id] = count;
        }
        return acc;
    }, {} as Record<string, number>);

    const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-surface w-full max-w-4xl h-[90vh] rounded-lg shadow-2xl flex flex-col dark:bg-gray-800 dark:border dark:border-gray-700">
                <div className="p-3 border-b dark:border-gray-600 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-text-primary dark:text-white">Centro de Mensajería</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
                </div>
                <div className="flex flex-grow overflow-hidden">
                    {/* Contact List */}
                    <div className="w-1/3 border-r dark:border-gray-600 flex flex-col">
                        <div className="p-2 border-b dark:border-gray-600">
                            <input
                                type="text"
                                placeholder={`Buscar...`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full p-2 border rounded text-sm bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            />
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {filteredContacts.length > 0 ? (
                                filteredContacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => handleSelectContact(contact)}
                                        className={`flex items-center p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedContact?.id === contact.id ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
                                    >
                                        <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full mr-3 object-cover" />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-sm text-text-primary dark:text-gray-200">{contact.name}</p>
                                            <p className="text-xs text-text-secondary dark:text-gray-400">{contact.role}</p>
                                        </div>
                                        {unreadCounts[contact.id] && (
                                            <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                                                {unreadCounts[contact.id]}
                                            </span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-text-secondary dark:text-gray-400">
                                    <p>No se encontraron contactos.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Window */}
                    <div className="w-2/3 flex flex-col">
                        {selectedContact ? (
                            <>
                                <div className="p-2 border-b dark:border-gray-600 flex items-center">
                                    <img src={selectedContact.avatar} alt={selectedContact.name} className="w-9 h-9 rounded-full mr-3 object-cover"/>
                                    <div>
                                        <p className="font-bold text-sm text-text-primary dark:text-white">{selectedContact.name}</p>
                                        <p className="text-xs text-text-secondary dark:text-gray-400">{selectedContact.role}</p>
                                    </div>
                                </div>
                                <div className="flex-grow p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 space-y-3">
                                    {messages
                                        .filter(msg => (msg.senderId === currentUser.id && msg.recipientId === selectedContact.id) || (msg.senderId === selectedContact.id && msg.recipientId === currentUser.id))
                                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                        .map(msg => (
                                            <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-xs md:max-w-md lg:max-w-lg p-2 px-3 rounded-2xl text-sm ${msg.senderId === currentUser.id ? 'bg-primary text-white' : 'bg-gray-200 text-text-primary dark:bg-gray-600 dark:text-gray-200'}`}>
                                                    <p>{msg.text}</p>
                                                    <p className={`text-xs mt-1 ${msg.senderId === currentUser.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="p-3 border-t dark:border-gray-600">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder="Escribe un mensaje..."
                                            className="w-full p-2 border rounded-full text-sm bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                            autoComplete="off"
                                        />
                                        <button type="submit" className="bg-primary text-white p-2.5 rounded-full hover:bg-blue-700 transition-colors">
                                            <PaperAirplaneIcon className="w-5 h-5"/>
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-text-secondary dark:text-gray-400">
                                <p>Selecciona un contacto para empezar a chatear.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessagingCenter;