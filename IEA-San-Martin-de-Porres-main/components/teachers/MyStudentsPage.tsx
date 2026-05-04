
import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, TeacherCourseAssignment, Grade, UserRole } from '../../types';
import Card from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { EyeIcon, ClipboardDocumentListIcon, UploadIcon, ChevronRightIcon, ChevronDownIcon, ExclamationTriangleIcon, AcademicCapIcon } from '../icons';
import { useData } from '../../context/DataContext';
import { GradesManagementModal, BulkUploadGradesModal, getPeriodFromDate } from './GradesPage';

// Modal simplificado de asistencia para este archivo
const AttendanceModal: React.FC<{
    student: Student;
    onClose: () => void;
    onSave: (data: { date: string; status: 'Presente' | 'Ausente' | 'Justificado'; count: number; period: number }) => void;
    activePeriod: number;
    attendanceHistory: AttendanceRecord[];
    onDelete: (id: string) => void;
}> = ({ student, onClose, onSave, activePeriod, attendanceHistory, onDelete }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'Presente' | 'Ausente' | 'Justificado'>('Ausente');
    const [count, setCount] = useState(1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ date, status, count, period: activePeriod });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Registrar Falla: {student.name}</h3>
                    <button onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded" required />
                    <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full p-2 border rounded">
                        <option value="Ausente">Ausencia Injustificada</option>
                        <option value="Justificado">Ausencia Justificada</option>
                        <option value="Presente">Retardo</option>
                    </select>
                    <div>
                        <label className="block text-sm font-bold mb-1">Cantidad de Horas</label>
                        <input type="number" min="1" value={count} onChange={e => setCount(parseInt(e.target.value))} className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded">Guardar</button>
                    </div>
                </form>
                
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-bold text-sm mb-2">Historial Periodo {activePeriod}</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2 text-sm">
                        {attendanceHistory.map(record => (
                            <div key={record.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                <span>{record.date} ({record.count}h) - {record.status}</span>
                                <button onClick={() => onDelete(record.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                            </div>
                        ))}
                        {attendanceHistory.length === 0 && <p className="text-gray-500 text-xs">No hay fallas registradas.</p>}
                    </div>
                </div>
            </Card>
        </div>
    );
};

const MyStudentsPage: React.FC = () => {
    const { user } = useAuth();
    const { students: allStudents, grades, addGrade, updateGrade, deleteGrade, assignments, teachers, attendanceRecords, saveAttendance, deleteAttendance, globalSettings, campusSettings, concepts } = useData();
    
    const [myClasses, setMyClasses] = useState<TeacherCourseAssignment[]>([]);
    const [selectedClass, setSelectedClass] = useState<TeacherCourseAssignment | null>(null);
    const [activePeriod, setActivePeriod] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [numberOfPeriods, setNumberOfPeriods] = useState(4);
    
    // Modals
    const [managingStudent, setManagingStudent] = useState<Student | null>(null);
    const [attendanceStudent, setAttendanceStudent] = useState<Student | null>(null);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            const currentTeacher = teachers.find(t => t.email === user.email);
            const teacherId = currentTeacher?.id || user.id;
            const teacherAssignments = assignments.filter(a => a.teacherId === teacherId);
            setMyClasses(teacherAssignments);
            setSelectedClass(prev => {
                if (!prev && teacherAssignments.length > 0) return teacherAssignments[0];
                if (prev && !teacherAssignments.find(a => a.id === prev.id) && teacherAssignments.length > 0) return teacherAssignments[0];
                return prev;
            });
        }
        
        let settings: any = null;
        if (globalSettings) settings = { ...globalSettings };
        
        if (user?.campusId && campusSettings) {
            settings = { ...settings, ...campusSettings };
        }
        if (settings && settings.numberOfPeriods) {
            setNumberOfPeriods(settings.numberOfPeriods);
            const today = new Date().toISOString().split('T')[0];
            setActivePeriod(getPeriodFromDate(today, settings.numberOfPeriods));
        }

    }, [user, assignments, globalSettings, campusSettings]);

    const myStudents = useMemo(() => {
        if (!selectedClass) return [];
        const assignedTeacher = teachers.find(t => t.id === selectedClass.teacherId);
        const targetCampusId = assignedTeacher?.campusId;

        return allStudents.filter(s => {
            const normalize = (str: string | undefined | null) => String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
            const replaceEncodingErrors = (str: string) => str.replace('transicin', 'transicion').replace('dimesion', 'dimension');
            
            const teacherClass = replaceEncodingErrors(normalize(selectedClass.class));
            const teacherSection = normalize(selectedClass.section);
            const studentClass = replaceEncodingErrors(normalize(s.class));
            const studentSection = normalize(s.section);

            const isClassMatch = studentClass === teacherClass || 
                               studentClass === `${teacherClass}-${teacherSection}` ||
                               studentClass === `${teacherClass} ${teacherSection}` ||
                               studentClass.includes(teacherClass) || teacherClass.includes(studentClass);
            
            const isSectionMatch = studentSection === teacherSection || 
                                 (!studentSection && studentClass.includes(teacherSection));

            const campusMatch = !targetCampusId || !s.campusId || s.campusId === targetCampusId || user?.role === UserRole.SUPER_ADMIN;
            const searchMatch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || Boolean(s.documentNumber?.includes(searchQuery));
            const statusMatch = s.status !== 'inactive';
            
            return isClassMatch && isSectionMatch && campusMatch && searchMatch && statusMatch;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [selectedClass, allStudents, searchQuery, teachers, user]);

    const teacherSubjects = selectedClass ? [selectedClass.subject] : [];
    
    const calculateTotalFaults = (studentId: string) => {
        return attendanceRecords
            .filter(r => r.studentId === studentId && r.period === activePeriod && (r.status === 'Ausente' || r.status === 'Justificado'))
            .reduce((acc, curr) => acc + (curr.count || 1), 0);
    };

    const calculateFinalGrade = (studentId: string) => {
        const studentGrades = grades.filter(g => g.studentId === studentId && g.subject === selectedClass?.subject && ((g as any).period === activePeriod || getPeriodFromDate(g.date, numberOfPeriods) === activePeriod));
        if (studentGrades.length === 0) return 0;
        
        const totalScore = studentGrades.reduce((acc, g) => acc + (g.score * g.percentage / 100), 0);
        const totalPerc = studentGrades.reduce((acc, g) => acc + g.percentage, 0);
        
        return totalPerc > 0 ? (totalScore * 100) / totalPerc : 0;
    };

    const handleSaveGrade = async (gradeData: Omit<Grade, 'id'> & {id?: string}) => {
        try {
            if (gradeData.id) {
                await updateGrade(gradeData.id, gradeData);
            } else {
                await addGrade(gradeData);
            }
            setNotification({ message: 'Calificación guardada', type: 'success' });
        } catch (e) {
            setNotification({ message: 'Error al guardar', type: 'error' });
        }
    };

    const handleDeleteGrade = async (gradeId: string) => {
        if(confirm('¿Eliminar nota?')) {
            await deleteGrade(gradeId);
            setNotification({ message: 'Calificación eliminada', type: 'success' });
        }
    };

    const handleSaveAttendance = async (data: any) => {
        if (!attendanceStudent) return;
        try {
            await saveAttendance({ ...data, studentId: attendanceStudent.id });
            setNotification({ message: 'Asistencia registrada', type: 'success' });
        } catch (e) {
            setNotification({ message: 'Error al guardar asistencia', type: 'error' });
        }
    };

    const handleDeleteAttendance = async (id: string) => {
        if(confirm('¿Eliminar registro de asistencia?')) {
            await deleteAttendance(id);
        }
    };

    const handleBulkSaveGrades = async (newGrades: Omit<Grade, 'id'>[]) => {
        for (const g of newGrades) {
            await addGrade(g);
        }
        setNotification({ message: 'Carga masiva completada', type: 'success' });
        setIsBulkUploadModalOpen(false);
    };

    return (
        <>
        {notification && (
            <div className={`fixed bottom-5 right-5 z-[100] p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {notification.message}
            </div>
        )}
        
        <div className="flex flex-col lg:flex-row gap-6 items-start h-full">
            <div className="w-full lg:w-72 flex-shrink-0">
                <Card className="p-0 border-none shadow-md overflow-hidden sticky top-6">
                    <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <AcademicCapIcon className="w-5 h-5" /> Mis Clases
                        </h2>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800">
                        {myClasses.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setSelectedClass(c)}
                                className={`w-full text-left p-3 rounded-lg transition-all text-sm font-semibold mb-1 border-l-4 ${selectedClass?.id === c.id ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300' : 'bg-white border-transparent hover:bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                            >
                                <div className="font-bold">{c.subject}</div>
                                <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">{c.class} - Grupo '{c.section}'</div>
                                {c.schedule && c.schedule.length > 0 && (
                                    <div className="text-[10px] mt-1.5 flex flex-wrap gap-1">
                                        {c.schedule.map(s => (
                                            <span key={s.day} className="bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                                {s.day.substring(0, 2)} ({s.hours}h)
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        ))}
                        {myClasses.length === 0 && <p className="text-sm text-gray-500 p-4 text-center">No tienes clases asignadas.</p>}
                    </div>
                </Card>
            </div>

            <div className="flex-1 w-full min-w-0">
                <Card className="flex flex-col h-full border-none shadow-none bg-transparent p-0">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col">
                        <div className="p-6 bg-gradient-to-r from-blue-700 to-blue-600 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="font-bold text-2xl">
                                    {selectedClass ? `${selectedClass.class} - ${selectedClass.section}` : 'Seleccione una clase'}
                                </h2>
                                <p className="text-sm text-blue-100 mt-1 opacity-90">
                                    {selectedClass ? selectedClass.subject : 'Gestión de estudiantes'}
                                </p>
                            </div>
                             <div className="flex items-center gap-2 w-full md:w-auto">
                                <input type="text" placeholder="Buscar estudiante..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full md:w-48 p-2 pl-4 rounded-lg bg-white/20 border border-white/30 text-white placeholder-blue-100 focus:outline-none focus:bg-white/30 focus:border-white transition-all text-sm"/>
                                <button
                                    onClick={() => setIsBulkUploadModalOpen(true)}
                                    disabled={!selectedClass}
                                    className="bg-white text-blue-700 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-50 transition-colors text-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                >
                                    <UploadIcon className="w-4 h-4"/> Masiva
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-700/30 border-b dark:border-gray-700 px-6 py-3">
                            <div className="flex space-x-2 overflow-x-auto">
                                {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => setActivePeriod(period)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                            activePeriod === period 
                                            ? 'bg-blue-600 text-white shadow-md' 
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        Periodo {period}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedClass ? (
                             <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-900 dark:text-gray-300">
                                        <tr>
                                            <th className="px-6 py-4 w-10"></th>
                                            <th className="px-6 py-4">Estudiante</th>
                                            <th className="px-6 py-4 text-center">Fallas (P{activePeriod})</th>
                                            <th className="px-6 py-4 text-center">Nota Final (P{activePeriod})</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                        {myStudents.map(student => {
                                            const isExpanded = expandedStudentId === student.id;
                                            const totalFaults = calculateTotalFaults(student.id);
                                            const finalGrade = calculateFinalGrade(student.id);
                                            
                                            return (
                                            <React.Fragment key={student.id}>
                                                <tr className={`bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors ${isExpanded ? 'bg-blue-50' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <button onClick={() => setExpandedStudentId(isExpanded ? null : student.id)} className="text-gray-400 hover:text-blue-600">
                                                            {isExpanded ? <ChevronDownIcon className="w-4 h-4"/> : <ChevronRightIcon className="w-4 h-4"/>}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{student.name}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${totalFaults > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{totalFaults}h</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-gray-800 dark:text-white">
                                                        {finalGrade.toFixed(1)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <button onClick={() => setManagingStudent(student)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" title="Notas">
                                                                <ClipboardDocumentListIcon className="w-4 h-4"/>
                                                            </button>
                                                            <button onClick={() => setAttendanceStudent(student)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Falla">
                                                                <ExclamationTriangleIcon className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-gray-50 dark:bg-slate-900">
                                                        <td colSpan={5} className="p-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="bg-white p-3 rounded border dark:bg-slate-800 dark:border-slate-700">
                                                                    <h4 className="font-bold text-xs mb-2">Desglose de Notas (P{activePeriod})</h4>
                                                                    <ul className="space-y-1 text-xs">
                                                                        {grades.filter(g => g.studentId === student.id && g.subject === selectedClass.subject && ((g as any).period === activePeriod || getPeriodFromDate(g.date, numberOfPeriods) === activePeriod)).map(g => (
                                                                            <li key={g.id} className="flex justify-between border-b pb-1">
                                                                                <span>{g.assignmentTitle}</span>
                                                                                <span className="font-bold">{g.score} ({g.percentage}%)</span>
                                                                            </li>
                                                                        ))}
                                                                        {grades.filter(g => g.studentId === student.id && g.subject === selectedClass.subject && ((g as any).period === activePeriod || getPeriodFromDate(g.date, numberOfPeriods) === activePeriod)).length === 0 && <li className="text-gray-400">Sin notas</li>}
                                                                    </ul>
                                                                </div>
                                                                <div className="bg-white p-3 rounded border dark:bg-slate-800 dark:border-slate-700">
                                                                    <h4 className="font-bold text-xs mb-2">Datos Estudiante</h4>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400">Documento: {student.documentNumber}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400">Email: {student.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )})}
                                        {myStudents.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay estudiantes en esta clase.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-400">
                                <AcademicCapIcon className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                                <p>Seleccione una clase del menú lateral.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
        
        {/* Modals */}
        {managingStudent && selectedClass && (
            <GradesManagementModal
                student={managingStudent}
                grades={grades.filter(g => 
                    g.studentId === managingStudent.id && 
                    g.subject === selectedClass.subject &&
                    ((g as any).period === activePeriod || getPeriodFromDate(g.date, numberOfPeriods) === activePeriod)
                )}
                onClose={() => setManagingStudent(null)}
                onSaveGrade={handleSaveGrade}
                onDeleteGrade={handleDeleteGrade}
                teacherSubjects={[selectedClass.subject]}
                concepts={concepts}
                activePeriod={activePeriod}
                numberOfPeriods={numberOfPeriods}
                isPeriodLocked={false}
            />
        )}
        {attendanceStudent && (
            <AttendanceModal
                student={attendanceStudent}
                onClose={() => setAttendanceStudent(null)}
                onSave={handleSaveAttendance}
                activePeriod={activePeriod}
                attendanceHistory={attendanceRecords.filter(r => r.studentId === attendanceStudent.id && r.period === activePeriod)}
                onDelete={handleDeleteAttendance}
            />
        )}
        {isBulkUploadModalOpen && (
            <BulkUploadGradesModal
                onClose={() => setIsBulkUploadModalOpen(false)}
                onSave={handleBulkSaveGrades}
                myStudents={myStudents}
                teacherSubjects={teacherSubjects}
                allGrades={grades}
                isPeriodLocked={false}
                activePeriod={activePeriod}
            />
        )}
        </>
    );
};

export default MyStudentsPage;
