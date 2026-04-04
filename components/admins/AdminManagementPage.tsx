
import React, { useState } from 'react';
import Card from '../ui/Card';
import { UserAddIcon, EditIcon, KeyIcon, TrashIcon, PaperAirplaneIcon, ShieldCheckIcon, CloseIcon, EyeIcon, EyeSlashIcon } from '../icons';
import { UserRole, AdminUser, User, Campus } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const AdminFormModal: React.FC<{
    onClose: () => void;
    onSave: (admin: Omit<AdminUser, 'id' | 'role' | 'avatar' | 'campusId' | 'campusName'>) => void;
    adminToEdit: AdminUser | null;
}> = ({ onClose, onSave, adminToEdit }) => {
    const isEditing = !!adminToEdit;
    const [formData, setFormData] = useState({
        name: adminToEdit?.name || '',
        email: adminToEdit?.email || '',
        status: adminToEdit?.status || 'active',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">{isEditing ? 'Editar Administrador' : 'Nuevo Administrador'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Nombre Completo</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Correo Electrónico</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Estado</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors">
                            {isEditing ? 'Guardar Cambios' : 'Crear Administrador'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const TempPasswordModal: React.FC<{ user: User; onClose: () => void; onSave: (tempPass: string) => void; }> = ({ user, onClose, onSave }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(password);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-sm">
                <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Asignar Clave Provisional</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">Usuario: <strong>{user.name}</strong></p>
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-6">
                        <label className="block text-xs font-bold mb-1 uppercase text-gray-500 dark:text-gray-400">Nueva Contraseña</label>
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white pr-10"
                            placeholder="Ingrese clave temporal"
                            required
                            minLength={4}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200">Cancelar</button>
                        <button type="submit" className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 shadow-md">Guardar</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{ admin: AdminUser; onClose: () => void; onConfirm: () => void; }> = ({ admin, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Eliminar Administrador</h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">¿Está seguro de que desea eliminar a <span className="font-bold text-gray-900 dark:text-white">{admin.name}</span>? Esta acción es irreversible.</p>
            <div className="flex justify-end space-x-3">
                <button onClick={onClose} className="bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm hover:bg-gray-200 transition-colors">Cancelar</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-red-700 shadow-sm transition-colors">Eliminar</button>
            </div>
        </Card>
    </div>
);

const ResetPasswordConfirmationModal: React.FC<{ user: User; onClose: () => void; onConfirm: () => void; }> = ({ user, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Restablecer Contraseña (Email)</h2>
             <div className="space-y-3 text-sm">
                <p className="dark:text-gray-300">Se enviará un correo electrónico a <strong className="text-primary">{user.email}</strong> con un enlace para que pueda establecer una nueva contraseña.</p>
                <p className="dark:text-gray-400">¿Desea continuar?</p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg text-sm hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-white">Cancelar</button>
                <button onClick={onConfirm} className="bg-primary text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 shadow-md transition-colors">
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Enviar Enlace
                </button>
            </div>
        </Card>
    </div>
);

const AdminManagementPage: React.FC = () => {
    const { admins, addAdmin, updateAdmin, deleteAdmin, campuses, assignTemporaryPassword } = useData();
    const { sendPasswordReset, user } = useAuth();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
    const [resettingPasswordAdmin, setResettingPasswordAdmin] = useState<AdminUser | null>(null);
    const [assigningPassAdmin, setAssigningPassAdmin] = useState<AdminUser | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
    const [expandedAdminId, setExpandedAdminId] = useState<string | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleSave = async (data: any) => {
        try {
            const adminData = { ...data };

            if (editingAdmin) {
                await updateAdmin(editingAdmin.id, adminData);
                showNotification('Administrador actualizado', 'success');
            } else {
                await addAdmin(adminData);
                showNotification('Administrador creado', 'success');
            }
            setIsModalOpen(false);
        } catch (e: any) {
            showNotification(e.message || 'Error al guardar', 'error');
        }
    };

    const handleDelete = async () => {
        if (deletingAdmin) {
            try {
                await deleteAdmin(deletingAdmin.id);
                showNotification('Administrador eliminado', 'success');
            } catch (e) {
                showNotification('Error al eliminar', 'error');
            }
            setDeletingAdmin(null);
        }
    };

    const handleSendResetLink = async () => {
        if (resettingPasswordAdmin) {
            try {
                await sendPasswordReset(resettingPasswordAdmin.email);
                showNotification(`Enlace enviado a ${resettingPasswordAdmin.email}`, 'success');
            } catch (e) {
                showNotification('Error al enviar enlace', 'error');
            }
            setResettingPasswordAdmin(null);
        }
    };

    const handleAssignTempPass = async (tempPass: string) => {
        if (assigningPassAdmin) {
            try {
                await assignTemporaryPassword(assigningPassAdmin.id, UserRole.CAMPUS_ADMIN, tempPass);
                showNotification('Contraseña provisional asignada', 'success');
            } catch (e) {
                showNotification('Error al asignar contraseña', 'error');
            }
            setAssigningPassAdmin(null);
        }
    };

    const openCreateModal = () => { setEditingAdmin(null); setIsModalOpen(true); };
    const openEditModal = (admin: AdminUser) => { setEditingAdmin(admin); setIsModalOpen(true); };
    const toggleExpand = (adminId: string) => { setExpandedAdminId(prev => prev === adminId ? null : adminId); };

    const adminsForView = admins.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

    return (
        <>
            {notification && (
                <div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 ${
                    notification.type === 'success' ? 'bg-emerald-600 text-white' : 
                    notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                }`}>
                    <span className="font-medium text-sm">{notification.message}</span>
                </div>
            )}
            <Card className="flex flex-col h-full border-none shadow-none bg-transparent p-0">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                    
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900">
                        <div>
                            <h2 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg dark:bg-emerald-900/20 dark:text-emerald-400">
                                    <ShieldCheckIcon className="w-6 h-6" />
                                </div>
                                Gestión de Administradores
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400 ml-11">Control de acceso y roles administrativos.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nombre..." 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                />
                                <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                    </svg>
                                </div>
                            </div>
                            <button onClick={openCreateModal} className="bg-primary text-white font-bold py-2.5 px-5 rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm flex items-center justify-center gap-2">
                                <UserAddIcon className="w-5 h-5"/> Añadir Admin
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 font-semibold tracking-wider dark:bg-slate-800 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th scope="col" className="px-6 py-4 w-10"></th>
                                    <th scope="col" className="px-6 py-4">Nombre</th>
                                    <th scope="col" className="px-6 py-4">Email</th>
                                    <th scope="col" className="px-6 py-4">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {adminsForView.map(admin => (
                                    <React.Fragment key={admin.id}>
                                        <tr className="bg-white hover:bg-slate-50/80 transition-colors dark:bg-slate-900 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleExpand(admin.id)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500">
                                                    <svg className={`w-4 h-4 transition-transform ${expandedAdminId === admin.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                        {admin.name.charAt(0)}
                                                    </div>
                                                    {admin.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{admin.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${admin.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'}`}>
                                                    {admin.status === 'active' ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedAdminId === admin.id && (
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                                <td colSpan={4} className="px-6 py-4">
                                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                                        <div className="flex-1">
                                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Sedes Asignadas</h4>
                                                            {campuses.filter(c => c.admin === admin.name).length > 0 ? (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {campuses.filter(c => c.admin === admin.name).map(c => (
                                                                        <span key={c.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                                                            {c.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No tiene sedes asignadas.</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-4 md:pt-0 md:pl-4">
                                                            {isSuperAdmin && (
                                                                <button onClick={() => setAssigningPassAdmin(admin)} className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-all focus:outline-none shadow-sm dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 flex items-center gap-2 text-xs font-medium" title="Asignar Clave Provisional">
                                                                    <KeyIcon className="w-4 h-4"/> Clave
                                                                </button>
                                                            )}
                                                            <button onClick={() => setResettingPasswordAdmin(admin)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 transition-all focus:outline-none shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center gap-2 text-xs font-medium" title="Restablecer Contraseña (Email)">
                                                                <PaperAirplaneIcon className="w-4 h-4"/> Reset
                                                            </button>
                                                            <button onClick={() => openEditModal(admin)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-amber-600 transition-all focus:outline-none shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400 flex items-center gap-2 text-xs font-medium" title="Editar">
                                                                <EditIcon className="w-4 h-4"/> Editar
                                                            </button>
                                                            <button onClick={() => setDeletingAdmin(admin)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 transition-all focus:outline-none shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-2 text-xs font-medium" title="Eliminar">
                                                                <TrashIcon className="w-4 h-4"/> Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                 {adminsForView.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-500">No se encontró personal.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
            
            {isModalOpen && <AdminFormModal onClose={() => setIsModalOpen(false)} onSave={handleSave} adminToEdit={editingAdmin} campuses={campuses} />}
            {deletingAdmin && <DeleteConfirmationModal admin={deletingAdmin} onClose={() => setDeletingAdmin(null)} onConfirm={handleDelete} />}
            {resettingPasswordAdmin && <ResetPasswordConfirmationModal user={resettingPasswordAdmin} onClose={() => setResettingPasswordAdmin(null)} onConfirm={handleSendResetLink} />}
            {assigningPassAdmin && <TempPasswordModal user={assigningPassAdmin} onClose={() => setAssigningPassAdmin(null)} onSave={handleAssignTempPass} />}
        </>
    );
};

export default AdminManagementPage;
