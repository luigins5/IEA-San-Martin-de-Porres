
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TeacherCourseAssignment, Student, Grade, AttendanceRecord, UserRole } from '../../types';
import { useData } from '../../context/DataContext';
import { PlusIcon, SaveIcon, CheckIcon, ClipboardCheckIcon, TrashIcon, UploadIcon, DownloadIcon, ChevronRightIcon, ChevronDownIcon, EditIcon, ClipboardDocumentListIcon, AcademicCapIcon, CalendarIcon, CloseIcon, ExclamationTriangleIcon } from '../icons';
import { getPeriodFromDate, conceptsCSV } from './GradesPage';
import Card from '../ui/Card';

const BulkUploadModal = ({ onClose, onSave, classStudents }: { onClose: () => void, onSave: (data: any[]) => void, classStudents: Student[] }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const downloadTemplate = () => {
        const headers = "documento_identidad,nota,actividad,observacion\n";
        // Usar los primeros 3 estudiantes como ejemplo para la plantilla
        const examples = classStudents.slice(0, 3).map(s => 
            `${s.documentNumber},4.5,Tarea de Clase,Excelente participación`
        ).join('\n');
        
        const blob = new Blob([headers + examples], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_carga_notas.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        
        setFile(f);
        setIsProcessing(true);
        setErrors([]);
        setParsedData([]);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                const rows = text.split('\n').filter(r => r.trim());
                if (rows.length <= 1) {
                    setErrors(["El archivo está vacío o solo contiene encabezados."]);
                    setIsProcessing(false);
                    return;
                }

                const dataRows = rows.slice(1);
                const results: any[] = [];
                const newErrors: string[] = [];

                dataRows.forEach((row, index) => {
                    const cols = row.split(',').map(c => c.trim());
                    if (cols.length < 2) return;

                    const docNum = cols[0];
                    const score = parseFloat(cols[1]);
                    const activity = cols[2] || 'Actividad Masiva';
                    const observation = cols[3] || '';

                    const student = classStudents.find(s => s.documentNumber === docNum);

                    if (!student) {
                        newErrors.push(`Fila ${index + 2}: El estudiante con documento ${docNum} no pertenece a esta clase.`);
                    } else if (isNaN(score) || score < 0 || score > 5) {
                        newErrors.push(`Fila ${index + 2}: La nota (${cols[1]}) debe ser un número entre 0.0 y 5.0.`);
                    } else {
                        results.push({
                            studentId: student.id,
                            studentName: student.name,
                            score,
                            detail: activity,
                            observation
                        });
                    }
                });

                setParsedData(results);
                setErrors(newErrors);
            } catch (err) {
                setErrors(["Error al procesar el archivo. Asegúrese de que sea un CSV válido."]);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(f);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm p-4">
            <Card className="bg-white dark:bg-slate-900 p-0 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Importar Calificaciones</h2>
                        <p className="text-sm text-slate-500">Carga notas para múltiples estudiantes mediante un archivo CSV.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6 text-slate-400"/>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Template download and info */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 text-white rounded-lg">
                                <DownloadIcon className="w-5 h-5"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">¿No tienes el formato?</p>
                                <p className="text-xs text-indigo-700 dark:text-indigo-400">Descarga la plantilla con los estudiantes de este grupo.</p>
                            </div>
                        </div>
                        <button 
                            onClick={downloadTemplate}
                            className="w-full sm:w-auto px-4 py-2 bg-white text-indigo-600 font-bold rounded-lg text-xs border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"
                        >
                            Descargar Plantilla
                        </button>
                    </div>

                    {/* File Dropzone */}
                    <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                        <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="pointer-events-none">
                            <UploadIcon className="w-12 h-12 mx-auto text-slate-300 group-hover:text-indigo-500 transition-colors mb-4"/>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{file ? file.name : 'Haz clic o arrastra tu archivo CSV aquí'}</p>
                            <p className="text-xs text-slate-400 mt-2">Tamaño máximo: 5MB</p>
                        </div>
                    </div>

                    {/* Feedback area */}
                    <div className="max-h-48 overflow-y-auto space-y-3 custom-scrollbar">
                        {isProcessing && (
                            <div className="flex items-center justify-center p-4">
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="ml-3 text-sm font-medium text-slate-600">Procesando registros...</span>
                            </div>
                        )}

                        {errors.length > 0 && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl">
                                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase mb-2 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-4 h-4"/> Errores en el archivo:
                                </h4>
                                <ul className="text-xs text-rose-600 dark:text-rose-300 list-disc list-inside space-y-1">
                                    {errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        )}

                        {parsedData.length > 0 && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Registros listos ({parsedData.length}):</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {parsedData.slice(0, 5).map((item, i) => (
                                        <div key={i} className="flex justify-between text-[10px] bg-white/50 dark:bg-slate-800 p-2 rounded">
                                            <span className="font-medium">{item.studentName}</span>
                                            <span className="font-bold text-indigo-600">Nota: {item.score}</span>
                                        </div>
                                    ))}
                                    {parsedData.length > 5 && <p className="text-[10px] text-slate-400 italic">Y {parsedData.length - 5} estudiantes más...</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                        Cancelar
                    </button>
                    <button 
                        disabled={parsedData.length === 0 || isProcessing}
                        onClick={() => onSave(parsedData)}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        Importar {parsedData.length} Calificaciones
                    </button>
                </div>
            </Card>
        </div>
    );
};

// Nuevo Modal para añadir concepto personalizado
const AddCustomConceptModal = ({ onClose, onSave }: { onClose: () => void, onSave: (text: string) => void }) => {
    const [text, setText] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim().length < 5) {
            alert('El concepto es muy corto.');
            return;
        }
        onSave(text.trim());
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-md shadow-2xl animate-fade-in-up border-none">
                <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Nuevo Concepto Personalizado</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escriba el comentario u observación que desea guardar para usarlo posteriormente en sus calificaciones.</p>
                    <textarea 
                        autoFocus
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none min-h-[120px] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="Ej: El estudiante demuestra un excelente dominio de los temas vistos durante la semana..."
                        required
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800">Cancelar</button>
                        <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 transition-all">Guardar Concepto</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const EditRecordModal = ({ record, onClose, onSave, concepts }: { record: any, onClose: () => void, onSave: (data: any) => void, concepts: any[] }) => {
    const isGrade = record.type === 'Nota';
    const [formData, setFormData] = useState({
        score: record.value || '',
        detail: record.detail || '', 
        observation: record.raw?.comments || '',
        count: isGrade ? 0 : (record.value || 1)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...record, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Editar {record.type}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6"/>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isGrade ? (
                        <>
                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Actividad / Criterio</label>
                                <input 
                                    type="text" 
                                    value={formData.detail} 
                                    onChange={e => setFormData({...formData, detail: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Nota (0.0 - 5.0)</label>
                                    <input 
                                        type="number" min="0.0" max="5.0" step="0.1"
                                        value={formData.score} 
                                        onChange={e => setFormData({...formData, score: e.target.value})}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Observación</label>
                                <select 
                                    value={formData.observation}
                                    onChange={(e) => setFormData({...formData, observation: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                                    required
                                >
                                    <option value="">Seleccionar concepto...</option>
                                    {concepts.map(c => <option key={c.code} value={c.text}>{c.text.substring(0, 100)}...</option>)}
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Tipo de Ausencia</label>
                                <select 
                                    value={formData.detail} 
                                    onChange={e => setFormData({...formData, detail: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                                >
                                    <option value="Ausente">Ausente (Injustificada)</option>
                                    <option value="Justificada">Justificada</option>
                                    <option value="Presente">Retardo / Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Cantidad de Horas/Fallas</label>
                                <input 
                                    type="number" min="1"
                                    value={formData.count} 
                                    onChange={e => setFormData({...formData, count: parseInt(e.target.value)})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors text-sm dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition-colors text-sm">Guardar Cambios</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const CRITERIA_OPTIONS = [
    'Examen',
    'Trabajo individual',
    'Trabajo en grupo',
    'Exposición',
    'Otro'
];

const ClassAnnotationsPage: React.FC = () => {
    const { user } = useAuth();
    const { assignments, teachers, students: allStudents, attendanceRecords, saveAttendance, addGrade, updateGrade, grades, deleteGrade, deleteAttendance, exams, getUserSetting, setUserSetting, globalSettings, campusSettings } = useData();
    const [myClasses, setMyClasses] = useState<TeacherCourseAssignment[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
    const [numberOfPeriods, setNumberOfPeriods] = useState(4);
    const [concepts, setConcepts] = useState<{ code: string; text: string }[]>([]);
    const [inputs, setInputs] = useState<Record<string, any>>({});
    const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
    
    // Validations State
    const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
    const [editingRecord, setEditingRecord] = useState<any | null>(null);

    // Cargar y combinar conceptos (CSV + Personalizados)
    const refreshConcepts = async () => {
        const parsedBase = conceptsCSV
            .split('\n').slice(1).filter(row => row.trim())
            .map(row => {
                const parts = row.split(';');
                const code = parts.pop()?.trim() || '';
                const text = parts.join(';').trim().replace(/^\uFEFF/, '');
                return { code, text };
            }).filter(c => c.code && c.text);

        let custom = [];
        if (user) {
            custom = await getUserSetting(user.id, 'custom_concepts') || [];
        }
        setConcepts([...custom, ...parsedBase]);
    };

    useEffect(() => {
        let settings: any = null;
        if (globalSettings) settings = { ...globalSettings };
        
        if (user?.campusId && campusSettings) {
            settings = { ...settings, ...campusSettings };
        }
        if (settings && settings.numberOfPeriods) setNumberOfPeriods(settings.numberOfPeriods);

        const today = new Date().toISOString().split('T')[0];
        const currentPeriod = getPeriodFromDate(today, settings?.numberOfPeriods || 4);
        setSelectedPeriod(currentPeriod);

        if (user) {
            const teacherAssignments = assignments.filter(a => a.teacherId === user.id);
            setMyClasses(teacherAssignments);
            if (teacherAssignments.length > 0) {
                setSelectedClassId(teacherAssignments[0].id);
            }
        }

        refreshConcepts();
    }, [user, assignments, globalSettings, campusSettings]);

    const handleSaveCustomConcept = async (text: string) => {
        let custom = [];
        if (user) {
            custom = await getUserSetting(user.id, 'custom_concepts') || [];
            const newConcept = { code: `P${Date.now().toString().slice(-4)}`, text };
            await setUserSetting(user.id, 'custom_concepts', [newConcept, ...custom]);
            refreshConcepts();
        }
        setIsConceptModalOpen(false);
    };

    const selectedClass = myClasses.find(c => c.id === selectedClassId);
    
    const availableExams = useMemo(() => {
        if (!selectedClass || !user) return [];
        return exams.filter(exam => 
            exam.teacherId === user.id && 
            exam.subject === selectedClass.subject &&
            String(exam.schoolPeriod) === String(selectedPeriod)
        );
    }, [exams, selectedClass, user, selectedPeriod]);

    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return allStudents.filter(s => 
            s.class === selectedClass.class && 
            s.section === selectedClass.section && 
            s.status === 'active' &&
            (s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [selectedClass, allStudents, searchQuery]);

    const getSavedAccumulatedFaults = (studentId: string) => {
        return attendanceRecords
            .filter(r => 
                r.studentId === studentId && 
                r.period === selectedPeriod && 
                (r.status === 'Ausente' || r.status === 'Justificado')
            )
            .reduce((acc, curr) => acc + (curr.count || 1), 0);
    };

    const handleInputChange = (studentId: string, field: string, value: string) => {
        setInputs(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
        
        if (savedStatus[studentId]) {
            setSavedStatus(prev => ({ ...prev, [studentId]: false }));
        }

        if (validationErrors[studentId]?.[field]) {
            setValidationErrors(prev => {
                const newStudentErrors = { ...prev[studentId] };
                delete newStudentErrors[field];
                return { ...prev, [studentId]: newStudentErrors };
            });
        }
    };

    const handleSaveStudentRow = async (student: Student) => {
        const input = inputs[student.id] || { score: '', faults: '', observation: '', criterion: '', customCriterion: '' };
        
        const scoreStr = input.score !== undefined ? String(input.score) : '';
        const faultsStr = input.faults !== undefined ? String(input.faults) : '';
        
        const hasScoreInput = scoreStr.trim() !== '';
        const hasCriterionInput = input.criterion && input.criterion.trim() !== '';
        const hasObservationInput = input.observation && input.observation.trim() !== '';
        const hasFaultsInput = faultsStr.trim() !== '' && parseInt(faultsStr) > 0;

        if (!hasScoreInput && !hasCriterionInput && !hasObservationInput && !hasFaultsInput) return;

        const currentErrors: Record<string, string> = {};
        const isGradeEntry = hasScoreInput || hasCriterionInput || hasObservationInput;

        if (isGradeEntry) {
             if (!hasCriterionInput) currentErrors.criterion = "Requerido";
             if (input.criterion === 'Otro' && (!input.customCriterion || input.customCriterion.trim() === '')) {
                 currentErrors.customCriterion = "Requerido";
             }
             if (!hasScoreInput) {
                 currentErrors.score = "Requerido";
             } else {
                 const score = parseFloat(scoreStr);
                 if (isNaN(score) || score < 0.0 || score > 5.0) {
                     currentErrors.score = "0.0 a 5.0";
                 }
             }
             if (!hasObservationInput) currentErrors.observation = "Requerido";
        }

        if (Object.keys(currentErrors).length > 0) {
            setValidationErrors(prev => ({ ...prev, [student.id]: currentErrors }));
            return;
        }

        const score = parseFloat(String(scoreStr));
        const newFaults = parseInt(String(faultsStr));
        const today = new Date().toISOString().split('T')[0];

        try {
            if (!isNaN(score) && selectedClass && isGradeEntry) {
                const selectedConcept = concepts.find(c => c.text === input.observation);
                let finalTitle = input.criterion || 'Actividad en clase';
                if (input.criterion === 'Otro') {
                    finalTitle = input.customCriterion || 'Otro';
                }

                await addGrade({
                    studentId: student.id,
                    subject: selectedClass.subject,
                    class: student.class,
                    assignmentTitle: finalTitle,
                    score: score,
                    percentage: 10,
                    date: today,
                    comments: input.observation || 'Nota rápida',
                    conceptCode: selectedConcept ? selectedConcept.code : '' 
                });
            }

            if (!isNaN(newFaults) && newFaults > 0) {
                const existingRecord = attendanceRecords.find(r => r.studentId === student.id && r.date === today && r.period === selectedPeriod);
                const totalDailyFaults = (existingRecord?.count || 0) + newFaults;
                await saveAttendance({
                    studentId: student.id,
                    date: today,
                    status: 'Ausente',
                    count: totalDailyFaults,
                    period: selectedPeriod
                });
            }

            setSavedStatus(prev => ({ ...prev, [student.id]: true }));
            setInputs(prev => ({ ...prev, [student.id]: { score: '', faults: '', observation: '', criterion: input.criterion, customCriterion: input.customCriterion } }));
            setTimeout(() => setSavedStatus(prev => ({ ...prev, [student.id]: false })), 2000);

        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar los datos.");
        }
    };

    const handleBulkSave = async (data: any[]) => {
        if (!selectedClass) return;
        
        let count = 0;
        const today = new Date().toISOString().split('T')[0];
        
        for (const item of data) {
            try {
                const selectedConcept = concepts.find(c => c.text === item.observation);
                await addGrade({
                    studentId: item.studentId,
                    subject: selectedClass.subject,
                    class: selectedClass.class,
                    assignmentTitle: item.detail,
                    score: item.score,
                    percentage: 10, // Porcentaje por defecto para notas rápidas
                    date: today,
                    comments: item.observation || 'Carga masiva',
                    conceptCode: selectedConcept ? selectedConcept.code : ''
                });
                count++;
            } catch (err) {
                console.error("Error cargando nota masiva para studentId:", item.studentId, err);
            }
        }
        
        setIsBulkModalOpen(false);
        alert(`Se han importado ${count} calificaciones exitosamente.`);
    };

    const handleUpdateRecord = async (updatedRecord: any) => {
        try {
            if (updatedRecord.type === 'Nota') {
                await updateGrade(updatedRecord.id, {
                    assignmentTitle: updatedRecord.detail,
                    score: parseFloat(String(updatedRecord.score)),
                    comments: updatedRecord.observation
                });
            } else {
                await saveAttendance({
                    studentId: updatedRecord.studentId || '',
                    date: updatedRecord.date,
                    status: updatedRecord.detail,
                    count: parseInt(String(updatedRecord.count)),
                    period: selectedPeriod
                });
            }
            setEditingRecord(null);
        } catch (e) {
            console.error("Error updating", e);
            alert("Error al actualizar el registro.");
        }
    };

    const handleDeleteHistoryItem = async (item: any) => {
        if (!window.confirm(`¿Estás seguro de eliminar este registro de ${item.type}?`)) return;
        try {
            if (item.type === 'Nota') {
                await deleteGrade(item.id);
            } else {
                await deleteAttendance(item.id);
            }
        } catch (e) {
            console.error(e);
            alert('Error al eliminar');
        }
    };

    const getStudentHistory = (studentId: string) => {
        const studentGrades = grades
            .filter(g => g.studentId === studentId && getPeriodFromDate(g.date, numberOfPeriods) === selectedPeriod)
            .map(g => ({ ...g, type: 'Nota', value: g.score, detail: g.assignmentTitle, id: g.id, date: g.date, raw: g, studentId }));
        
        const studentAttendance = attendanceRecords
            .filter(a => a.studentId === studentId && a.period === selectedPeriod)
            .map(a => ({ ...a, type: 'Falla', value: a.count, detail: a.status, id: a.id, date: a.date, raw: a, studentId }));

        return [...studentGrades, ...studentAttendance].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    const getScoreColorClass = (scoreStr: string) => {
        if (!scoreStr) return 'border-transparent bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500';
        const s = parseFloat(String(scoreStr));
        if (isNaN(s)) return 'border-slate-200';
        if (s < 3.0) return 'bg-red-50 text-red-600 focus:ring-2 focus:ring-red-500';
        if (s < 4.0) return 'bg-amber-50 text-amber-600 focus:ring-2 focus:ring-amber-500';
        return 'bg-emerald-50 text-emerald-600 focus:ring-2 focus:ring-emerald-500';
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 lg:p-8 shadow-xl text-white flex flex-col lg:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="font-bold text-3xl flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                            <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
                        </div>
                        <span className="tracking-tight">Gestión de Notas</span>
                    </h2>
                    <p className="text-blue-100 mt-2 font-medium ml-16 text-lg opacity-90">Registro rápido de calificaciones y asistencia.</p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center relative z-10">
                     <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-lg border border-white/20">
                        <div className="relative group">
                            <select 
                                value={selectedClassId} 
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold rounded-xl bg-transparent text-slate-700 focus:outline-none focus:bg-slate-50 min-w-[180px] cursor-pointer transition-colors"
                            >
                                {myClasses.map(c => <option key={c.id} value={c.id}>{c.subject} ({c.class}-{c.section})</option>)}
                            </select>
                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-none"/>
                        </div>
                        <div className="h-8 w-px bg-slate-200 mx-1"></div>
                        <div className="relative group">
                            <select 
                                value={selectedPeriod} 
                                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                                className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold rounded-xl bg-transparent text-slate-700 focus:outline-none focus:bg-slate-50 cursor-pointer transition-colors"
                            >
                                {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map(p => <option key={p} value={p}>P{p}</option>)}
                            </select>
                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-none"/>
                        </div>
                    </div>
                    <div className="relative">
                        <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-48 pl-4 pr-4 py-3 text-sm rounded-2xl bg-white/20 text-white placeholder-blue-200 border border-white/30 focus:bg-white/30 focus:border-white focus:outline-none transition-all backdrop-blur-sm shadow-inner"/>
                    </div>
                    <button onClick={() => setIsBulkModalOpen(true)} className="bg-white text-indigo-600 font-bold py-3 px-6 rounded-2xl hover:bg-blue-50 transition-all text-sm flex items-center justify-center gap-2 shadow-md">
                        <UploadIcon className="w-5 h-5" /> <span className="hidden sm:inline">Masiva</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-8 py-6 font-semibold">Estudiante</th>
                                <th className="px-4 py-6 font-semibold w-48">Criterio</th>
                                <th className="px-3 py-6 font-semibold w-32 text-center">Nota</th>
                                <th className="px-4 py-6 font-semibold w-auto min-w-[200px]">Observación</th>
                                <th className="px-3 py-6 font-semibold w-24 text-center">Faltas</th>
                                <th className="px-3 py-6 font-semibold text-center w-24">Acum.</th>
                                <th className="px-6 py-6 font-semibold text-center w-24">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {classStudents.map(student => {
                                const input = inputs[student.id] || { score: '', faults: '', observation: '', criterion: '', customCriterion: '' };
                                const isSaved = savedStatus[student.id];
                                const baseAccumulated = getSavedAccumulatedFaults(student.id);
                                const isExpanded = expandedStudentId === student.id;
                                const hasPendingChanges = input.score || input.faults || input.observation;
                                const studentErrors = validationErrors[student.id] || {};

                                return (
                                    <React.Fragment key={student.id}>
                                        <tr className={`group transition-all duration-300 ${isExpanded ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                                            <td className="px-8 py-5 align-middle">
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => setExpandedStudentId(isExpanded ? null : student.id)} className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600 rotate-90' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}>
                                                        <ChevronRightIcon className="w-4 h-4" />
                                                    </button>
                                                    <div>
                                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-base">{student.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md tracking-wider">{student.documentNumber}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 align-middle">
                                                <div className="space-y-2">
                                                    <select value={input.criterion} onChange={(e) => handleInputChange(student.id, 'criterion', e.target.value)}
                                                        className={`w-full py-2 px-3 rounded-xl text-xs bg-slate-50 text-slate-600 font-medium outline-none transition-all dark:bg-slate-800 dark:text-slate-300 cursor-pointer ${studentErrors.criterion ? 'border-2 border-red-400 bg-red-50' : 'border-none'}`}>
                                                        <option value="">Seleccionar Criterio...</option>
                                                        {availableExams.map(exam => <option key={exam.id} value={exam.title}>{exam.title}</option>)}
                                                        {CRITERIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                    {input.criterion === 'Otro' && (
                                                        <input type="text" placeholder="Especifique..." value={input.customCriterion} onChange={(e) => handleInputChange(student.id, 'customCriterion', e.target.value)}
                                                            className={`w-full py-2 px-3 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none dark:bg-slate-800 dark:text-white ${studentErrors.customCriterion ? 'border-2 border-red-400 bg-red-50' : 'border-none'}`} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-5 align-middle">
                                                <input type="number" min="0.0" max="5.0" step="0.1" value={input.score} onChange={(e) => handleInputChange(student.id, 'score', e.target.value)} placeholder="-"
                                                    className={`w-full py-3 text-center rounded-2xl text-base font-bold transition-all outline-none shadow-sm ${studentErrors.score ? 'border-2 border-red-400 bg-red-50' : getScoreColorClass(input.score)}`} />
                                            </td>
                                            <td className="px-4 py-5 align-middle">
                                                <div className="flex gap-2 items-center">
                                                    <div className="flex-1 min-w-0">
                                                        <select value={input.observation} onChange={(e) => handleInputChange(student.id, 'observation', e.target.value)}
                                                            className={`w-full py-2.5 px-3 rounded-xl text-xs bg-slate-50 text-slate-500 focus:bg-white outline-none transition-all dark:bg-slate-800 dark:text-slate-400 cursor-pointer ${studentErrors.observation ? 'border-2 border-red-400 bg-red-50' : 'border-none'}`}>
                                                            <option value="">Seleccionar concepto...</option>
                                                            {concepts.map(c => <option key={c.code} value={c.text}>[{c.code}] {c.text.length > 55 ? c.text.substring(0,55)+'...' : c.text}</option>)}
                                                        </select>
                                                    </div>
                                                    <button 
                                                        onClick={() => setIsConceptModalOpen(true)}
                                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors dark:bg-indigo-900/20 dark:text-indigo-400" 
                                                        title="Añadir concepto personalizado"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-5 align-middle">
                                                <input type="number" min="0" value={input.faults} onChange={(e) => handleInputChange(student.id, 'faults', e.target.value)} placeholder="0"
                                                    className="w-full py-2.5 text-center rounded-xl text-sm font-bold bg-slate-50 text-slate-700 focus:bg-white focus:ring-2 focus:ring-rose-100 outline-none transition-all dark:bg-slate-800 dark:text-white border-none"/>
                                            </td>
                                            <td className="px-3 py-5 text-center align-middle">
                                                <span className={`text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full ${baseAccumulated > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{baseAccumulated}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center align-middle">
                                                <button onClick={() => handleSaveStudentRow(student)} disabled={(!hasPendingChanges || isSaved) && Object.keys(studentErrors).length === 0}
                                                    className={`p-3 rounded-xl transition-all duration-500 shadow-sm ${isSaved ? 'bg-emerald-500 text-white scale-110' : hasPendingChanges || Object.keys(studentErrors).length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1' : 'bg-slate-100 text-slate-300 dark:bg-slate-800 cursor-not-allowed'}`}>
                                                    {isSaved ? <CheckIcon className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                                <td colSpan={7} className="px-8 pb-8 pt-2">
                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-4">
                                                        <h4 className="font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                            <ClipboardCheckIcon className="w-5 h-5 text-indigo-500"/>Historial Detallado
                                                        </h4>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-xs text-left">
                                                                <thead className="text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                                    <tr>
                                                                        <th className="px-4 py-3">Fecha</th>
                                                                        <th className="px-4 py-3">Tipo</th>
                                                                        <th className="px-4 py-3">Criterio</th>
                                                                        <th className="px-4 py-3 text-center">Nota</th>
                                                                        <th className="px-4 py-3">Observación</th>
                                                                        <th className="px-4 py-3 text-center">Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                                    {getStudentHistory(student.id).map((item) => (
                                                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                                            <td className="px-4 py-3 text-slate-500 font-mono">{new Date(item.date).toLocaleDateString()}</td>
                                                                            <td className="px-4 py-3">
                                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${item.type === 'Nota' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>{item.type}</span>
                                                                            </td>
                                                                            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.detail}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                {item.type === 'Nota' ? <span className="font-bold text-sm">{item.value}</span> : <span className="font-bold text-slate-800 dark:text-white text-sm">{item.value}</span>}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-slate-500 italic max-w-[250px] truncate" title={(item.raw as any).comments || ''}>{(item.raw as any).comments || '-'}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <div className="flex justify-center gap-2">
                                                                                    <button onClick={() => setEditingRecord(item)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg"><EditIcon className="w-4 h-4" /></button>
                                                                                    <button onClick={() => handleDeleteHistoryItem(item)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {isBulkModalOpen && <BulkUploadModal onClose={() => setIsBulkModalOpen(false)} onSave={handleBulkSave} classStudents={classStudents} />}
            {isConceptModalOpen && <AddCustomConceptModal onClose={() => setIsConceptModalOpen(false)} onSave={handleSaveCustomConcept} />}
            {editingRecord && <EditRecordModal record={editingRecord} onClose={() => setEditingRecord(null)} onSave={handleUpdateRecord} concepts={concepts} />}
        </div>
    );
};

export default ClassAnnotationsPage;
