
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Student, ClassSchedule, Exam } from '../../types';
import { useData } from '../../context/DataContext';
import { CalendarIcon } from '../icons';
import Card from '../ui/Card';

const StudentSchedulePage: React.FC = () => {
    const { user } = useAuth();
    const student = user as Student;
    const { schedules: allSchedules, exams: allExams, teachers } = useData();
    const [weekDates, setWeekDates] = useState<Date[]>([]);

    useEffect(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(diff);

        const dates = [];
        for (let i = 0; i < 6; i++) { // Lunes a Sábado
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            dates.push(dayDate);
        }
        setWeekDates(dates);
    }, []);

    const schedules = allSchedules.filter(s => s.class === student?.class && s.section === student?.section);
    const exams = allExams.filter(e => e.campusId === student?.campusId);

    const getTeacherName = (teacherId: string) => teachers.find(t => t.id === teacherId)?.name || 'N/A';

    if (!student) return <div className="p-4 text-center">Cargando horario...</div>;

    const todayStr = new Date().toDateString();

    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                    Mi Horario Escolar
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Consulta tus clases y actividades programadas para la semana.</p>
            </header>

            <Card className="overflow-hidden flex flex-col p-0 border-none shadow-soft">
                <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-600 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6"/>
                        Agenda Semanal
                    </h3>
                    <div className="bg-white/20 px-4 py-1.5 rounded-2xl backdrop-blur-md border border-white/10 text-xs font-black uppercase tracking-widest">
                        Lunes - Sábado
                    </div>
                </div>
                
                {/* Cinta Horizontal / Carrusel */}
                <div className="p-6 bg-white dark:bg-slate-900">
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x custom-scrollbar">
                        {weekDates.map(dayDate => {
                            const dateString = dayDate.toDateString();
                            const isToday = dateString === todayStr;
                            const dayOfWeekIndex = dayDate.getDay();
                            
                            // Filtrar clases para este día de la semana
                            const daySchedules = schedules
                                .filter(s => s.dayOfWeek === dayOfWeekIndex)
                                .sort((a, b) => a.startTime.localeCompare(b.startTime));

                            // Filtrar exámenes
                            const dayExams = exams
                                .filter(e => e.startDate === dayDate.toISOString().split('T')[0] && e.status === 'Programado');

                            return (
                                <div 
                                    key={dateString} 
                                    className={`min-w-[240px] flex-shrink-0 snap-start rounded-2xl p-5 transition-all border ${
                                        isToday 
                                            ? 'bg-primary/5 border-primary shadow-lg ring-1 ring-primary/20' 
                                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-5">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-tighter ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                                                {dayDate.toLocaleDateString('es-ES', { weekday: 'long' })}
                                            </p>
                                            <p className={`text-xl font-black leading-none mt-0.5 ${isToday ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                {dayDate.getDate()}
                                            </p>
                                        </div>
                                        {isToday && (
                                            <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-primary/30">HOY</span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {daySchedules.length > 0 || dayExams.length > 0 ? (
                                            <>
                                                {daySchedules.map(s => (
                                                    <div key={s.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-primary/30 transition-colors">
                                                        <p className="text-[10px] font-bold text-primary dark:text-sky-400 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                                            {s.startTime} - {s.endTime}
                                                        </p>
                                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 truncate">
                                                            {s.subject}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5 truncate">
                                                            Prof. {getTeacherName(s.teacherId)}
                                                        </p>
                                                    </div>
                                                ))}
                                                {dayExams.map(e => (
                                                    <div key={e.id} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 shadow-sm">
                                                        <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Examen</p>
                                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 line-clamp-2">
                                                            {e.title}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-amber-600/70 mt-0.5">
                                                            {e.subject}
                                                        </p>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="py-10 flex flex-col items-center justify-center opacity-30">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-2">
                                                    <CalendarIcon className="w-5 h-5 text-slate-400" />
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Día Libre</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default StudentSchedulePage;
