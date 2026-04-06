
import React, { useState, useEffect } from 'react';
import { Communication, UserRole, SchoolEvent } from '../../types';
import Card from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { MegaphoneIcon, DocumentTextIcon, PdfIcon, WordIcon, TrashIcon, DownloadIcon, CalendarIcon, PlusIcon, CloseIcon, UploadIcon, EditIcon } from '../icons';
import { useData } from '../../context/DataContext';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const iconForFileType = (type: string) => {
    const className = "w-10 h-10 flex-shrink-0";
    if (type.includes('pdf')) return <PdfIcon className={`${className} text-rose-500`} />;
    if (type.includes('word')) return <WordIcon className={`${className} text-blue-600`} />;
    if (type.includes('image')) return <img src="/placeholder-image-icon.png" className={`${className} object-cover rounded`} alt="" onError={(e) => {(e.target as HTMLImageElement).style.display='none'}} />; // Fallback or use a generic image icon if no preview available in list
    return <DocumentTextIcon className={`${className} text-slate-400`} />;
};

// --- MODALS ---

const CommunicationFormModal: React.FC<{
    onClose: () => void;
    onSave: (comm: Omit<Communication, 'id' | 'date'>) => void;
    communicationToEdit: Communication | null;
    userCampusId?: string;
}> = ({ onClose, onSave, communicationToEdit, userCampusId }) => {
    const { user } = useAuth();
    const { campuses } = useData();
    const isEditing = !!communicationToEdit;
    
    const [title, setTitle] = useState(communicationToEdit?.title || '');
    const [description, setDescription] = useState(communicationToEdit?.description || '');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [campusId, setCampusId] = useState<string>(communicationToEdit?.campusId || (user?.role === UserRole.SUPER_ADMIN ? 'all' : userCampusId || 'all'));
    const [targetRoles, setTargetRoles] = useState<UserRole[]>(communicationToEdit?.targetRoles || (user?.role === UserRole.TEACHER ? [UserRole.STUDENT, UserRole.PARENT] : [UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]));
    const [error, setError] = useState('');

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (isEditing && communicationToEdit?.fileType?.startsWith('image/')) {
            setPreviewUrl(communicationToEdit.fileUrl);
        } else {
            setPreviewUrl(null);
        }
    }, [file, communicationToEdit]);

    const handleRoleChange = (role: UserRole) => {
        setTargetRoles(prev => 
            prev.includes(role) 
                ? prev.filter(r => r !== role) 
                : [...prev, role]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title) {
            setError('El título es obligatorio.');
            return;
        }
        
        // If editing and no new file selected, preserve the old one (logic handled in onSave partially or here)
        if (!isEditing && !file) {
             setError('Debes adjuntar un documento o imagen.');
             return;
        }

        try {
            let fileUrl = communicationToEdit?.fileUrl || '';
            let fileName = communicationToEdit?.fileName || '';
            let fileType = communicationToEdit?.fileType || '';

            if (file) {
                fileUrl = await fileToBase64(file);
                fileName = file.name;
                fileType = file.type;
            }

            const selectedCampus = campuses.find(c => c.id === campusId);
            
            onSave({
                title,
                description,
                fileName,
                fileType,
                fileUrl,
                campusId: campusId === 'all' ? undefined : campusId,
                campusName: campusId === 'all' ? undefined : selectedCampus?.name,
                targetRoles,
            });
            onClose();
        } catch (err) {
            setError('Error al procesar.');
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-slate-700">
                    <h2 className="text-xl font-bold dark:text-white">{isEditing ? 'Editar Comunicado' : 'Nuevo Comunicado'}</h2>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5 text-sm">
                    {error && <p className="text-rose-500 text-xs font-semibold bg-rose-50 p-2 rounded">{error}</p>}
                    
                    <div>
                        <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Título</label>
                        <input type="text" placeholder="Ej: Circular Informativa..." value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700" required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Descripción</label>
                        <textarea placeholder="Breve resumen del contenido..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700" rows={3}></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Adjuntar Documento o Imagen {isEditing && '(Opcional)'}</label>
                        <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors dark:border-slate-600 dark:hover:bg-slate-800">
                            <input 
                                type="file" 
                                onChange={e => setFile(e.target.files?.[0] || null)} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                required={!isEditing}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                            />
                            <div className="pointer-events-none">
                                <UploadIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {file ? file.name : (isEditing && communicationToEdit?.fileName ? `Actual: ${communicationToEdit.fileName}` : 'Haz clic para subir documento o imagen')}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2">Formatos: PDF, Word, Excel, Imágenes (JPG, PNG)</p>
                            </div>
                        </div>
                        {previewUrl && (file?.type.startsWith('image/') || (isEditing && communicationToEdit?.fileType?.startsWith('image/'))) && (
                            <div className="mt-3 relative w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 dark:bg-slate-800 dark:border-slate-700 group">
                                <img 
                                    src={previewUrl} 
                                    alt="Vista previa" 
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                    Vista Previa
                                </div>
                            </div>
                        )}
                    </div>

                    {user?.role === UserRole.SUPER_ADMIN && (
                        <div>
                            <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Sede Destino</label>
                            <select value={campusId} onChange={e => setCampusId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700">
                                <option value="all">Todas las Sedes</option>
                                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold mb-2 dark:text-slate-300">Visible para:</label>
                        <div className="flex flex-wrap gap-3">
                            {[UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]
                                .filter(role => user?.role !== UserRole.TEACHER || role !== UserRole.TEACHER)
                                .map(role => (
                                <label key={role} className={`flex items-center space-x-2 cursor-pointer px-3 py-2 rounded-lg border transition-all ${targetRoles.includes(role) ? 'bg-primary/10 border-primary text-primary font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700'}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={targetRoles.includes(role)} 
                                        onChange={() => handleRoleChange(role)}
                                        className="sr-only"
                                    />
                                    <span className="text-xs">{role}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700">Cancelar</button>
                        <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all text-sm">
                            {isEditing ? 'Guardar Cambios' : 'Publicar'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const EventFormModal: React.FC<{
    onClose: () => void;
    onSave: (event: Omit<SchoolEvent, 'id'>) => void;
    eventToEdit: SchoolEvent | null;
    userCampusId?: string;
}> = ({ onClose, onSave, eventToEdit, userCampusId }) => {
    const { user } = useAuth();
    const { campuses } = useData();
    const isEditing = !!eventToEdit;
    
    const [title, setTitle] = useState(eventToEdit?.title || '');
    const [date, setDate] = useState(eventToEdit?.date || '');
    const [description, setDescription] = useState(eventToEdit?.description || '');
    const [campusId, setCampusId] = useState<string>(eventToEdit?.campusId || (user?.role === UserRole.SUPER_ADMIN ? 'all' : userCampusId || ''));
    
    // File states
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (isEditing && eventToEdit?.fileType?.startsWith('image/')) {
            setPreviewUrl(eventToEdit.fileUrl || null);
        } else {
            setPreviewUrl(null);
        }
    }, [file, eventToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let fileUrl = eventToEdit?.fileUrl || undefined;
        let fileName = eventToEdit?.fileName || undefined;
        let fileType = eventToEdit?.fileType || undefined;

        if (file) {
            try {
                fileUrl = await fileToBase64(file);
                fileName = file.name;
                fileType = file.type;
            } catch (err) {
                console.error("Error converting file", err);
                return;
            }
        }

        onSave({
            title,
            date,
            description,
            campusId: campusId === 'all' ? undefined : campusId,
            fileName,
            fileType,
            fileUrl
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-slate-700">
                    <h2 className="text-xl font-bold dark:text-white">{isEditing ? 'Editar Evento' : 'Programar Evento'}</h2>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5 text-sm">
                    <div>
                        <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Nombre del Evento</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Fecha</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Descripción (Opcional)</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700" rows={3}></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Adjuntar Documento o Imagen (Opcional)</label>
                        <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors dark:border-slate-600 dark:hover:bg-slate-800">
                            <input 
                                type="file" 
                                onChange={e => setFile(e.target.files?.[0] || null)} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                            />
                            <div className="pointer-events-none">
                                <UploadIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {file ? file.name : (isEditing && eventToEdit?.fileName ? `Actual: ${eventToEdit.fileName}` : 'Haz clic para subir documento o imagen')}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2">Formatos: PDF, Word, Excel, Imágenes (JPG, PNG)</p>
                            </div>
                        </div>
                        {previewUrl && (file?.type.startsWith('image/') || (isEditing && eventToEdit?.fileType?.startsWith('image/'))) && (
                            <div className="mt-3 relative w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 dark:bg-slate-800 dark:border-slate-700 group">
                                <img 
                                    src={previewUrl} 
                                    alt="Vista previa" 
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                    Vista Previa
                                </div>
                            </div>
                        )}
                    </div>

                    {user?.role === UserRole.SUPER_ADMIN && (
                        <div>
                            <label className="block text-sm font-bold mb-1.5 dark:text-slate-300">Sede</label>
                            <select value={campusId} onChange={e => setCampusId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700">
                                <option value="all">Todas las Sedes</option>
                                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700">Cancelar</button>
                        <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all text-sm">
                            {isEditing ? 'Guardar Cambios' : 'Guardar Evento'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const CommunicationsPage: React.FC = () => {
    const { user } = useAuth();
    const { communications, events, admins, teachers, students, campuses, addCommunication, updateCommunication, deleteCommunication, addEvent, updateEvent, deleteEvent } = useData();
    const [activeTab, setActiveTab] = useState<'communications' | 'events'>('communications');
    
    // Get the correct campusId for the current user
    const userCampusId = React.useMemo(() => {
        if (!user) return undefined;
        if (user.campusId) return user.campusId;
        
        if (user.role === UserRole.CAMPUS_ADMIN || user.role === UserRole.SUPER_ADMIN) {
            return admins.find(a => a.email === user.email)?.campusId;
        } else if (user.role === UserRole.TEACHER) {
            return teachers.find(t => t.email === user.email)?.campusId;
        } else if (user.role === UserRole.STUDENT || user.role === UserRole.PARENT) {
            return students.find(s => s.email === user.email)?.campusId;
        }
        return undefined;
    }, [user, admins, teachers, students]);
    
    // Modal states
    const [isCommModalOpen, setIsCommModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    
    const [editingComm, setEditingComm] = useState<Communication | null>(null);
    const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);

    // Helpers for data handling
    const handleSaveComm = async (commData: Omit<Communication, 'id' | 'date'>) => {
        try { 
            if (editingComm) {
                await updateCommunication(editingComm.id, commData);
            } else {
                await addCommunication(commData); 
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteComm = async (id: string) => {
        if (window.confirm("¿Eliminar este comunicado?")) {
            try { await deleteCommunication(id); } catch (e) { console.error(e); }
        }
    };

    const handleSaveEvent = async (eventData: Omit<SchoolEvent, 'id'>) => {
        try { 
            if (editingEvent) {
                await updateEvent(editingEvent.id, eventData);
            } else {
                await addEvent(eventData); 
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteEvent = async (id: string) => {
        if (window.confirm("¿Eliminar este evento?")) {
            try { await deleteEvent(id); } catch (e) { console.error(e); }
        }
    };

    const openEditComm = (comm: Communication) => {
        setEditingComm(comm);
        setIsCommModalOpen(true);
    };

    const openEditEvent = (evt: SchoolEvent) => {
        setEditingEvent(evt);
        setIsEventModalOpen(true);
    };

    const openNewComm = () => {
        setEditingComm(null);
        setIsCommModalOpen(true);
    };

    const openNewEvent = () => {
        setEditingEvent(null);
        setIsEventModalOpen(true);
    };

    // Filter Data
    const communicationsForView = communications.filter(comm => {
        if (!user) return false;
        const campusMatch = user.role === UserRole.SUPER_ADMIN || comm.campusId === userCampusId || !comm.campusId;
        if (!campusMatch) return false;
        
        // If user is not super admin or campus admin, check if their role is in targetRoles
        if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CAMPUS_ADMIN) {
            // If the communication was created by this teacher, they can see it
            if (user.role === UserRole.TEACHER && comm.authorId === user.id) return true;
            
            // Otherwise, check if their role is in the target roles
            if (comm.targetRoles && !comm.targetRoles.includes(user.role)) {
                return false;
            }
        }
        
        return true; 
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const eventsForView = events.filter(evt => {
        if (!user) return false;
        return user.role === UserRole.SUPER_ADMIN || evt.campusId === userCampusId || !evt.campusId;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const getDaysRemaining = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diff = eventDate.getTime() - today.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        if (days < 0) return 'Finalizado';
        if (days === 0) return 'Hoy';
        if (days === 1) return 'Mañana';
        return `En ${days} días`;
    };

    // Permissions to edit/delete
    const canManage = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.CAMPUS_ADMIN || user?.role === UserRole.TEACHER;

    return (
        <div className="space-y-8 pb-10">
            {/* Header Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm sticky top-0 z-10 backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
                <div className="flex space-x-1 p-1 w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('communications')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'communications' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <MegaphoneIcon className="w-5 h-5" />
                        Comunicados
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'events' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <CalendarIcon className="w-5 h-5" />
                        Agenda Escolar
                    </button>
                </div>
                
                <div className="px-2 w-full sm:w-auto">
                    {activeTab === 'communications' ? (
                        <button onClick={openNewComm} className="w-full sm:w-auto bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-slate-700 transition-all shadow-lg flex items-center justify-center gap-2 text-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                            <PlusIcon className="w-4 h-4"/> Nuevo Comunicado
                        </button>
                    ) : (
                        <button onClick={openNewEvent} className="w-full sm:w-auto bg-indigo-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                            <PlusIcon className="w-4 h-4"/> Agendar Evento
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="animate-fade-in-up">
                {activeTab === 'communications' ? (
                    <div className="space-y-4">
                        {communicationsForView.length > 0 ? (
                            communicationsForView.map(comm => (
                                <div key={comm.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all duration-300">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:scale-105 transition-transform overflow-hidden relative">
                                        {comm.fileType.startsWith('image/') ? (
                                            <img src={comm.fileUrl} alt="preview" className="w-10 h-10 object-cover" />
                                        ) : (
                                            iconForFileType(comm.fileType)
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{comm.title}</h3>
                                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full w-fit">
                                                {new Date(comm.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed max-w-2xl">{comm.description}</p>
                                        
                                        <div className="flex flex-wrap items-center gap-3">
                                            {user?.role === UserRole.SUPER_ADMIN && (
                                                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                                    {comm.campusName || 'Todas las Sedes'}
                                                </span>
                                            )}
                                            {comm.targetRoles?.map(role => (
                                                <span key={role} className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30">
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6 justify-end sm:justify-start">
                                        <a href={comm.fileUrl} download={comm.fileName} className="flex-1 sm:flex-none text-center px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors text-sm dark:bg-primary/20 dark:text-sky-300 dark:hover:bg-primary dark:hover:text-white">
                                            Descargar
                                        </a>
                                        {canManage && (
                                            <>
                                            <button onClick={() => openEditComm(comm)} className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors dark:hover:bg-amber-900/20">
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteComm(comm.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:hover:bg-rose-900/20">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <MegaphoneIcon className="w-16 h-16 mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Sin Comunicados</h3>
                                <p className="text-slate-400 text-sm">No hay publicaciones recientes para mostrar.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {eventsForView.length > 0 ? (
                            eventsForView.map(event => {
                                const daysText = getDaysRemaining(event.date);
                                const isPast = daysText === 'Finalizado';
                                const [year, month, day] = event.date.split('-').map(Number);
                                const eventDate = new Date(year, month - 1, day);
                                
                                return (
                                    <div key={event.id} className={`group bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full ${isPast ? 'opacity-60 grayscale' : ''}`}>
                                        <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-xs font-bold text-white shadow-sm ${
                                            daysText === 'Hoy' ? 'bg-rose-500' : 
                                            daysText === 'Mañana' ? 'bg-amber-500' : 
                                            isPast ? 'bg-slate-400' : 'bg-indigo-500'
                                        }`}>
                                            {daysText}
                                        </div>

                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 overflow-hidden relative">
                                                {event.fileType?.startsWith('image/') && event.fileUrl ? (
                                                    <img src={event.fileUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                                                ) : null}
                                                <span className="text-[10px] font-bold uppercase tracking-widest leading-none relative z-10">{eventDate.toLocaleString('es-ES', { month: 'short' }).replace('.','')}</span>
                                                <span className="text-2xl font-bold leading-none mt-0.5 relative z-10">{eventDate.getDate()}</span>
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight line-clamp-2">{event.title}</h3>
                                                {user?.role === UserRole.SUPER_ADMIN && (
                                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                                        {event.campusId ? 'Sede Específica' : 'Todas las Sedes'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <p className="text-sm text-slate-500 dark:text-slate-400 flex-grow mb-4 leading-relaxed line-clamp-3">
                                            {event.description || "Sin descripción adicional."}
                                        </p>

                                        <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center gap-2">
                                            {event.fileUrl ? (
                                                <a 
                                                    href={event.fileUrl} 
                                                    download={event.fileName || 'archivo'}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                                                >
                                                    <DownloadIcon className="w-3.5 h-3.5" /> Adjunto
                                                </a>
                                            ) : <div></div>}

                                            {canManage && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => openEditEvent(event)}
                                                        className="text-xs font-bold text-amber-500 hover:text-amber-700 hover:bg-amber-50 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                        title="Editar"
                                                    >
                                                        <EditIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteEvent(event.id)}
                                                        className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                        title="Eliminar"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <CalendarIcon className="w-16 h-16 mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Agenda Vacía</h3>
                                <p className="text-slate-400 text-sm">No hay eventos programados próximamente.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isCommModalOpen && <CommunicationFormModal onClose={() => setIsCommModalOpen(false)} onSave={handleSaveComm} communicationToEdit={editingComm} userCampusId={userCampusId} />}
            {isEventModalOpen && <EventFormModal onClose={() => setIsEventModalOpen(false)} onSave={handleSaveEvent} eventToEdit={editingEvent} userCampusId={userCampusId} />}
        </div>
    );
};

export default CommunicationsPage;
