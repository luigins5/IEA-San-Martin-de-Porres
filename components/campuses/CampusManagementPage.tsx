
import React, { useState } from 'react';
import { Campus, User, UserRole } from '../../types';
import Card from '../ui/Card';
import { BuildingOfficeIcon, EditIcon, TrashIcon, CloseIcon, ClipboardDocumentListIcon, UploadIcon, DownloadIcon } from '../icons';
import { useData } from '../../context/DataContext';

const BulkUploadModal: React.FC<{
    onClose: () => void;
    onSave: (parsedData: any[]) => void;
}> = ({ onClose, onSave }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            setIsProcessing(true);
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const rows = text.split('\n').filter(row => row.trim());
                const data = rows.slice(1).map(row => {
                    const columns = row.split(';').map(col => col.trim());
                    return {
                        tipoPerfil: columns[0],
                        nombreSede: columns[1],
                        direccionSede: columns[2],
                        nombreUsuario: columns[3],
                        emailUsuario: columns[4],
                        documentoUsuario: columns[5],
                        telefonoUsuario: columns[6],
                        gradoEstudiante: columns[7],
                        seccionEstudiante: columns[8],
                        asignaturaProfesor: columns[9]
                    };
                });
                setParsedData(data);
                setIsProcessing(false);
            };
            reader.readAsText(selectedFile);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-2xl flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Carga Masiva General</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6"/></button>
                </div>
                
                <div className="space-y-4 mb-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-1">
                                <DownloadIcon className="w-4 h-4"/> Formato requerido (CSV separado por punto y coma):
                            </p>
                            <code className="text-[10px] block bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-700 dark:text-slate-300">
                                Tipo_Perfil;Nombre_Sede;Direccion_Sede;Nombre_Usuario;Email_Usuario;Documento_Usuario;Telefono_Usuario;Grado_Estudiante;Seccion_Estudiante;Asignatura_Profesor
                            </code>
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative">
                        <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <UploadIcon className="w-10 h-10 mx-auto text-slate-300 mb-2"/>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{file ? file.name : 'Haz clic o arrastra tu archivo CSV aquí'}</p>
                    </div>

                    {parsedData.length > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">✓ Se detectaron {parsedData.length} registros listos para importar.</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200">Cancelar</button>
                    <button 
                        onClick={() => onSave(parsedData)} 
                        disabled={parsedData.length === 0 || isProcessing}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all"
                    >
                        Procesar Importación
                    </button>
                </div>
            </Card>
        </div>
    );
};

