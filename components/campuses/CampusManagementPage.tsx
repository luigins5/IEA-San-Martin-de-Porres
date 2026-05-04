
import React, { useState, useMemo, useEffect } from 'react';
import { Campus, User, UserRole } from '../../types';
import Card from '../ui/Card';
import { BuildingOfficeIcon, EditIcon, TrashIcon, CloseIcon, ClipboardDocumentListIcon, UploadIcon, DownloadIcon, PlusIcon } from '../icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import EmergencyNukeButton from './EmergencyNukeButton';

const UsersIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const ViewProfilesModal: React.FC<{ 
    campus: Campus; 
    onClose: () => void; 
    admins: User[];
    teachers: User[];
    students: User[];
    onImpersonate: (user: User) => void;
}> = ({ campus, onClose, admins, teachers, students, onImpersonate }) => {
    
    const campusAdmins = admins.filter(a => a.name === campus.admin || a.campusId === campus.id); 
    const campusTeachers = teachers.filter(t => t.campusId === campus.id);
    const campusStudents = students.filter(s => s.campusId === campus.id);

    const renderUserList = (title: string, list: User[]) => (
        <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider">{title} ({list.length})</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {list.length === 0 ? <p className="text-xs text-slate-500 italic">No hay usuarios en esta categoría.</p> : null}
                {list.map(u => (
                    <div key={u.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors dark:bg-slate-800 dark:border-slate-700">
                        <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <button onClick={() => onImpersonate(u)} className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors shadow-sm dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50">
                            Ingresar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <UsersIcon className="w-6 h-6 text-primary"/>
                        Perfiles - {campus.name}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-6 h-6"/></button>
                </div>
                <div className="overflow-y-auto flex-1 pb-4">
                    {renderUserList('Administradores de Sede', campusAdmins)}
                    {renderUserList('Profesores', campusTeachers)}
                    {renderUserList('Estudiantes', campusStudents)}
                </div>
            </Card>
        </div>
    );
};

const BulkUploadModal: React.FC<{
    onClose: () => void;
    onSave: (parsedData: any[]) => void;
}> = ({ onClose, onSave }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const { campuses, admins, teachers, students } = useData();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            setIsProcessing(true);
            setErrors([]);
            setWarnings([]);
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
                const skippedWarnings: string[] = [];
                const validData: any[] = [];
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
                    let hasError = false;
                    let isDuplicate = false;
                    
                    if (!tipoPerfil || !['sede', 'admin', 'profesor', 'estudiante'].includes(tipoPerfil)) {
                        newErrors.push(`Fila ${rowNum}: Tipo de perfil inválido (${row.tipoPerfil}).`);
                        hasError = true;
                    }
                    if (!row.nombreSede) {
                        newErrors.push(`Fila ${rowNum}: Nombre de sede es requerido.`);
                        hasError = true;
                    } else if (tipoPerfil !== 'sede') {
                        // If it's not a campus, the campus must exist in DB or be created in this file
                        const campusName = row.nombreSede.toLowerCase();
                        if (!existingCampuses.has(campusName) && !campusesInFile.has(campusName)) {
                            newErrors.push(`Fila ${rowNum}: La sede "${row.nombreSede}" no existe en el sistema y no se está creando en este archivo.`);
                            hasError = true;
                        }
                    }

                    if (tipoPerfil && tipoPerfil !== 'sede') {
                        if (!row.nombreUsuario) { newErrors.push(`Fila ${rowNum}: Nombre de usuario es requerido.`); hasError = true; }
                        if (!row.emailUsuario && tipoPerfil !== 'estudiante') { newErrors.push(`Fila ${rowNum}: Email es requerido.`); hasError = true; }
                        
                        if (row.emailUsuario) {
                            const email = row.emailUsuario.toLowerCase();
                            // If it exists in DB, it's an error unless we are updating (not supported in bulk upload yet)
                            if (existingEmails.has(email)) {
                                if (tipoPerfil !== 'admin') {
                                    skippedWarnings.push(`Fila ${rowNum}: El email ${row.emailUsuario} ya existe en el sistema (Omitido).`);
                                    isDuplicate = true;
                                }
                            }
                            
                            // If it exists in the file, it's an error UNLESS both are 'profesor' or both are 'admin'
                            if (!isDuplicate) {
                                if (emailsInFile.has(email)) {
                                    const existingTipo = emailsInFile.get(email);
                                    if (!((existingTipo === 'profesor' && tipoPerfil === 'profesor') || (existingTipo === 'admin' && tipoPerfil === 'admin'))) {
                                        newErrors.push(`Fila ${rowNum}: El email ${row.emailUsuario} está duplicado en el archivo.`);
                                        hasError = true;
                                    }
                                } else {
                                    emailsInFile.set(email, tipoPerfil);
                                }
                            }
                        }

                        if (['profesor', 'estudiante'].includes(tipoPerfil)) {
                            if (!row.documentoUsuario) { newErrors.push(`Fila ${rowNum}: Documento es requerido para profesores y estudiantes.`); hasError = true; }
                            if (row.documentoUsuario) {
                                const doc = row.documentoUsuario;
                                if (existingDocuments.has(doc)) {
                                    skippedWarnings.push(`Fila ${rowNum}: El documento ${doc} ya existe en el sistema (Omitido).`);
                                    isDuplicate = true;
                                }
                                
                                if (!isDuplicate) {
                                    if (documentsInFile.has(doc)) {
                                        const existingTipo = documentsInFile.get(doc);
                                        if (!(existingTipo === 'profesor' && tipoPerfil === 'profesor')) {
                                            newErrors.push(`Fila ${rowNum}: El documento ${doc} está duplicado en el archivo.`);
                                            hasError = true;
                                        }
                                    } else {
                                        documentsInFile.set(doc, tipoPerfil);
                                    }
                                }
                            }
                        }
                    }

                    if (!hasError && !isDuplicate) {
                        validData.push(row);
                    }
                });

                if (newErrors.length > 0) {
                    setErrors(newErrors);
                    setWarnings([]);
                    setParsedData([]); // Don't allow saving if there are errors
                } else {
                    setErrors([]);
                    setWarnings(skippedWarnings);
                    
                    // Combine subjects for duplicate teachers
                    const combinedData: any[] = [];
                    const teacherMap = new Map<string, any>(); // email -> teacher data

                    validData.forEach(row => {
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
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 w-full overflow-hidden">
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                                <DownloadIcon className="w-4 h-4"/> Formato requerido (CSV separado por punto y coma):
                            </p>
                            <code className="text-xs block bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-slate-700 dark:text-slate-300 overflow-x-auto whitespace-nowrap w-full">
                                Tipo_Perfil;Nombre_Sede;Direccion_Sede;Nombre_Usuario;Email_Usuario;Documento_Usuario;Telefono_Usuario;Grado_Estudiante;Seccion_Estudiante;Asignatura_Profesor;Intensidad_horaria
                            </code>
                        </div>
                        <button 
                            onClick={downloadTemplate}
                            className="bg-white text-blue-600 px-4 py-3 rounded-lg text-sm font-bold border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap flex items-center gap-2 shrink-0"
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

                    {warnings.length > 0 && errors.length === 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 max-h-40 overflow-y-auto">
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">Advertencias (se omitirán estos registros):</p>
                            <ul className="list-disc pl-5 text-xs text-amber-600 dark:text-amber-300 space-y-1">
                                {warnings.map((warn, i) => (
                                    <li key={i}>{warn}</li>
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
    campuses: Campus[];
}> = ({ onClose, onSave, campusToEdit, admins, campuses }) => {
    const isEditing = !!campusToEdit;
    const [formData, setFormData] = useState({
        name: campusToEdit?.name || '',
        address: campusToEdit?.address || '',
        admin: campusToEdit?.admin || '',
        isMainCampus: campusToEdit ? !!campusToEdit.isMainCampus : true,
        parentCampusId: campusToEdit?.parentCampusId || ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name: formData.name,
            address: formData.address,
            admin: formData.admin,
            isMainCampus: formData.isMainCampus,
            parentCampusId: formData.isMainCampus ? undefined : (formData.parentCampusId || undefined)
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm shadow-xl">
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
                    
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="isMainCampus"
                            name="isMainCampus" 
                            checked={formData.isMainCampus} 
                            onChange={handleChange} 
                            className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                        />
                        <label htmlFor="isMainCampus" className="text-sm font-bold dark:text-gray-300 cursor-pointer">
                            Es Sede Principal
                        </label>
                    </div>

                    {!formData.isMainCampus && (
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Sede Principal a la que pertenece</label>
                            <select name="parentCampusId" value={formData.parentCampusId} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" required>
                                <option value="">Seleccione una Sede Principal</option>
                                {campuses.filter(c => c.isMainCampus || !c.parentCampusId).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

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
    const { campuses, addCampus, updateCampus, deleteCampus, admins, updateAdmin, deleteAdmin, addAdmin, addTeacher, updateTeacher, deleteTeacher, addStudent, updateStudent, deleteStudent, addAssignment, assignments, teachers, students } = useData();
    const { impersonateUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
    const [deletingCampus, setDeletingCampus] = useState<Campus | null>(null);
    const [viewingProfilesCampus, setViewingProfilesCampus] = useState<Campus | null>(null);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Auto-cleanup for previous duplicates
    useEffect(() => {
        const cleanup = async () => {
            const byEmailAdmin = new Map<string, any[]>();
            admins.forEach(a => {
                const e = a.email.toLowerCase().trim();
                if (!byEmailAdmin.has(e)) byEmailAdmin.set(e, []);
                byEmailAdmin.get(e)!.push(a);
            });
            for (const [e, docs] of byEmailAdmin.entries()) {
                if (docs.length > 1) {
                    const keep = docs[0];
                    const remove = docs.slice(1);
                    const allIds = new Set<string>();
                    docs.forEach(dr => {
                        if (dr.campusId) allIds.add(dr.campusId);
                        if (dr.campusIds) dr.campusIds.forEach((c: string) => allIds.add(c));
                    });
                    await updateAdmin(keep.id, { campusIds: Array.from(allIds), campusId: undefined });
                    for (const r of remove) await deleteAdmin(r.id);
                }
            }

            const byEmailTeacher = new Map<string, any[]>();
            teachers.forEach(a => {
                const e = a.email.toLowerCase().trim();
                if (!byEmailTeacher.has(e)) byEmailTeacher.set(e, []);
                byEmailTeacher.get(e)!.push(a);
            });
            for (const [e, docs] of byEmailTeacher.entries()) {
                if (docs.length > 1) {
                    const remove = docs.slice(1);
                    for (const r of remove) await deleteTeacher(r.id);
                }
            }

            const byEmailStudent = new Map<string, any[]>();
            students.forEach(a => {
                const e = a.email.toLowerCase().trim();
                if (!byEmailStudent.has(e)) byEmailStudent.set(e, []);
                byEmailStudent.get(e)!.push(a);
            });
            for (const [e, docs] of byEmailStudent.entries()) {
                if (docs.length > 1) {
                    const remove = docs.slice(1);
                    for (const r of remove) await deleteStudent(r.id);
                }
            }
        };
        if (admins.length > 0 && teachers.length > 0) {
            cleanup();
        }
    }, [admins, teachers, students]);

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

        let currentMainCampusId: string | null = null;

        for (const row of parsedData) {
            try {
                const tipo = row.tipoPerfil?.toLowerCase();
                const isMain = tipo === 'sede' || tipo === 'sede principal';
                const isSub = tipo === 'subsede';
                
                if (isMain || isSub) {
                    if (!campusMap.has(row.nombreSede.toLowerCase())) {
                        const id = await addCampus({
                            name: row.nombreSede,
                            address: row.direccionSede,
                            admin: row.nombreUsuario || '',
                            isMainCampus: isMain,
                            parentCampusId: isSub && currentMainCampusId ? currentMainCampusId : undefined
                        });
                        if (id) {
                            campusMap.set(row.nombreSede.toLowerCase(), id);
                            campusNameMap.set(id, row.nombreSede);
                            if (isMain) currentMainCampusId = id;
                        }
                        successCount++;
                    } else {
                        const id = campusMap.get(row.nombreSede.toLowerCase());
                        if (isMain && id) currentMainCampusId = id;
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
                    const existingAdmin = admins.find(a => a.email.toLowerCase() === row.emailUsuario.toLowerCase());
                    if (existingAdmin) {
                        const currentIds = existingAdmin.campusIds || [existingAdmin.campusId].filter(Boolean) as string[];
                        if (campusId && !currentIds.includes(campusId)) {
                            await updateAdmin(existingAdmin.id, {
                                campusIds: [...currentIds, campusId],
                                campusId: undefined // Migrate away from single campusId if needed, or leave it. Let's just maintain both for backward compatibility.
                            });
                        }
                    } else {
                        await addAdmin({
                            name: row.nombreUsuario,
                            email: row.emailUsuario,
                            campusId: campusId,
                            campusIds: campusId ? [campusId] : [],
                            campusName: actualCampusName,
                            status: 'active'
                        });
                    }
                    successCount++;
                } else if (tipo === 'profesor') {
                    let teacherId: string | undefined;
                    const existingTeacher = teachers.find(t => t.email.toLowerCase() === row.emailUsuario.toLowerCase());
                    
                    if (existingTeacher) {
                        teacherId = existingTeacher.id;
                        // Reactivate if inactive
                        if (existingTeacher.status !== 'active') {
                             await updateTeacher(teacherId, { status: 'active', campusId: campusId || existingTeacher.campusId, campusName: actualCampusName || existingTeacher.campusName });
                        }
                    } else {
                        teacherId = await addTeacher({
                            name: row.nombreUsuario,
                            email: row.emailUsuario,
                            documentNumber: row.documentoUsuario || '',
                            phone: row.telefonoUsuario || '',
                            campusId: campusId,
                            campusName: actualCampusName,
                            subject: row.asignaturaProfesor || '',
                            status: 'active'
                        });
                    }
                    
                    if (teacherId && row.assignments && row.assignments.length > 0) {
                        for (const assignment of row.assignments) {
                            if (assignment.subject && assignment.class && assignment.section) {
                                // Prevent duplicate assignments
                                const existingAssign = assignments?.find((a: any) => 
                                    a.teacherId === teacherId && 
                                    a.subject === assignment.subject && 
                                    a.class === assignment.class && 
                                    a.section === assignment.section
                                );
                                if (!existingAssign) {
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
                    }
                    successCount++;
                } else if (tipo === 'estudiante') {
                    const existingStudent = students.find(s => s.email.toLowerCase() === row.emailUsuario.toLowerCase());
                    if (existingStudent) {
                        if (existingStudent.status !== 'active') {
                             await updateStudent(existingStudent.id, { status: 'active', campusId: campusId || existingStudent.campusId, campusName: actualCampusName || existingStudent.campusName });
                        }
                    } else {
                        await addStudent({
                            name: row.nombreUsuario,
                            email: row.emailUsuario,
                            documentNumber: row.documentoUsuario || '',
                            phone: row.telefonoUsuario || '',
                            campusId: campusId,
                            campusName: actualCampusName,
                            class: row.gradoEstudiante || '',
                            section: row.seccionEstudiante || '',
                            status: 'active',
                            schoolPeriod: 'A',
                            schoolYear: new Date().getFullYear()
                        });
                    }
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
                        <button onClick={() => setIsBulkModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm flex items-center justify-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                            <UploadIcon className="w-4 h-4"/> Masiva
                        </button>
                        <button onClick={openCreateModal} className="bg-primary text-white font-bold py-2.5 px-5 rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm flex items-center justify-center gap-2">
                            <PlusIcon className="w-4 h-4"/> Añadir Sede
                        </button>
                    </div>
                </div>
                
                <div className="space-y-12">
                    {campuses.filter(c => c.isMainCampus || !c.parentCampusId).map(mainCampus => (
                        <div key={mainCampus.id} className="space-y-6">
                            {/* Main Campus header/card */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-card border-2 border-primary/20 dark:border-primary/30 flex flex-col justify-between hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-primary/80"></div>
                                <div className="p-6 pl-8">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/20 dark:text-blue-400">
                                            <BuildingOfficeIcon className="w-6 h-6"/>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <EmergencyNukeButton campusId={mainCampus.id} campusName={mainCampus.name} onSuccess={() => {}} />
                                            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded dark:bg-slate-800">{mainCampus.teachers + mainCampus.students} Usuarios</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{mainCampus.name} <span className="text-xs ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900/40 dark:text-blue-300">Sede Principal</span></h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        {mainCampus.address}
                                    </p>
                                    
                                    <div className="mt-6 flex flex-wrap gap-6">
                                        <div className="flex items-center gap-2 text-sm border-r border-slate-100 pr-6 dark:border-slate-800">
                                            <span className="text-slate-500">Admin:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{mainCampus.admin || 'Sin asignar'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm border-r border-slate-100 pr-6 dark:border-slate-800">
                                            <span className="text-slate-500">Profesores:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{mainCampus.teachers}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-500">Estudiantes:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{mainCampus.students}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 pl-8 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
                                    <div className="flex gap-4">
                                         <button onClick={() => openEditModal(mainCampus)} className="text-sm font-bold text-primary hover:text-blue-700 flex items-center gap-1.5 transition-colors">
                                            <ClipboardDocumentListIcon className="w-4 h-4" /> Detalles
                                        </button>
                                        <button onClick={() => setViewingProfilesCampus(mainCampus)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors">
                                            <UsersIcon className="w-4 h-4" /> Observar
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                        <button onClick={() => openEditModal(mainCampus)} className="p-2 rounded-full bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:text-amber-400" title="Editar"><EditIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            </div>

                            {/* Subcampuses */}
                            {campuses.filter(c => c.parentCampusId === mainCampus.id).length > 0 && (
                                <div className="ml-4 md:ml-12 pl-6 md:pl-8 border-l border-indigo-200 dark:border-indigo-800/50">
                                    <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-4 tracking-wider uppercase">Subsedes Asociadas</h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {campuses.filter(c => c.parentCampusId === mainCampus.id).map(subCampus => (
                                            <div key={subCampus.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow duration-300 relative">
                                                <div className="p-5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg dark:bg-indigo-900/20 dark:text-indigo-400">
                                                                <BuildingOfficeIcon className="w-5 h-5"/>
                                                            </div>
                                                            <h3 className="text-base font-bold text-slate-800 dark:text-white line-clamp-1" title={subCampus.name}>{subCampus.name}</h3>
                                                        </div>
                                                        <EmergencyNukeButton campusId={subCampus.id} campusName={subCampus.name} onSuccess={() => {}} />
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-4">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                        {subCampus.address}
                                                    </p>
                                                    
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                                            <span className="text-slate-500 block mb-0.5">Admin</span>
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">{subCampus.admin || 'Sin asignar'}</span>
                                                        </div>
                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded flex justify-between items-center">
                                                            <div className="text-center w-1/2 border-r border-slate-200 dark:border-slate-700">
                                                                <span className="text-slate-500 block">Profs</span>
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{subCampus.teachers}</span>
                                                            </div>
                                                            <div className="text-center w-1/2">
                                                                <span className="text-slate-500 block">Estds</span>
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{subCampus.students}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                    <div className="flex gap-3">
                                                         <button onClick={() => openEditModal(subCampus)} className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-1 transition-colors">
                                                            <ClipboardDocumentListIcon className="w-3.5 h-3.5" /> Detalles
                                                        </button>
                                                        <button onClick={() => setViewingProfilesCampus(subCampus)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                                                            <UsersIcon className="w-3.5 h-3.5" /> Observar
                                                        </button>
                                                    </div>
                                                    <button onClick={() => openEditModal(subCampus)} className="p-1.5 rounded-full bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:text-amber-400" title="Editar"><EditIcon className="w-3.5 h-3.5"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {isBulkModalOpen && <BulkUploadModal onClose={() => setIsBulkModalOpen(false)} onSave={handleBulkSave} />}
            {isModalOpen && <CampusFormModal onClose={() => setIsModalOpen(false)} onSave={handleSave} campusToEdit={editingCampus} admins={admins} campuses={campuses} />}
            {deletingCampus && <DeleteConfirmationModal campus={deletingCampus} onClose={() => setDeletingCampus(null)} onConfirm={handleDelete} />}
            {viewingProfilesCampus && (
                <ViewProfilesModal 
                    campus={viewingProfilesCampus} 
                    onClose={() => setViewingProfilesCampus(null)} 
                    admins={admins}
                    teachers={teachers}
                    students={students}
                    onImpersonate={impersonateUser}
                />
            )}
        </>
    );
};

export default CampusManagementPage;
