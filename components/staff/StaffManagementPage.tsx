import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { UserAddIcon, EditIcon, KeyIcon, TrashIcon } from '../icons';
import { UserRole, Campus, AdminUser } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

// ... (Keep Modals logic identical)

const StaffFormModal: React.FC<{
    onClose: () => void;
    onSave: (staff: Omit<AdminUser, 'id' | 'role' | 'avatar' | 'campusId' | 'campusName' >) => void;
    staffToEdit: AdminUser | null;
}> = ({ onClose, onSave, staffToEdit }) => {
    const isEditing = !!staffToEdit;
    const [name, setName] = useState(staffToEdit?.name || '');
    const [email, setEmail] = useState(staffToEdit?.email || '');
    const [status, setStatus] = useState<'active' | 'inactive'>(staffToEdit?.status || 'active');
    const [error, setError] = useState('');

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val)) {
            setName(val);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        onSave({ name, email, status });
    };

    const statusClasses = status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6 dark:text-white">{isEditing ? 'Editar Personal' : 'Añadir Nuevo Personal'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <label className="block text-sm font-bold mb-2 dark:text-gray-300">Nombre Completo</label>
                        <input type="text" value={name} onChange={handleNameChange} className="w-full p-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 dark:text-gray-300">Correo Electrónico</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-2 dark:text-gray-300">Estado</label>
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className={`w-full p-2 border rounded font-semibold ${statusClasses} focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600`} required>
                            <option className="bg-white text-black dark:bg-gray-800 dark:text-gray-200" value="active">Activo</option>
                            <option className="bg-white text-black dark:bg-gray-800 dark:text-gray-200" value="inactive">Inactivo</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t dark:border-gray-600">
                        <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-blue-700">{isEditing ? 'Guardar Cambios' : 'Crear Personal'}</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{ staff: AdminUser; onClose: () => void; onConfirm: () => void; }> = ({ staff, onClose, onConfirm }) => (
     <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Confirmar Eliminación</h2>
            <p className="mb-6 dark:text-gray-300">¿Está seguro de que desea eliminar a <span className="font-bold">{staff.name}</span>?</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onClose} className="bg-gray-300 font-bold py-2 px-4 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700">Eliminar</button>
            </div>
        </Card>
    </div>
);


const StaffManagementPage: React.FC = () => {
    const { user } = useAuth();
    const { admins, addAdmin, updateAdmin, deleteAdmin } = useData();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null);
    const [deletingStaff, setDeletingStaff] = useState<AdminUser | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSave = (staffData: Omit<AdminUser, 'id' | 'role' | 'avatar' | 'campusId' | 'campusName' >) => {
        if (editingStaff) {
            updateAdmin(editingStaff.id, staffData);
        } else {
            addAdmin({ ...staffData, campusId: user?.campusId || '', campusName: user?.campusName || '' });
        }
        setIsModalOpen(false);
        setEditingStaff(null);
    };

    const handleDelete = () => {
        if (deletingStaff) {
            deleteAdmin(deletingStaff.id);
            setDeletingStaff(null);
        }
    };

    const staffForView = admins
        .filter(s => s.campusId === user?.campusId)
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <>
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold dark:text-white">Gestión de Personal ({user?.campusName})</h2>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 p-2 border rounded bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        />
                        <button onClick={() => { setEditingStaff(null); setIsModalOpen(true); }} className="bg-primary text-white font-bold py-2 px-4 rounded flex items-center gap-2 whitespace-nowrap hover:bg-blue-700">
                            <UserAddIcon className="w-5 h-5"/> Añadir Personal
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nombre</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Rol</th>
                                <th scope="col" className="px-6 py-3">Estado</th>
                                <th scope="col" className="px-6 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffForView.map(staff => (
                                <tr key={staff.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{staff.name}</td>
                                    <td className="px-6 py-4">{staff.email}</td>
                                    <td className="px-6 py-4">{staff.role}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${staff.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {staff.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center space-x-2">
                                        <button onClick={() => { setEditingStaff(staff); setIsModalOpen(true); }} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-yellow-600 dark:text-yellow-400 transition-colors focus:outline-none shadow-sm" title="Editar">
                                            <EditIcon className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => setDeletingStaff(staff)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-red-600 dark:text-red-400 transition-colors focus:outline-none shadow-sm" title="Eliminar">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {staffForView.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-text-secondary">No se encontró personal.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && <StaffFormModal onClose={() => setIsModalOpen(false)} onSave={handleSave} staffToEdit={editingStaff} />}
            {deletingStaff && <DeleteConfirmationModal staff={deletingStaff} onClose={() => setDeletingStaff(null)} onConfirm={handleDelete} />}
        </>
    );
};

export default StaffManagementPage;