
import React, { useState } from 'react';
import { Campus, User, UserRole } from '../../types';
import Card from '../ui/Card';
import { BuildingOfficeIcon, EditIcon, TrashIcon, CloseIcon, ClipboardDocumentListIcon, UploadIcon, DownloadIcon, PlusIcon } from '../icons';
import { useData } from '../../context/DataContext';

const BulkUploadModal: React.FC<{
    onClose: () => void;
    onSave: (parsedData: any[]) => void;
}> = ({ onClose, onSave }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const { campuses, admins, teachers, students } = useData();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            setIsProcessing(true);
            setErrors([]);
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const rows = text.split('\n').filter(row => row.trim());
                
                // Detect separator
                const firstRow = rows[0] || '';
                let separator = ';';
                if (firstRow.includes('\t')) separator = '\t';
                else if (firstRow.includes(';') && firstRow.includes(',')) {
                    separator = firstRow.split(';').length > firstRow.split(',').length ? ';' : ',';
                }
                else if (firstRow.includes(',')) separator = ',';

                // Robust CSV parser to handle quotes
                const parseCSVRow = (row: string) => {
                    const cols = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < row.length; i++) {
                        const char = row[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === separator && !inQuotes) {
                            cols.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    cols.push(current.trim());
                    return cols.map(col => col.replace(/^"|"$/g, '').trim());
                };

                const data = rows.slice(1).map(row => {
                    const columns = parseCSVRow(row);
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
                        asignaturaProfesor: columns[9],
                        intensidadHoraria: columns[10]
                    };
                }).filter(row => row.tipoPerfil || row.nombreSede || row.nombreUsuario); // Filter out completely empty rows

                // Validation
                const newErrors: string[] = [];
                const existingEmails = new Set([
                    ...admins.map(a => a.email.toLowerCase()),
                    ...teachers.map(t => t.email.toLowerCase()),
                    ...students.map(s => s.email.toLowerCase())
                ]);
                const existingDocuments = new Set([
                    ...teachers.map(t => t.documentNumber),
                    ...students.map(s => s.documentNumber)
                ]);
                const existingCampuses = new Set(campuses.map(c => c.name.toLowerCase()));
                const campusesInFile = new Set(
                    data.filter(row => row.tipoPerfil?.toLowerCase() === 'sede' && row.nombreSede)
                        .map(row => row.nombreSede.toLowerCase())
                );

                const emailsInFile = new Map<string, string>(); // email -> tipoPerfil
                const documentsInFile = new Map<string, string>(); // document -> tipoPerfil

                data.forEach((row, index) => {
                    const rowNum = index + 2; // +1 for header, +1 for 0-index
                    const tipoPerfil = row.tipoPerfil?.toLowerCase();
                    
                    if (!tipoPerfil || !['sede', 'admin', 'profesor', 'estudiante'].includes(tipoPerfil)) {
                        newErrors.push(`Fila ${rowNum}: Tipo de perfil inválido (${row.tipoPerfil}).`);
                    }
                    if (!row.nombreSede) {
                        newErrors.push(`Fila ${rowNum}: Nombre de sede es requerido.`);
                    } else if (tipoPerfil !== 'sede') {
                        // If it's not a campus, the campus must exist in DB or be created in this file
                        const campusName = row.nombreSede.toLowerCase();
                        if (!existingCampuses.has(campusName) && !campusesInFile.has(campusName)) {
                            newErrors.push(`Fila ${rowNum}: La sede "${row.nombreSede}" no existe en el sistema y no se está creando en este archivo.`);
                        }
                    }

                    if (tipoPerfil && tipoPerfil !== 'sede') {
                        if (!row.nombreUsuario) newErrors.push(`Fila ${rowNum}: Nombre de usuario es requerido.`);
                        if (!row.emailUsuario) newErrors.push(`Fila ${rowNum}: Email es requerido.`);
                        
                        if (row.emailUsuario) {
                            const email = row.emailUsuario.toLowerCase();
                            // If it exists in DB, it's an error unless we are updating (not supported in bulk upload yet)
                            if (existingEmails.has(email)) {
                                newErrors.push(`Fila ${rowNum}: El email ${row.emailUsuario} ya existe en el sistema.`);
                            }
                            
                            // If it exists in the file, it's an error UNLESS both are 'profesor'
                            if (emailsInFile.has(email)) {
                                const existingTipo = emailsInFile.get(email);
                                if (!(existingTipo === 'profesor' && tipoPerfil === 'profesor')) {
                                    newErrors.push(`Fila ${rowNum}: El email ${row.emailUsuario} está duplicado en el archivo.`);
                                }
                            } else {
                                emailsInFile.set(email, tipoPerfil);
                            }
                        }

                        if (['profesor', 'estudiante'].includes(tipoPerfil)) {
                            if (!row.documentoUsuario) newErrors.push(`Fila ${rowNum}: Documento es requerido para profesores y estudiantes.`);
                            if (row.documentoUsuario) {
                                const doc = row.documentoUsuario;
                                if (existingDocuments.has(doc)) {
                                    newErrors.push(`Fila ${rowNum}: El documento ${doc} ya existe en el sistema.`);
                                }
                                
                                if (documentsInFile.has(doc)) {
                                    const existingTipo = documentsInFile.get(doc);
                                    if (!(existingTipo === 'profesor' && tipoPerfil === 'profesor')) {
                                        newErrors.push(`Fila ${rowNum}: El documento ${doc} está duplicado en el archivo.`);
                                    }
                                } else {
                                    documentsInFile.set(doc, tipoPerfil);
                                }
                            }
                        }
                    }
                });

                if (newErrors.length > 0) {
                    setErrors(newErrors);
                    setParsedData([]); // Don't allow saving if there are errors
                } else {
                    // Combine subjects for duplicate teachers
                    const combinedData: any[] = [];
                    const teacherMap = new Map<string, any>(); // email -> teacher data

                    data.forEach(row => {
                        const tipoPerfil = row.tipoPerfil?.toLowerCase();
                        if (tipoPerfil === 'profesor' && row.emailUsuario) {
                            const email = row.emailUsuario.toLowerCase();
                            if (teacherMap.has(email)) {
                                const existingTeacher = teacherMap.get(email);
                                if (row.asignaturaProfesor) {
                                    const subjects = existingTeacher.asignaturaProfesor ? existingTeacher.asignaturaProfesor.split(',').map((s: string) => s.trim()) : [];
                                    if (!subjects.includes(row.asignaturaProfesor.trim())) {
                                        subjects.push(row.asignaturaProfesor.trim());
                                        existingTeacher.asignaturaProfesor = subjects.join(', ');
                                    }
                                    if (!existingTeacher.assignments) existingTeacher.assignments = [];
                                    existingTeacher.assignments.push({
                                        subject: row.asignaturaProfesor,
                                        class: row.gradoEstudiante,
                                        section: row.seccionEstudiante,
                                        intensidadHoraria: row.intensidadHoraria ? parseInt(row.intensidadHoraria) : undefined
                                    });
                                }
                            } else {
                                const newTeacher = { ...row };
                                if (row.asignaturaProfesor) {
                                    newTeacher.assignments = [{
                                        subject: row.asignaturaProfesor,
                                        class: row.gradoEstudiante,
                                        section: row.seccionEstudiante,
                                        intensidadHoraria: row.intensidadHoraria ? parseInt(row.intensidadHoraria) : undefined
                                    }];
                                }
                                teacherMap.set(email, newTeacher);
                                combinedData.push(teacherMap.get(email));
                            }
                        } else {
                            combinedData.push(row);
                        }
                    });

                    setParsedData(combinedData);
                }
                setIsProcessing(false);
            };
            reader.readAsText(selectedFile, 'UTF-8');
        }
    };

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
            "Asignatura_Profesor",
            "Intensidad_horaria"
        ];
        const exampleData = [
            ["Sede", "Sede Principal", "Calle 123", "", "", "", "", "", "", "", ""],
            ["Admin", "Sede Principal", "", "Admin Principal", "admin@colegio.com", "12345678", "3001234567", "", "", "", ""],
            ["Profesor", "Sede Principal", "", "Juan Perez", "juan@colegio.com", "87654321", "3109876543", "TERCERO", "", "Matemáticas", "4"],
            ["Estudiante", "Sede Principal", "", "Maria Gomez", "maria@colegio.com", "11223344", "3201122334", "6", "A", "", ""]
        ];
        
        const csvContent = [
            headers.join(";"),
            ...exampleData.map(row => row.join(";"))
        ].join("\n");
        
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_cargue_colegio.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-3xl flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Carga Masiva General</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6"/></button>
                </div>
                
                <div className="space-y-4 mb-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                        <div className="flex-1 mr-4">
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                                <DownloadIcon className="w-4 h-4"/> Formato requerido (CSV separado por punto y coma):
                            </p>
                            <code className="text-xs block bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-slate-700 dark:text-slate-300 overflow-x-auto whitespace-nowrap">
                                Tipo_Perfil;Nombre_Sede;Direccion_Sede;Nombre_Usuario;Email_Usuario;Documento_Usuario;Telefono_Usuario;Grado_Estudiante;Seccion_Estudiante;Asignatura_Profesor;Intensidad_horaria
                            </code>
                        </div>
                        <button 
                            onClick={downloadTemplate}
                            className="bg-white text-blue-600 px-4 py-3 rounded-lg text-sm font-bold border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap flex items-center gap-2"
                        >
                            <DownloadIcon className="w-4 h-4"/>
                            Descargar Plantilla
                        </button>
                    </div>

                    <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 dark:bg-slate-800/50 dark:border-slate-700 rounded-2xl p-10 text-center hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors relative">
                        <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <UploadIcon className="w-12 h-12 mx-auto text-blue-400 mb-3"/>
                        <p className="text-base font-medium text-slate-600 dark:text-slate-400">{file ? file.name : 'Haz clic o arrastra tu archivo CSV aquí'}</p>
                    </div>

                    {errors.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 max-h-40 overflow-y-auto">
                            <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">Se encontraron errores en el archivo:</p>
                            <ul className="list-disc pl-5 text-xs text-red-600 dark:text-red-300 space-y-1">
                                {errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {parsedData.length > 0 && errors.length === 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                Se detectaron {parsedData.length} registros listos para importar.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                    <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                    <button 
                        onClick={() => onSave(parsedData)} 
                        disabled={parsedData.length === 0 || isProcessing || errors.length > 0}
                        className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all"
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

const BulkDeleteConfirmationModal: React.FC<{ count: number; onClose: () => void; onConfirm: () => void; }> = ({ count, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Eliminar Sedes</h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">¿Está seguro de que desea eliminar <span className="font-bold text-gray-900 dark:text-white">{count}</span> sedes seleccionadas? Esta acción es irreversible.</p>
            <div className="flex justify-end space-x-3">
                <button onClick={onClose} className="bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm hover:bg-gray-200 transition-colors">Cancelar</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-red-700 shadow-sm transition-colors">Eliminar</button>
            </div>
        </Card>
    </div>
);

const CampusManagementPage: React.FC = () => {
    const { campuses, addCampus, updateCampus, deleteCampus, admins, updateAdmin, addAdmin, addTeacher, addStudent, addAssignment } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
    const [deletingCampus, setDeletingCampus] = useState<Campus | null>(null);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleSelectCampus = (id: string) => {
        setSelectedCampuses(prev => 
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        try {
            for (const id of selectedCampuses) {
                await deleteCampus(id);
            }
            showNotification(`Se eliminaron ${selectedCampuses.length} sedes`, 'success');
            setSelectedCampuses([]);
            setIsBulkDeleting(false);
        } catch (error) {
            showNotification('Error al eliminar sedes', 'error');
        }
    };

    const handleBulkSave = async (parsedData: any[]) => {
        setIsBulkModalOpen(false);
        showNotification('Procesando carga masiva...', 'info');
        
        let successCount = 0;
        let errorCount = 0;
        
        // First pass: Create campuses
        const campusMap = new Map<string, string>(); // name -> id
        const campusNameMap = new Map<string, string>(); // id -> actual name
        for (const campus of campuses) {
            campusMap.set(campus.name.toLowerCase(), campus.id);
            campusNameMap.set(campus.id, campus.name);
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
                        if (id) {
                            campusMap.set(row.nombreSede.toLowerCase(), id);
                            campusNameMap.set(id, row.nombreSede);
                        }
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
                const actualCampusName = campusId ? campusNameMap.get(campusId) : row.nombreSede;
                
                if (!campusId && tipo !== 'sede') {
                    errorCount++;
                    continue;
                }

                if (tipo === 'admin') {
                    await addAdmin({
                        name: row.nombreUsuario,
                        email: row.emailUsuario,
                        campusId: campusId,
                        campusName: actualCampusName
                    });
                    successCount++;
                } else if (tipo === 'profesor') {
                    const teacherId = await addTeacher({
                        name: row.nombreUsuario,
                        email: row.emailUsuario,
                        documentNumber: row.documentoUsuario || '',
                        phone: row.telefonoUsuario || '',
                        campusId: campusId,
                        campusName: actualCampusName,
                        subject: row.asignaturaProfesor || ''
                    });
                    
                    if (teacherId && row.assignments && row.assignments.length > 0) {
                        for (const assignment of row.assignments) {
                            if (assignment.subject && assignment.class && assignment.section) {
                                await addAssignment({
                                    teacherId: teacherId,
                                    subject: assignment.subject,
                                    class: assignment.class,
                                    section: assignment.section,
                                    intensidadHoraria: assignment.intensidadHoraria
                                });
                            }
                        }
                    }
                    successCount++;
                } else if (tipo === 'estudiante') {
                    await addStudent({
                        name: row.nombreUsuario,
                        email: row.emailUsuario,
                        documentNumber: row.documentoUsuario || '',
                        phone: row.telefonoUsuario || '',
                        campusId: campusId,
                        campusName: actualCampusName,
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
                        {selectedCampuses.length > 0 && (
                            <button onClick={() => setIsBulkDeleting(true)} className="bg-red-50 border border-red-200 text-red-600 font-semibold py-2.5 px-4 rounded-lg hover:bg-red-100 transition-all text-sm flex items-center justify-center gap-2 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40">
                                <TrashIcon className="w-4 h-4"/> Eliminar ({selectedCampuses.length})
                            </button>
                        )}
                        <button onClick={() => setIsBulkModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm flex items-center justify-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                            <UploadIcon className="w-4 h-4"/> Masiva
                        </button>
                        <button onClick={openCreateModal} className="bg-primary text-white font-bold py-2.5 px-5 rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm flex items-center justify-center gap-2">
                            <PlusIcon className="w-4 h-4"/> Añadir Sede
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campuses.map(campus => (
                        <div key={campus.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow duration-300 relative">
                            <div className="absolute top-4 right-4 z-10">
                                <input type="checkbox" className="rounded text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                                    checked={selectedCampuses.includes(campus.id)}
                                    onChange={() => handleSelectCampus(campus.id)}
                                />
                            </div>
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
            {isBulkDeleting && <BulkDeleteConfirmationModal count={selectedCampuses.length} onClose={() => setIsBulkDeleting(false)} onConfirm={handleBulkDelete} />}
        </>
    );
};

export default CampusManagementPage;
