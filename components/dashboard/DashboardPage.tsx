
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Communication, Campus, AdminUser, Student, Teacher, AttendanceRecord, SchoolEvent, Exam } from '../../types';
import StatCard from './StatCard';
import { StudentsIcon, StaffIcon, FeesIcon, ExamsIcon, DocumentTextIcon, PdfIcon, WordIcon, DownloadIcon, BuildingOfficeIcon, MegaphoneIcon, ShieldCheckIcon, IdentificationIcon, CalendarIcon, AcademicCapIcon } from '../icons';
import Card from '../ui/Card';
import StudentDashboard from '../students/StudentDashboard';
import ParentDashboard from '../parents/ParentDashboard';
import { useData } from '../../context/DataContext';

const iconForFileType = (type: string) => {
    const className = "w-8 h-8 flex-shrink-0";
    if (type.includes('pdf')) return <PdfIcon className={`${className} text-red-600`} />;
    if (type.includes('word')) return <WordIcon className={`${className} text-blue-600`} />;
    return <DocumentTextIcon className={`${className} text-gray-500`} />;
};

export const UpcomingEventsCard: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { user } = useAuth();
    const { events: allEvents, admins, teachers, students } = useData();
    
    const upcomingEvents = useMemo(() => {
        if (!user) return [];
        
        let campusId = user.campusId;
        if (!campusId) {
            if (user.role === UserRole.CAMPUS_ADMIN || user.role === UserRole.SUPER_ADMIN) {
                campusId = admins.find(a => a.email === user.email)?.campusId;
            } else if (user.role === UserRole.TEACHER) {
                campusId = teachers.find(t => t.email === user.email)?.campusId;
            } else if (user.role === UserRole.STUDENT) {
                campusId = students.find(s => s.email === user.email)?.campusId;
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return allEvents
            .filter(evt => {
                // Parse date string manually to avoid timezone shift
                const [year, month, day] = evt.date.split('-').map(Number);
                const evtDate = new Date(year, month - 1, day);
                evtDate.setHours(0, 0, 0, 0);
                const isFuture = evtDate >= today;
                const campusMatch = user.role === UserRole.SUPER_ADMIN || !evt.campusId || evt.campusId === campusId;
                return isFuture && campusMatch;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 4);
    }, [user, allEvents, admins, teachers, students]);

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-full ${className}`}>
            <div className="p-4 bg-primary text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5"/>
                    Próximos Eventos
                </h3>
            </div>
            <div className="p-4 space-y-4 flex-grow">
                {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((evt) => {
                        const [year, month, day] = evt.date.split('-').map(Number);
                        const dateObj = new Date(year, month - 1, day);
                        return (
                            <div key={evt.id} className="flex items-center gap-4 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                <div className="flex-shrink-0 w-12 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800 flex flex-col items-center justify-center overflow-hidden">
                                    <span className="text-[9px] font-black uppercase text-indigo-400 bg-white dark:bg-indigo-950 w-full text-center py-0.5 border-b border-indigo-100 dark:border-indigo-800">
                                        {dateObj.toLocaleString('es-ES', { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none mt-1">
                                        {dateObj.getDate()}
                                    </span>
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{evt.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{evt.description || 'Sin descripción adicional'}</p>
                                </div>
                                {evt.fileUrl && (
                                    <a href={evt.fileUrl} download={evt.fileName} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-full transition-all" title="Descargar adjunto">
                                        <DownloadIcon className="w-4 h-4"/>
                                    </a>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 min-h-[150px] text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                            <CalendarIcon className="w-6 h-6 stroke-1" />
                        </div>
                        <p className="text-sm font-medium">No hay eventos programados próximamente.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const RecentCommunications: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { user } = useAuth();
    const { communications: allComms, admins, teachers, students } = useData();
    const [communications, setCommunications] = useState<Communication[]>([]);

    useEffect(() => {
        if (!user) return;
        
        let campusId = user.campusId;
        if (!campusId) {
            if (user.role === UserRole.CAMPUS_ADMIN || user.role === UserRole.SUPER_ADMIN) {
                campusId = admins.find(a => a.email === user.email)?.campusId;
            } else if (user.role === UserRole.TEACHER) {
                campusId = teachers.find(t => t.email === user.email)?.campusId;
            } else if (user.role === UserRole.STUDENT) {
                campusId = students.find(s => s.email === user.email)?.campusId;
            }
        }

        const filteredComms = allComms.filter(comm => {
            const campusMatch = user.role === UserRole.SUPER_ADMIN || !comm.campusId || comm.campusId === campusId;
            if (!campusMatch) return false;
            if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.CAMPUS_ADMIN) return true;
            return !comm.targetRoles || comm.targetRoles.length === 0 || comm.targetRoles.includes(user.role);
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
        setCommunications(filteredComms);
    }, [user, allComms, admins, teachers, students]);

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-full ${className}`}>
            <div className="p-4 bg-primary text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <MegaphoneIcon className="w-5 h-5"/>
                    Comunicaciones Recientes
                </h3>
            </div>
            <div className="p-4 space-y-3 flex-grow">
                {communications.length > 0 ? (
                    communications.map((comm) => (
                        <div key={comm.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-slate-700 transition-colors">
                            {iconForFileType(comm.fileType)}
                            <div className="flex-grow min-w-0">
                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{comm.title}</p>
                                <p className="text-xs text-gray-500 truncate">{comm.description}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(comm.date).toLocaleDateString()}</p>
                            </div>
                            <a href={comm.fileUrl} download={comm.fileName} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-full dark:hover:bg-slate-600">
                                <DownloadIcon className="w-4 h-4"/>
                            </a>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 min-h-[150px]">
                        <MegaphoneIcon className="w-12 h-12 mb-2 stroke-1" />
                        <p className="text-sm">No hay comunicaciones recientes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SuperAdminDashboard: React.FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => {
    const { campuses, admins, students, teachers } = useData();
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<BuildingOfficeIcon />} title="Total Sedes" value={String(campuses.length)} color="#3B82F6" onClick={() => setCurrentPage('campuses')} />
                <StatCard icon={<ShieldCheckIcon />} title="Administradores" value={String(admins.length)} color="#10B981" onClick={() => setCurrentPage('admins')} />
                <StatCard icon={<AcademicCapIcon />} title="Estudiantes" value={students.length.toLocaleString('es-ES')} color="#F97316" onClick={() => setCurrentPage('students')} />
                <StatCard icon={<IdentificationIcon />} title="Profesores" value={String(teachers.length)} color="#8B5CF6" onClick={() => setCurrentPage('teachers')} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentCommunications />
                </div>
                <div>
                    <UpcomingEventsCard />
                </div>
            </div>
        </div>
    );
};

const CampusAdminDashboard: React.FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => {
    const { user } = useAuth();
    const { students, teachers, exams, admins } = useData();
    const [stats, setStats] = useState({ students: 0, staff: 0, upcomingExams: 0 });

    useEffect(() => {
        const adminRecord = admins.find(a => a.email === user?.email);
        const campusId = adminRecord?.campusId || user?.campusId;
        
        if (!campusId) return;
        
        const today = new Date().toISOString().split('T')[0];
        const campusUpcomingExams = exams.filter(e => e.campusId === campusId && e.status === 'Programado' && e.startDate >= today);
        const campusStudents = students.filter(s => s.campusId === campusId);
        const campusTeachers = teachers.filter(t => t.campusId === campusId);

        setStats({ students: campusStudents.length, staff: campusTeachers.length, upcomingExams: campusUpcomingExams.length });
    }, [user, admins, students, teachers, exams]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={<AcademicCapIcon />} title={`Estudiantes`} value={stats.students.toLocaleString('es-ES')} color="#3B82F6" onClick={() => setCurrentPage('students')} />
                <StatCard icon={<StaffIcon />} title={`Profesores`} value={String(stats.staff)} color="#10B981" onClick={() => setCurrentPage('teachers')} />
                <StatCard icon={<ExamsIcon />} title="Exámenes" value={String(stats.upcomingExams)} color="#F97316" onClick={() => setCurrentPage('exams')} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentCommunications />
                </div>
                <div>
                    <UpcomingEventsCard />
                </div>
            </div>
        </div>
    );
};

const TeacherDashboard: React.FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => {
    const { user } = useAuth();
    const { schedules, communications, exams, teachers } = useData();
    
    const [mySchedules, setMySchedules] = useState<any[]>([]);
    const [currentClassId, setCurrentClassId] = useState<string | null>(null);
    const [latestAnnouncement, setLatestAnnouncement] = useState<Communication | null>(null);
    const [myExams, setMyExams] = useState<Exam[]>([]);
    const [teacher, setTeacher] = useState<Teacher | null>(null);

    useEffect(() => {
        if (user) {
            const currentTeacher = teachers.find(t => t.email === user.email);
            const teacherId = currentTeacher?.id || user.id;
            setTeacher(currentTeacher || null);
            const teacherSchedules = schedules.filter(s => s.teacherId === teacherId);
            setMySchedules(teacherSchedules);
            const latest = communications.filter(c => !c.campusId || c.campusId === user.campusId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            setLatestAnnouncement(latest || null);
            if (currentTeacher) {
                const teacherExams = exams.filter(ex => ex.campusId === currentTeacher.campusId && (ex.teacherId === teacherId || !ex.teacherId));
                setMyExams(teacherExams);
            }
        }
    }, [user, teachers, schedules, communications, exams]);

    useEffect(() => {
        const checkCurrentClass = () => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const activeClass = mySchedules.find(schedule => schedule.dayOfWeek === dayOfWeek && currentTime >= schedule.startTime && currentTime < schedule.endTime);
            setCurrentClassId(activeClass ? activeClass.id : null);
        };
        checkCurrentClass();
        const intervalId = setInterval(checkCurrentClass, 60000);
        return () => clearInterval(intervalId);
    }, [mySchedules]);

    const findNextClass = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const upcomingToday = mySchedules.filter(s => s.dayOfWeek === dayOfWeek && s.startTime > currentTime).sort((a, b) => a.startTime.localeCompare(b.startTime));
        if (upcomingToday.length > 0) return { classInfo: upcomingToday[0], day: 'Hoy' };
        for (let i = 1; i <= 7; i++) {
            const nextDayIndex = (dayOfWeek + i) % 7;
            const upcomingNextDay = mySchedules.filter(s => s.dayOfWeek === nextDayIndex).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (upcomingNextDay.length > 0) {
                const nextDate = new Date();
                nextDate.setDate(now.getDate() + i);
                return { classInfo: upcomingNextDay[0], day: nextDate.toLocaleDateString('es-ES', { weekday: 'long' }) };
            }
        }
        return null;
    };
    
    const today = new Date();
    const currentDayIdx = today.getDay();
    const diff = today.getDate() - currentDayIdx + (currentDayIdx === 0 ? -6 : 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(diff);

    const weekDates = Array.from({ length: 6 }).map((_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
    });

    const nextClass = findNextClass();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={<IdentificationIcon />} title="Mis Asignaturas" value={String(mySchedules.length)} color="#3B82F6" onClick={() => setCurrentPage('schedule')} />
                <StatCard icon={<ExamsIcon />} title="Actividades Pendientes" value={String(myExams.length)} color="#F97316" onClick={() => setCurrentPage('teacher-exams')} />
                <StatCard icon={<CalendarIcon />} title="Próxima Clase" value={nextClass ? `${nextClass.classInfo.subject} (${nextClass.day})` : 'Sin clases'} color="#10B981" onClick={() => setCurrentPage('schedule')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Horario Semanal</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Lunes a Sábado</span>
                    </div>
                    
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x custom-scrollbar">
                        {weekDates.map(date => {
                            const isToday = date.toDateString() === today.toDateString();
                            const daySchedules = mySchedules
                                .filter(s => s.dayOfWeek === date.getDay())
                                .sort((a, b) => a.startTime.localeCompare(b.startTime));

                            return (
                                <div 
                                    key={date.toString()} 
                                    className={`min-w-[220px] flex-shrink-0 snap-start rounded-2xl p-4 transition-all border ${
                                        isToday 
                                            ? 'bg-primary/5 border-primary shadow-md ring-1 ring-primary/20' 
                                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-tighter ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                                                {date.toLocaleDateString('es-ES', { weekday: 'long' })}
                                            </p>
                                            <p className={`text-lg font-black leading-none mt-0.5 ${isToday ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                {date.getDate()}
                                            </p>
                                        </div>
                                        {isToday && (
                                            <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">HOY</span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {daySchedules.length > 0 ? (
                                            daySchedules.map(s => (
                                                <div key={s.id} className={`p-2.5 rounded-xl border border-white/50 dark:border-slate-700/50 shadow-sm ${currentClassId === s.id ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800'}`}>
                                                    <p className={`text-[10px] font-bold ${currentClassId === s.id ? 'text-blue-100' : 'text-primary dark:text-sky-400'}`}>
                                                        {s.startTime} - {s.endTime}
                                                    </p>
                                                    <p className={`text-xs font-black truncate mt-0.5 ${currentClassId === s.id ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                                        {s.subject}
                                                    </p>
                                                    <p className={`text-[9px] font-bold mt-0.5 opacity-70 ${currentClassId === s.id ? 'text-blue-50' : 'text-slate-500'}`}>
                                                        Grupo {s.class}-{s.section}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-8 flex flex-col items-center justify-center opacity-30">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-1">
                                                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400">Sin clases</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
                
                <div className="space-y-6">
                    <UpcomingEventsCard />
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
                <RecentCommunications />
            </div>
        </div>
    );
};

interface DashboardPageProps {
    setCurrentPage?: (page: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ setCurrentPage }) => {
    const { user } = useAuth();

    const renderDashboard = () => {
        switch (user?.role) {
            case UserRole.SUPER_ADMIN: return <SuperAdminDashboard setCurrentPage={setCurrentPage || (() => {})} />;
            case UserRole.CAMPUS_ADMIN: return <CampusAdminDashboard setCurrentPage={setCurrentPage || (() => {})} />;
            case UserRole.TEACHER: return <TeacherDashboard setCurrentPage={setCurrentPage || (() => {})} />;
            case UserRole.STUDENT: return <StudentDashboard setCurrentPage={setCurrentPage || (() => {})} />;
            case UserRole.PARENT: return <ParentDashboard setCurrentPage={setCurrentPage || (() => {})} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Resumen de actividad y acceso rápido.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                        {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                </div>
            </header>

            {renderDashboard()}

            {user?.role !== UserRole.TEACHER && user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.CAMPUS_ADMIN && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-2">
                        <RecentCommunications />
                    </div>
                    <div className="space-y-6">
                        <UpcomingEventsCard />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
