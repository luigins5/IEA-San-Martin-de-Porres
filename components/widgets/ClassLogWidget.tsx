
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TeacherCourseAssignment, Student, Grade, AttendanceRecord } from '../../types';
import { useData } from '../../context/DataContext';
import { PlusIcon, SaveIcon, CheckIcon, ExclamationTriangleIcon, TrashIcon, ClipboardCheckIcon } from '../icons';
import { getPeriodFromDate, conceptsCSV } from '../teachers/GradesPage';

interface StudentInput {
    score: string;
    faults: string;
    observation: string; // Now holds the selected concept text
}

interface ActivityLog {
    id: string;
    studentName: string;
    actionType: 'grade' | 'attendance' | 'mixed';
    details: string;
    timestamp: string;
    observation?: string;
}

const ClassLogWidget: React.FC = () => {
    const { user } = useAuth();
    const { assignments, students: allStudents, attendanceRecords, saveAttendance, addGrade, getUserSetting, setUserSetting, globalSettings, campusSettings } = useData();
    
    const [myClasses, setMyClasses] = useState<TeacherCourseAssignment[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
    const [numberOfPeriods, setNumberOfPeriods] = useState(4);
    const [concepts, setConcepts] = useState<{ code: string; text: string }[]>([]);
    
    // Estado para manejar los inputs de cada estudiante
    const [inputs, setInputs] = useState<Record<string, StudentInput>>({});
    const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
    
    // Historial de actividad local
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

    useEffect(() => {
        // Cargar configuración de periodos
        let settings: any = null;
        if (globalSettings) settings = { ...globalSettings };
        
        if (user?.campusId && campusSettings) {
            settings = { ...settings, ...campusSettings };
        }
        if (settings && settings.numberOfPeriods) setNumberOfPeriods(settings.numberOfPeriods);

        // Calcular periodo actual basado en la fecha
        const today = new Date().toISOString().split('T')[0];
        const currentPeriod = getPeriodFromDate(today, settings?.numberOfPeriods || 4);
        setSelectedPeriod(currentPeriod);

        // Cargar clases del profesor
        if (user) {
            const teacherAssignments = assignments.filter(a => a.teacherId === user.id);
            setMyClasses(teacherAssignments);
            if (teacherAssignments.length > 0 && !selectedClassId) {
                setSelectedClassId(teacherAssignments[0].id);
            }
            
            // Cargar logs guardados
            const loadLogs = async () => {
                const savedLogs = await getUserSetting(user.id, 'teacher_activity_logs');
                if (savedLogs) {
                    setActivityLogs(savedLogs);
                }
            };
            loadLogs();
        }

        // Cargar Conceptos Predefinidos
        const parsedConcepts = conceptsCSV
            .split('\n').slice(1).filter(row => row.trim())
            .map(row => {
                const parts = row.split(';');
                const code = parts.pop()?.trim() || '';
                const text = parts.join(';').trim().replace(/^\uFEFF/, '');
                return { code, text };
            }).filter(c => c.code && c.text);
        setConcepts(parsedConcepts);

    }, [user, assignments, globalSettings, campusSettings]);

    const selectedClass = myClasses.find(c => c.id === selectedClassId);

    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return allStudents.filter(s => 
            s.class === selectedClass.class && 
            s.section === selectedClass.section &&
            s.status === 'active'
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedClass, allStudents]);

    // Calcular faltas totales acumuladas en el periodo seleccionado (Base de datos)
    const getSavedAccumulatedFaults = (studentId: string) => {
        return attendanceRecords
            .filter(r => 
                r.studentId === studentId && 
                r.period === selectedPeriod && 
                (r.status === 'Ausente' || r.status === 'Justificado')
            )
            .reduce((acc, curr) => acc + (curr.count || 1), 0);
    };

    const handleInputChange = (studentId: string, field: keyof StudentInput, value: string) => {
        setInputs(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
        // Reset saved status on change
        if (savedStatus[studentId]) {
            setSavedStatus(prev => ({ ...prev, [studentId]: false }));
        }
    };

    const validateScore = (scoreStr: string): boolean => {
        if (!scoreStr) return true; // Empty is valid (means no grade)
        const score = parseFloat(scoreStr);
        return !isNaN(score) && score >= 0.1 && score <= 5.0;
    };

    const addToLog = async (studentName: string, actions: string[], observation?: string) => {
        const newLog: ActivityLog = {
            id: Date.now().toString(),
            studentName,
            actionType: actions.length > 1 ? 'mixed' : (actions[0].includes('Nota') ? 'grade' : 'attendance'),
            details: actions.join(' | '),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            observation
        };
        
        const updatedLogs = [newLog, ...activityLogs].slice(0, 50); // Keep last 50
        setActivityLogs(updatedLogs);
        if (user) {
            await setUserSetting(user.id, 'teacher_activity_logs', updatedLogs);
        }
    };

    const clearLogs = async () => {
        setActivityLogs([]);
        if (user) await setUserSetting(user.id, 'teacher_activity_logs', null);
    };

    const handleSaveStudentRow = async (student: Student) => {
        const input = inputs[student.id] || { score: '', faults: '', observation: '' };
        const score = parseFloat(input.score);
        const newFaults = parseInt(input.faults);
        const today = new Date().toISOString().split('T')[0];

        // Validaciones
        if (!validateScore(input.score)) {
            alert("La calificación debe estar entre 0.1 y 5.0");
            return;
        }
        if (!input.score && !input.faults && !input.observation) return; // Nada que guardar

        const logActions: string[] = [];

        try {
            // 1. Guardar Nota
            if (!isNaN(score) && selectedClass) {
                const selectedConcept = concepts.find(c => c.text === input.observation);
                await addGrade({
                    studentId: student.id,
                    subject: selectedClass.subject,
                    class: student.class,
                    assignmentTitle: `Nota de Clase - ${new Date().toLocaleDateString()}`,
                    score: score,
                    percentage: 10,
                    date: today,
                    comments: input.observation || 'Nota rápida desde panel',
                    conceptCode: selectedConcept ? selectedConcept.code : '' 
                });
                logActions.push(`Nota: ${score}`);
            }

            // 2. Guardar Faltas (Acumulando con las de hoy si existen)
            if (!isNaN(newFaults) && newFaults > 0) {
                // Verificar si ya hay faltas hoy para sumarlas, no reemplazarlas
                const existingRecord = attendanceRecords.find(r => 
                    r.studentId === student.id && 
                    r.date === today &&
                    r.period === selectedPeriod
                );
                
                const totalDailyFaults = (existingRecord?.count || 0) + newFaults;

                await saveAttendance({
                    studentId: student.id,
                    date: today,
                    status: 'Ausente',
                    count: totalDailyFaults, // Guardamos la suma del día
                    period: selectedPeriod
                });
                logActions.push(`Faltas: +${newFaults}`);
            } else if (input.observation && logActions.length === 0) {
                 logActions.push(`Observación registrada`);
            }

            // Add to activity log
            if (logActions.length > 0) {
                addToLog(student.name, logActions, input.observation);
            }

            // Feedback visual
            setSavedStatus(prev => ({ ...prev, [student.id]: true }));
            
            // Limpiar inputs
            setInputs(prev => ({
                ...prev,
                [student.id]: { score: '', faults: '', observation: '' }
            }));

            setTimeout(() => {
                setSavedStatus(prev => ({ ...prev, [student.id]: false }));
            }, 2000);

        } catch (error) {
            console.error("Error al guardar anotación:", error);
            alert("Error al guardar los datos.");
        }
    };

    if (myClasses.length === 0) return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 text-center border border-gray-100 dark:border-slate-700">
            <p className="text-gray-500 dark:text-gray-400">No tienes asignaturas para gestionar.</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-full">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <SaveIcon className="w-5 h-5" />
                            Anotaciones de Clase
                        </h3>
                        <p className="text-xs text-blue-100 mt-1">Registra notas rápidas y asistencia del día.</p>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-slate-700/30 border-b dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Asignatura</label>
                        <select 
                            value={selectedClassId} 
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {myClasses.map(c => (
                                <option key={c.id} value={c.id}>{c.subject} ({c.class}-{c.section})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Periodo</label>
                        <select 
                            value={selectedPeriod} 
                            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                            className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map(p => (
                                <option key={p} value={p}>Periodo {p}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-grow overflow-auto max-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-slate-900 dark:text-gray-300 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3">Estudiante</th>
                                <th className="px-2 py-3 text-center w-24" title="Total faltas en este periodo">Acum. Faltas</th>
                                <th className="px-2 py-3 w-32">Calificación (0.1 - 5.0)</th>
                                <th className="px-2 py-3 w-24 text-center">Total Faltas</th>
                                <th className="px-2 py-3">Observación (Concepto)</th>
                                <th className="px-2 py-3 text-center w-16">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {classStudents.map(student => {
                                const input = inputs[student.id] || { score: '', faults: '', observation: '' };
                                const isSaved = savedStatus[student.id];
                                const baseAccumulated = getSavedAccumulatedFaults(student.id);
                                const pendingFaults = parseInt(input.faults) || 0;
                                const isScoreValid = validateScore(input.score);

                                return (
                                    <tr key={student.id} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                            {student.name}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${baseAccumulated > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                                    {baseAccumulated}
                                                </span>
                                                {pendingFaults > 0 && (
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                                                        + {pendingFaults} = {baseAccumulated + pendingFaults}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 relative">
                                            <input 
                                                type="number" 
                                                min="0.1" max="5.0" step="0.1"
                                                value={input.score}
                                                onChange={(e) => handleInputChange(student.id, 'score', e.target.value)}
                                                placeholder="-"
                                                className={`w-full p-1.5 text-center border rounded text-sm outline-none dark:bg-slate-700 dark:text-white 
                                                    ${!isScoreValid 
                                                        ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
                                                        : 'border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500'}`}
                                            />
                                            {!isScoreValid && (
                                                <div className="absolute top-full left-0 w-full text-[10px] text-red-600 text-center font-bold bg-white dark:bg-slate-800 z-10 shadow-sm border border-red-200 rounded mt-1">
                                                    Mín 0.1 - Máx 5.0
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={input.faults}
                                                onChange={(e) => handleInputChange(student.id, 'faults', e.target.value)}
                                                placeholder="0"
                                                className="w-full p-1.5 text-center border rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <select 
                                                value={input.observation}
                                                onChange={(e) => handleInputChange(student.id, 'observation', e.target.value)}
                                                className="w-full p-1.5 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white truncate"
                                            >
                                                <option value="">Seleccione concepto...</option>
                                                {concepts.map(c => (
                                                    <option key={c.code} value={c.text} title={c.text}>
                                                        {c.text.length > 50 ? c.text.substring(0, 50) + '...' : c.text}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button 
                                                onClick={() => handleSaveStudentRow(student)}
                                                disabled={(!input.score && !input.faults && !input.observation) || isSaved || !isScoreValid}
                                                className={`p-2 rounded-full transition-all duration-300 ${
                                                    isSaved 
                                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                                                        : (input.score || input.faults || input.observation) && isScoreValid
                                                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50' 
                                                            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                }`}
                                                title="Guardar cambios"
                                            >
                                                {isSaved ? <CheckIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {classStudents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No hay estudiantes activos en esta clase.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Historial de Actividad */}
            {activityLogs.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-white flex items-center gap-2">
                            <ClipboardCheckIcon className="w-4 h-4 text-blue-500" />
                            Historial de Actividad Reciente
                        </h4>
                        <button onClick={clearLogs} className="text-xs text-red-500 hover:text-red-700 hover:underline">
                            Limpiar Historial
                        </button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {activityLogs.map((log) => (
                            <div key={log.id} className="text-xs p-2 bg-gray-50 dark:bg-slate-700/50 rounded border-l-4 border-l-blue-500 flex justify-between items-start animate-fade-in-up">
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-gray-200">{log.studentName}</p>
                                    <p className="text-blue-600 dark:text-blue-400 font-medium mt-0.5">{log.details}</p>
                                    {log.observation && <p className="text-gray-500 dark:text-gray-400 mt-0.5 italic truncate max-w-md">{log.observation}</p>}
                                </div>
                                <span className="text-gray-400 dark:text-gray-500">{log.timestamp}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassLogWidget;
