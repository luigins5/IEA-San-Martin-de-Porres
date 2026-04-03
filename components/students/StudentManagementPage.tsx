
import React, { useState, useEffect } from 'react';
import { Student, UserRole, Campus, User } from '../../types';
import Card from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { UploadIcon, UserAddIcon, EyeIcon, EditIcon, TrashIcon, PaperAirplaneIcon, PlusIcon, AcademicCapIcon, CloseIcon, KeyIcon, EyeSlashIcon, DownloadIcon } from '../icons';
import { useData } from '../../context/DataContext';

const ResetPasswordConfirmationModal: React.FC<{ user: User; onClose: () => void; onConfirm: () => void; }> = ({ user, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
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

const BulkUploadModal: React.FC<{
    onClose: () => void;
    onSave: (newStudents: any[]) => void;
    user: User | null;
    campuses: Campus[];
}> = ({ onClose, onSave, user, campuses }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [campusId, setCampusId] = useState(user?.role === UserRole.SUPER_ADMIN ? (campuses[0]?.id || '') : (user?.campusId || ''));

    const downloadTemplate = () => {
        const headers = "nombre,documento,correo,telefono,grado,grupo\n";
        const example = "Juan Perez,12345678,juan@ejemplo.com,3001234567,7,1\n";
        const blob = new Blob([headers + example], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_estudiantes.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                    const columns = row.split(',').map(col => col.trim());
                    return {
                        name: columns[0],
                        documentNumber: columns[1],
                        email: columns[2],
                        phone: columns[3],
                        class: columns[4],
                        section: columns[5],
                        campusId: campusId,
                        schoolPeriod: 'A',
                        schoolYear: 2025,
                        status: 'active'
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
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Carga Masiva de Estudiantes</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6"/></button>
                </div>
                
                <div className="space-y-4 mb-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-1">
                                <DownloadIcon className="w-4 h-4"/> Formato requerido (CSV):
                            </p>
                            <code className="text-[10px] block bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-700 dark:text-slate-300">
                                nombre, documento, correo, telefono, grado, grupo
                            </code>
                        </div>
                        <button 
                            onClick={downloadTemplate}
                            className="bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
                        >
                            Descargar Plantilla
                        </button>
                    </div>

                    {user?.role === UserRole.SUPER_ADMIN && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignar a Sede:</label>
                            <select value={campusId} onChange={e => setCampusId(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-white">
                                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative">
                        <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <UploadIcon className="w-10 h-10 mx-auto text-slate-300 mb-2"/>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{file ? file.name : 'Haz clic o arrastra tu archivo CSV aquí'}</p>
                    </div>

                    {parsedData.length > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">✓ Se detectaron {parsedData.length} estudiantes listos para importar.</p>
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

const StudentFormModal: React.FC<{
    onClose: () => void;
    onSave: (studentData: any) => void;
    studentToEdit: Student | null;
    campuses: Campus[];
    user: User | null;
}> = ({ onClose, onSave, studentToEdit, campuses, user }) => {
    const isEditing = !!studentToEdit;
    
    // Form State
    const [formData, setFormData] = useState({
        name: studentToEdit?.name || '',
        documentNumber: studentToEdit?.documentNumber || '',
        email: studentToEdit?.email || '',
        phone: studentToEdit?.phone || '',
        class: studentToEdit?.class || '',
        section: studentToEdit?.section || '',
        status: studentToEdit?.status || 'active',
        campusId: studentToEdit?.campusId || (user?.role === UserRole.CAMPUS_ADMIN ? (user.campusId || '') : ''),
        schoolPeriod: studentToEdit?.schoolPeriod || 'A',
        schoolYear: studentToEdit?.schoolYear || new Date().getFullYear(),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Validations
        if (name === 'name' && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(value)) return;
        if ((name === 'documentNumber' || name === 'phone') && !/^\d*$/.test(value)) return;
        if (name === 'phone' && value.length > 10) return;

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const gradeOptions = [
        { category: 'Preescolar', grades: ['Pre jardín', 'Jardín', 'Transición'] },
        { category: 'Primaria', grades: ['1ro', '2do', '3ro', '4to', '5to'] },
        { category: 'Secundaria', grades: ['6', '7', '8', '9', '10', '11'] }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">{isEditing ? 'Editar Estudiante' : 'Matricular Nuevo Estudiante'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Nombre Completo *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Documento de Identidad *</label>
                            <input type="text" name="documentNumber" value={formData.documentNumber} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Correo Electrónico *</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Teléfono Móvil</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="10 dígitos" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Grado *</label>
                            <select name="class" value={formData.class} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required>
                                <option value="">Seleccionar</option>
                                {gradeOptions.map(cat => (
                                    <optgroup key={cat.category} label={cat.category}>
                                        {cat.grades.map(g => <option key={g} value={g}>{g}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Grupo *</label>
                            <select name="section" value={formData.section} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required>
                                <option value="">Seleccionar</option>
                                {['A', 'B', 'C', '1', '2', '3'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Estado</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    {user?.role === UserRole.SUPER_ADMIN && (
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Sede</label>
                            <select name="campusId" value={formData.campusId} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required>
                                <option value="">Seleccionar Sede</option>
                                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors">
                            {isEditing ? 'Guardar Cambios' : 'Crear Estudiante'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const ViewStudentModal: React.FC<any> = ({ student, onClose }) => (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
        <Card className="w-full max-w-2xl">
             <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Detalles del Estudiante</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6"/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Nombre Completo</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{student.name}</p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Documento de Identidad</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{student.documentNumber}</p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Correo Electrónico</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{student.email}</p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Teléfono Móvil</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{student.phone || '-'}</p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Ubicación Académica</p>
                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold mt-1">
                        {student.class} - {student.section}
                    </span>
                </div>
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Sede</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{student.campusName}</p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Dirección de Residencia</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{student.address || '-'}</p>
                </div>
            </div>
            <div className="mt-6 text-right">
                <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg text-sm transition-colors">Cerrar</button>
            </div>
        </Card>
    </div>
);

const DeleteConfirmationModal: React.FC<{ student: Student; onClose: () => void; onConfirm: () => void; }> = ({ student, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Eliminar Estudiante</h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">¿Está seguro de que desea eliminar a <span className="font-bold text-gray-900 dark:text-white">{student.name}</span>? Esta acción es irreversible.</p>
            <div className="flex justify-end space-x-3">
                <button onClick={onClose} className="bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm hover:bg-gray-200 transition-colors">Cancelar</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-red-700 shadow-sm transition-colors">Eliminar</button>
            </div>
        </Card>
    </div>
);


const StudentManagementPage: React.FC = () => {
    const { students, campuses, addStudent, updateStudent, deleteStudent, assignTemporaryPassword } = useData();
    const { user, sendPasswordReset } = useAuth();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
    const [resettingPasswordStudent, setResettingPasswordStudent] = useState<Student | null>(null);
    const [assigningPassStudent, setAssigningPassStudent] = useState<Student | null>(null);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const filteredStudents = students
        .filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.documentNumber.includes(searchQuery);
            const matchesClass = filterClass ? s.class === filterClass : true;
            const matchesSection = filterSection ? s.section === filterSection : true;
            
            const matchesFilters = matchesSearch && matchesClass && matchesSection;
            
            if (user?.role === UserRole.SUPER_ADMIN) return matchesFilters;
            return matchesFilters && s.campusId === user?.campusId;
        });

    const handleSaveStudent = async (studentData: any) => {
        try {
            // Ensure campus data is present
            let finalData = { ...studentData };
            
            if (user?.role === UserRole.CAMPUS_ADMIN) {
                finalData.campusId = user.campusId;
                finalData.campusName = user.campusName;
            } else if (finalData.campusId) {
                const selectedCampus = campuses.find(c => c.id === finalData.campusId);
                if (selectedCampus) finalData.campusName = selectedCampus.name;
            }

            if (editingStudent) {
                await updateStudent(editingStudent.id, finalData);
                showNotification('Estudiante actualizado exitosamente', 'success');
            } else {
                await addStudent(finalData);
                showNotification('Estudiante creado exitosamente', 'success');
            }
            setIsModalOpen(false);
        } catch (error: any) {
            console.error(error);
            showNotification('Error al guardar estudiante', 'error');
        }
    };

    const handleDeleteStudent = async () => {
        if (deletingStudent) {
            try {
                await deleteStudent(deletingStudent.id);
                showNotification('Estudiante eliminado', 'success');
            } catch (error) {
                showNotification('Error al eliminar', 'error');
            }
            setDeletingStudent(null);
        }
    };

    const handleBulkSave = async (studentsList: any[]) => { 
        let added = 0;
        for (const stu of studentsList) {
            try {
                await addStudent(stu);
                added++;
            } catch (e) {
                console.error("Error adding bulk student", e);
            }
        }
        setIsBulkOpen(false); 
        showNotification(`Se han importado ${added} estudiantes exitosamente.`, 'success');
    };
    
    const handleSendResetLink = async () => { 
        if (resettingPasswordStudent) {
            try {
                await sendPasswordReset(resettingPasswordStudent.email);
                showNotification(`Enlace enviado a ${resettingPasswordStudent.email}`, 'success');
            } catch (e) {
                showNotification('Error al enviar enlace', 'error');
            }
            setResettingPasswordStudent(null); 
        }
    };

    const handleAssignTempPass = async (tempPass: string) => {
        if (assigningPassStudent) {
            try {
                await assignTemporaryPassword(assigningPassStudent.id, UserRole.STUDENT, tempPass);
                showNotification('Contraseña provisional asignada', 'success');
            } catch (e) {
                showNotification('Error al asignar contraseña', 'error');
            }
            setAssigningPassStudent(null);
        }
    };

    const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

    const gradeOptions = [
        { category: 'Preescolar', grades: ['Pre jardín', 'Jardín', 'Transición'] },
        { category: 'Primaria', grades: ['1ro', '2do', '3ro', '4to', '5to'] },
        { category: 'Secundaria', grades: ['6', '7', '8', '9', '10', '11'] }
    ];

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
                    
                    {/* Modern Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900">
                        <div>
                            <h2 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/20 dark:text-blue-400">
                                    <AcademicCapIcon className="w-6 h-6" />
                                </div>
                                Gestión de Estudiantes
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400 ml-11">Administración de matrículas y perfiles académicos.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-wrap">
                            <div className="relative group flex-grow">
                                <input 
                                    type="text" 
                                    placeholder="Buscar estudiante..." 
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
                            <select 
                                value={filterClass} 
                                onChange={e => setFilterClass(e.target.value)}
                                className="py-2.5 px-3 rounded-lg border border-slate-200 text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            >
                                <option value="">Todos los grados</option>
                                {gradeOptions.map(cat => (
                                    <optgroup key={cat.category} label={cat.category}>
                                        {cat.grades.map(g => <option key={g} value={g}>{g}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                            <select 
                                value={filterSection} 
                                onChange={e => setFilterSection(e.target.value)}
                                className="py-2.5 px-3 rounded-lg border border-slate-200 text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            >
                                <option value="">Todas las secciones</option>
                                {['A', 'B', 'C', '1', '2', '3'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => setIsBulkOpen(true)} className="bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm flex items-center justify-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                                <UploadIcon className="w-4 h-4"/> Masiva
                            </button>
                            <button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="bg-primary text-white font-bold py-2.5 px-5 rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm flex items-center justify-center gap-2">
                                <PlusIcon className="w-4 h-4"/> Añadir
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 font-semibold tracking-wider dark:bg-slate-800 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Nombre Completo</th>
                                    <th className="px-6 py-4">Documento</th>
                                    <th className="px-6 py-4">Grado</th>
                                    {user?.role === UserRole.SUPER_ADMIN && <th className="px-6 py-4">Sede</th>}
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map(student => (
                                        <tr key={student.id} className="bg-white hover:bg-slate-50/80 transition-colors dark:bg-slate-900 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    {student.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{student.documentNumber}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                                    {student.class} <span className="mx-1 opacity-50">|</span> {student.section}
                                                </span>
                                            </td>
                                            {user?.role === UserRole.SUPER_ADMIN && <td className="px-6 py-4 text-slate-600">{student.campusName}</td>}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${student.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${student.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                    {student.status === 'active' ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <button onClick={() => setViewingStudent(student)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-blue-600 transition-all focus:outline-none shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white" title="Ver Detalles">
                                                        <EyeIcon className="w-4 h-4"/>
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button onClick={() => setAssigningPassStudent(student)} className="p-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-all focus:outline-none shadow-sm dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40" title="Asignar Clave Provisional">
                                                            <KeyIcon className="w-4 h-4"/>
                                                        </button>
                                                    )}
                                                    <button onClick={() => setResettingPasswordStudent(student)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 transition-all focus:outline-none shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:text-emerald-400" title="Restablecer Contraseña (Email)">
                                                        <PaperAirplaneIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button onClick={() => { setEditingStudent(student); setIsModalOpen(true); }} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-amber-600 transition-all focus:outline-none shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400" title="Editar">
                                                        <EditIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button onClick={() => setDeletingStudent(student)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 transition-all focus:outline-none shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:text-rose-400" title="Eliminar">
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={user?.role === UserRole.SUPER_ADMIN ? 6 : 5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 dark:bg-slate-800">
                                                    <AcademicCapIcon className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <p>No se encontraron estudiantes.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            {isModalOpen && <StudentFormModal onClose={() => setIsModalOpen(false)} onSave={handleSaveStudent} studentToEdit={editingStudent} campuses={campuses} user={user} />}
            {isBulkOpen && <BulkUploadModal onClose={() => setIsBulkOpen(false)} onSave={handleBulkSave} user={user} campuses={campuses} />}
            {viewingStudent && <ViewStudentModal student={viewingStudent} onClose={() => setViewingStudent(null)} />}
            {deletingStudent && <DeleteConfirmationModal student={deletingStudent} onClose={() => setDeletingStudent(null)} onConfirm={handleDeleteStudent} />}
            {resettingPasswordStudent && <ResetPasswordConfirmationModal user={resettingPasswordStudent} onClose={() => setResettingPasswordStudent(null)} onConfirm={handleSendResetLink} />}
            {assigningPassStudent && <TempPasswordModal user={assigningPassStudent} onClose={() => setAssigningPassStudent(null)} onSave={handleAssignTempPass} />}
        </>
    );
};

export default StudentManagementPage;
