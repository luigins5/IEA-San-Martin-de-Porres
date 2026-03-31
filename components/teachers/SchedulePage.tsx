import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClassSchedule, SchoolEvent, UserRole, Teacher, Exam, TeacherCourseAssignment } from '../../types';
import Card from '../ui/Card';
import { PlusIcon, EditIcon, TrashIcon } from '../icons';
import { useData } from '../../context/DataContext';

const dayOfWeekMap = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
];

const ScheduleInstanceModal: React.FC<{
    instance: { schedule: ClassSchedule; date: Date };
    isCancelled: boolean;
    onClose: () => void;
    onCancel: (classScheduleId: string, date: string) => void;
    onReinstate: (classScheduleId: string, date: string) => void;
    onEditRecurring: (schedule: ClassSchedule) => void;
}> = ({ instance, isCancelled, onClose, onCancel, onReinstate, onEditRecurring }) => {
    const { schedule, date } = instance;
    const dateString = date.toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-text-primary dark:text-white">Detalles de la Clase</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none dark:text-gray-400 dark:hover:text-white">&times;</button>
                </div>
                {isCancelled && <div className="p-2 mb-4 text-center bg-yellow-100 text-yellow-800 rounded-md dark:bg-yellow-900/50 dark:text-yellow-300">Esta clase está cancelada para este día.</div>}
                <div className="space-y-3 text-text-secondary dark:text-gray-300">
                    <p><strong>Fecha:</strong> <span className="font-semibold text-text-primary dark:text-gray-100">{date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                    <p><strong>Asignatura:</strong> <span className="font-semibold text-text-primary dark:text-gray-100">{schedule.subject}</span></p>
                    <p><strong>Clase:</strong> <span className="font-semibold text-text-primary dark:text-gray-100">{schedule.class} - Grupo '{schedule.section}'</span></p>
                    <p><strong>Hora:</strong> <span className="font-semibold text-text-primary dark:text-gray-100">{schedule.startTime} - {schedule.endTime}</span></p>
                </div>
                <div className="mt-6 pt-4 border-t dark:border-gray-700 flex flex-col space-y-3">
                    {isCancelled ? (
                        <button onClick={() => onReinstate(schedule.id, dateString)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors w-full">
                            Reactivar Clase para este día
                        </button>
                    ) : (
                        <button onClick={() => onCancel(schedule.id, dateString)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors w-full">
                            Eliminar (Cancelar solo este día)
                        </button>
                    )}
                    <button onClick={() => { onClose(); onEditRecurring(schedule); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors w-full">
                        Editar Horario Recurrente
                    </button>
                     <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition-colors dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200 w-full">
                        Cerrar
                    </button>
                </div>
            </Card>
        </div>
    );
};

const ClassFormModal: React.FC<{
    teacherId: string;
    onClose: () => void;
    onSave: (data: Omit<ClassSchedule, 'id'>) => void;
    scheduleToEdit: ClassSchedule | null;
}> = ({ teacherId, onClose, onSave, scheduleToEdit }) => {
    const { assignments } = useData();
    const isEditing = !!scheduleToEdit;
    const myAssignments = assignments.filter(a => a.teacherId === teacherId);
    
    const [formData, setFormData] = useState({
        subject: '', class: '', section: '', dayOfWeek: 1, startTime: '08:00', endTime: '09:00',
    });
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (scheduleToEdit) {
            setFormData({ ...scheduleToEdit });
            const assignmentString = JSON.stringify({ subject: scheduleToEdit.subject, class: scheduleToEdit.class, section: scheduleToEdit.section });
            setSelectedAssignment(assignmentString);
        } else if (myAssignments.length > 0) {
            const firstAssignment = myAssignments[0];
            const assignmentString = JSON.stringify({ subject: firstAssignment.subject, class: firstAssignment.class, section: firstAssignment.section });
            setSelectedAssignment(assignmentString);
            setFormData(prev => ({ ...prev, ...firstAssignment }));
        }
    }, [teacherId, scheduleToEdit, myAssignments]);
    

    const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedAssignment(value);
        if (value) {
            const { subject, class: selectedClass, section } = JSON.parse(value);
            setFormData(prev => ({...prev, subject, class: selectedClass, section }));
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'dayOfWeek' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const { startTime, endTime } = formData;
        if (startTime >= endTime) {
            setError('La hora de fin debe ser posterior a la hora de inicio.');
            return;
        }
        onSave({ ...formData, teacherId });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Clase' : 'Añadir Nueva Clase al Horario'}</h2>
                <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    <div>
                        <label className="block text-sm font-bold mb-1">Asignatura/Clase</label>
                        <select value={selectedAssignment} onChange={handleAssignmentChange} className="w-full p-2 border rounded bg-gray-100" required>
                            {myAssignments.map(a => {
                                const assignmentString = JSON.stringify({ subject: a.subject, class: a.class, section: a.section });
                                return <option key={a.id} value={assignmentString}>{`${a.subject} - ${a.class} '${a.section}'`}</option>
                            })}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-bold mb-1">Día</label>
                            <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100" required>
                                {dayOfWeekMap.filter(d => d.value > 0 && d.value < 6).map(day => (
                                    <option key={day.value} value={day.value}>{day.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Hora de Inicio</label>
                            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100" required/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Hora de Fin</label>
                            <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100" required/>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 font-bold py-2 px-3 text-sm rounded">Cancelar</button>
                        <button type="submit" className="bg-primary text-white font-bold py-2 px-3 text-sm rounded">Guardar</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


const SchedulePage: React.FC = () => {
    const { user } = useAuth();
    const { schedules, addSchedule, updateSchedule, deleteSchedule, exams, getUserSetting, setUserSetting } = useData();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
    const [selectedInstance, setSelectedInstance] = useState<{ schedule: ClassSchedule; date: Date } | null>(null);
    
    // Using local state for cancellations for now.
    const [cancellations, setCancellations] = useState<{classScheduleId: string, date: string}[]>([]);
    
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const loadCancellations = async () => {
            if (user) {
                const savedCancellations = await getUserSetting(user.id, 'schedule_cancellations');
                if (savedCancellations) {
                    setCancellations(savedCancellations);
                }
            }
        };
        loadCancellations();
    }, [user, getUserSetting]);

    const handleSaveSchedule = async (data: Omit<ClassSchedule, 'id'>) => {
        if (!user) return;
        try {
            if (editingSchedule) {
                await updateSchedule(editingSchedule.id, data);
            } else {
                await addSchedule(data);
            }
        } catch (error) { console.error("Failed to save schedule", error); }
        setIsFormOpen(false);
        setEditingSchedule(null);
    };
    
    const handleDeleteRecurringSchedule = async (scheduleId: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este horario recurrente? Todas las futuras clases serán eliminadas.')) {
            try {
                await deleteSchedule(scheduleId);
                const newCancellations = cancellations.filter(c => c.classScheduleId !== scheduleId);
                setCancellations(newCancellations);
                if(user) await setUserSetting(user.id, 'schedule_cancellations', newCancellations);
            } catch (error) { console.error("Failed to delete schedule", error); }
        }
    };
    
    const handleCancelInstance = async (classScheduleId: string, date: string) => {
        const newCancellations = [...cancellations, { classScheduleId, date }];
        setCancellations(newCancellations);
        if(user) await setUserSetting(user.id, 'schedule_cancellations', newCancellations);
        setSelectedInstance(null);
    };

    const handleReinstateInstance = async (classScheduleId: string, date: string) => {
        const newCancellations = cancellations.filter(c => !(c.classScheduleId === classScheduleId && c.date === date));
        setCancellations(newCancellations);
        if(user) await setUserSetting(user.id, 'schedule_cancellations', newCancellations);
        setSelectedInstance(null);
    };
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Start on Monday

    const weekDates = Array.from({ length: 5 }).map((_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
    });

    const teacherSchedules = schedules.filter(s => s.teacherId === user?.id).sort((a,b) => a.startTime.localeCompare(b.startTime));
    const teacherExams = exams.filter(e => e.teacherId === user?.id);
    
    return (
        <>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Mi Horario Semanal</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={() => { setEditingSchedule(null); setIsFormOpen(true); }} className="bg-primary text-white font-bold py-2 px-3 rounded flex items-center gap-2">
                            <PlusIcon className="w-5 h-5"/> Añadir Clase
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    {weekDates.map(date => {
                        const dayOfWeek = date.getDay();
                        const dateString = date.toISOString().split('T')[0];
                        const daySchedules = teacherSchedules.filter(s => s.dayOfWeek === dayOfWeek);
                        const dayExams = teacherExams.filter(e => e.startDate === dateString);

                        return (
                            <div key={dateString} className="bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg">
                                <p className="font-bold text-center border-b pb-1 mb-2 dark:border-slate-600">{dayOfWeekMap.find(d => d.value === dayOfWeek)?.label} {date.getDate()}</p>
                                <div className="space-y-2">
                                    {daySchedules.map(s => {
                                        const isCancelled = cancellations.some(c => c.classScheduleId === s.id && c.date === dateString);
                                        return (
                                        <div key={s.id} onClick={() => setSelectedInstance({schedule: s, date})} className={`p-2 rounded-md cursor-pointer ${isCancelled ? 'bg-red-100 text-red-700 line-through opacity-60' : 'bg-blue-100 text-blue-800'}`}>
                                            <p className="font-semibold text-xs">{s.startTime} - {s.endTime}</p>
                                            <p className="text-xs">{s.subject} - {s.class}</p>
                                        </div>
                                    )})}
                                    {dayExams.map(e => (
                                        <div key={e.id} className="p-2 rounded-md bg-purple-100 text-purple-800">
                                            <p className="font-semibold text-xs">{e.time || 'Todo el día'}</p>
                                            <p className="text-xs font-bold">{e.title}</p>
                                        </div>
                                    ))}
                                    {daySchedules.length === 0 && dayExams.length === 0 && <p className="text-xs text-center text-gray-400 pt-4">Libre</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
            {isFormOpen && user && <ClassFormModal teacherId={user.id} onClose={() => setIsFormOpen(false)} onSave={handleSaveSchedule} scheduleToEdit={editingSchedule} />}
            {selectedInstance && (
                <ScheduleInstanceModal 
                    instance={selectedInstance}
                    isCancelled={cancellations.some(c => c.classScheduleId === selectedInstance.schedule.id && c.date === selectedInstance.date.toISOString().split('T')[0])}
                    onClose={() => setSelectedInstance(null)}
                    onCancel={handleCancelInstance}
                    onReinstate={handleReinstateInstance}
                    onEditRecurring={(schedule) => {
                        setEditingSchedule(schedule);
                        setIsFormOpen(true);
                    }}
                />
            )}
        </>
    );
};

export default SchedulePage;