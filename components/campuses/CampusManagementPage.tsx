
import React, { useState } from 'react';
import { Campus, User } from '../../types';
import Card from '../ui/Card';
import { BuildingOfficeIcon, EditIcon, TrashIcon, CloseIcon, ClipboardDocumentListIcon } from '../icons';
import { useData } from '../../context/DataContext';

const CampusFormModal: React.FC<{
    onClose: () => void;
    onSave: (campus: Omit<Campus, 'id' | 'teachers' | 'students'>) => void;
    campusToEdit: Campus | null;
}> = ({ onClose, onSave, campusToEdit }) => {
    const isEditing = !!campusToEdit;
    const [formData, setFormData] = useState({
        name: campusToEdit?.name || '',
        address: campusToEdit?.address || '',
        admin: campusToEdit?.admin || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">{isEditing ? 'Editar Sede' : 'Nueva Sede'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Nombre de la Sede</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Dirección</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Nombre del Administrador (Opcional)</label>
                        <input type="text" name="admin" value={formData.admin} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Se asignará desde la sección Admin" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors">
                            {isEditing ? 'Guardar Cambios' : 'Crear Sede'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{ campus: Campus; onClose: () => void; onConfirm: () => void; }> = ({ campus, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Eliminar Sede</h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">¿Está seguro de que desea eliminar la sede <span className="font-bold text-gray-900 dark:text-white">{campus.name}</span>? Esto puede afectar a los usuarios asociados.</p>
            <div className="flex justify-end space-x-3">
                <button onClick={onClose} className="bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm hover:bg-gray-200 transition-colors">Cancelar</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-red-700 shadow-sm transition-colors">Eliminar</button>
            </div>
        </Card>
    </div>
);

const CampusManagementPage: React.FC = () => {
    const { campuses, addCampus, updateCampus, deleteCampus } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
    const [deletingCampus, setDeletingCampus] = useState<Campus | null>(null);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleSave = async (data: any) => {
        try {
            if (editingCampus) {
                await updateCampus(editingCampus.id, data);
                showNotification('Sede actualizada', 'success');
            } else {
                await addCampus(data);
                showNotification('Sede creada', 'success');
            }
            setIsModalOpen(false);
        } catch (e: any) {
            showNotification(e.message || 'Error al guardar', 'error');
        }
    };

    const handleDelete = async () => {
        if (deletingCampus) {
            try {
                await deleteCampus(deletingCampus.id);
                showNotification('Sede eliminada', 'success');
            } catch (e) {
                showNotification('Error al eliminar', 'error');
            }
            setDeletingCampus(null);
        }
    };

    const openCreateModal = () => { setEditingCampus(null); setIsModalOpen(true); };
    const openEditModal = (campus: Campus) => { setEditingCampus(campus); setIsModalOpen(true); };

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
            
            <Card className="bg-transparent shadow-none border-none p-0">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <BuildingOfficeIcon className="w-8 h-8 text-primary" />
                            Gestión de Sedes
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 ml-10">Administra los campus y su personal.</p>
                    </div>
                    <button onClick={openCreateModal} className="bg-primary text-white font-bold py-2.5 px-5 rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-2 text-sm">
                        <BuildingOfficeIcon className="w-5 h-5"/> Añadir Sede
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campuses.map(campus => (
                        <div key={campus.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/20 dark:text-blue-400">
                                        <BuildingOfficeIcon className="w-6 h-6"/>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded dark:bg-slate-800">{campus.teachers + campus.students} Usuarios</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{campus.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    {campus.address}
                                </p>
                                
                                <div className="mt-6 space-y-3">
                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 dark:border-slate-800">
                                        <span className="text-slate-500">Admin</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{campus.admin || 'Sin asignar'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 dark:border-slate-800">
                                        <span className="text-slate-500">Profesores</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{campus.teachers}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Estudiantes</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{campus.students}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                 <button onClick={() => openEditModal(campus)} className="text-sm font-bold text-primary hover:text-blue-700 flex items-center gap-1.5 transition-colors">
                                    <ClipboardDocumentListIcon className="w-4 h-4" /> Detalles
                                </button>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => openEditModal(campus)} className="p-2 rounded-full bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:text-amber-400" title="Editar"><EditIcon className="w-4 h-4"/></button>
                                     <button onClick={() => setDeletingCampus(campus)} className="p-2 rounded-full bg-white text-slate-500 border border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:text-rose-400" title="Eliminar"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {isModalOpen && <CampusFormModal onClose={() => setIsModalOpen(false)} onSave={handleSave} campusToEdit={editingCampus} />}
            {deletingCampus && <DeleteConfirmationModal campus={deletingCampus} onClose={() => setDeletingCampus(null)} onConfirm={handleDelete} />}
        </>
    );
};

export default CampusManagementPage;