const CampusFormModal: React.FC<{
    onClose: () => void;
    onSave: (campus: Omit<Campus, 'id' | 'teachers' | 'students'>) => void;
    campusToEdit: Campus | null;
    admins: User[];
}> = ({ onClose, onSave, campusToEdit, admins }) => {
    const isEditing = !!campusToEdit;
    const [formData, setFormData] = useState({
        name: campusToEdit?.name || '',
        address: campusToEdit?.address || '',
        admin: campusToEdit?.admin || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                        <select name="admin" value={formData.admin} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                            <option value="">Seleccione un administrador</option>
                            {admins.map(admin => (
                                <option key={admin.id} value={admin.name}>{admin.name}</option>
                            ))}
                        </select>
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
    const { campuses, addCampus, updateCampus, deleteCampus, admins, updateAdmin, addAdmin, addTeacher, addStudent } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
    const [deletingCampus, setDeletingCampus] = useState<Campus | null>(null);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleBulkSave = async (parsedData: any[]) => {
        setIsBulkModalOpen(false);
        showNotification('Procesando carga masiva...', 'info');
        
        let successCount = 0;
        let errorCount = 0;
        
        // First pass: Create campuses
        const campusMap = new Map<string, string>(); // name -> id
        for (const campus of campuses) {
            campusMap.set(campus.name.toLowerCase(), campus.id);
        }

        for (const row of parsedData) {
            try {
                const tipo = row.tipoPerfil?.toLowerCase();
                if (tipo === 'sede') {
                    if (!campusMap.has(row.nombreSede.toLowerCase())) {
                        const id = await addCampus({
                            name: row.nombreSede,
                            address: row.direccionSede,
                            admin: row.nombreUsuario || ''
                        });
                        if (id) campusMap.set(row.nombreSede.toLowerCase(), id);
                        successCount++;
                    }
                }
            } catch (e) {
                errorCount++;
            }
        }

        // Second pass: Create users
        for (const row of parsedData) {
            try {
                const tipo = row.tipoPerfil?.toLowerCase();
                const campusId = campusMap.get(row.nombreSede?.toLowerCase());
                
                if (!campusId && tipo !== 'sede') {
                    errorCount++;
                    continue;
                }

                if (tipo === 'admin') {
                    await addAdmin({
                        name: row.nombreUsuario,
                        email: row.emailUsuario,
                        campusId: campusId,
                        campusName: row.nombreSede
                    });
                    successCount++;
                } else if (tipo === 'profesor') {
                    await addTeacher({
                        name: row.nombreUsuario,
                        email: row.emailUsuario,
                        documentNumber: row.documentoUsuario || '',
                        phone: row.telefonoUsuario || '',
                        campusId: campusId,
                        subject: row.asignaturaProfesor || ''
                    });
                    successCount++;
                } else if (tipo === 'estudiante') {
                    await addStudent({
                        name: row.nombreUsuario,
                        email: row.emailUsuario,
                        documentNumber: row.documentoUsuario || '',
                        phone: row.telefonoUsuario || '',
                        campusId: campusId,
                        class: row.gradoEstudiante || '',
                        section: row.seccionEstudiante || '',
                        status: 'active'
                    });
                    successCount++;
                }
            } catch (e) {
                errorCount++;
            }
        }

        showNotification(`Carga masiva completada. Éxitos: ${successCount}, Errores: ${errorCount}`, errorCount > 0 ? 'info' : 'success');
    };

    const handleSave = async (data: any) => {
        try {
            let campusId = editingCampus?.id;
            if (editingCampus) {
                await updateCampus(editingCampus.id, data);
                showNotification('Sede actualizada', 'success');
                
                // If admin changed, update the old admin and new admin
                if (editingCampus.admin !== data.admin) {
                    const oldAdmin = admins.find(a => a.name === editingCampus.admin);
                    if (oldAdmin) {
                        await updateAdmin(oldAdmin.id, { campusId: '', campusName: '' });
                    }
                }
            } else {
                campusId = await addCampus(data);
                showNotification('Sede creada', 'success');
            }
            
            // Update the new admin
            if (data.admin && campusId) {
                const newAdmin = admins.find(a => a.name === data.admin);
                if (newAdmin) {
                    await updateAdmin(newAdmin.id, { campusId: campusId, campusName: data.name });
                }
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

    const downloadTemplate = () => {
        const headers = [
            "Tipo_Perfil (Sede/Admin/Profesor/Estudiante)",
            "Nombre_Sede",
            "Direccion_Sede",
            "Nombre_Usuario",
            "Email_Usuario",
            "Documento_Usuario",
            "Telefono_Usuario",
            "Grado_Estudiante",
            "Seccion_Estudiante",
            "Asignatura_Profesor"
        ];
        const exampleData = [
            ["Sede", "Sede Principal", "Calle 123", "", "", "", "", "", "", ""],
            ["Admin", "Sede Principal", "", "Admin Principal", "admin@colegio.com", "12345678", "3001234567", "", "", ""],
            ["Profesor", "Sede Principal", "", "Juan Perez", "juan@colegio.com", "87654321", "3109876543", "", "", "Matemáticas"],
            ["Estudiante", "Sede Principal", "", "Maria Gomez", "maria@colegio.com", "11223344", "3201122334", "6", "A", ""]
        ];
        
        const csvContent = [
            headers.join(";"),
            ...exampleData.map(row => row.join(";"))
        ].join("\n");
        
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_cargue_colegio.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                    <div className="flex gap-3">
                        <button onClick={() => setIsBulkModalOpen(true)} className="bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-2 text-sm">
                            <UploadIcon className="w-5 h-5"/> Carga Masiva
                        </button>
                        <button onClick={downloadTemplate} className="bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-lg shadow-md shadow-emerald-500/20 hover:bg-emerald-700 hover:shadow-lg transition-all flex items-center gap-2 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Descargar Plantilla
                        </button>
                        <button onClick={openCreateModal} className="bg-primary text-white font-bold py-2.5 px-5 rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-2 text-sm">
                            <BuildingOfficeIcon className="w-5 h-5"/> Añadir Sede
                        </button>
                    </div>
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

            {isBulkModalOpen && <BulkUploadModal onClose={() => setIsBulkModalOpen(false)} onSave={handleBulkSave} />}
            {isModalOpen && <CampusFormModal onClose={() => setIsModalOpen(false)} onSave={handleSave} campusToEdit={editingCampus} admins={admins} />}
            {deletingCampus && <DeleteConfirmationModal campus={deletingCampus} onClose={() => setDeletingCampus(null)} onConfirm={handleDelete} />}
        </>
    );
};

export default CampusManagementPage;
