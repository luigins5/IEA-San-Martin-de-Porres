import React, { useMemo, useState } from 'react';
import { AuditLog } from '../../utils/audit';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import Card from '../ui/Card';
import { useData } from '../../context/DataContext';
import { UserRole } from '../../types';

interface AuditMetricsProps {
    logs: AuditLog[];
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'];

const AuditMetricsDashboard: React.FC<AuditMetricsProps> = ({ logs }) => {
    const { students, teachers, admins, campuses } = useData();

    const [filterCampus, setFilterCampus] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterAction, setFilterAction] = useState('');
    
    // Map user to campus id
    const userToCampusMap = useMemo(() => {
        const map: Record<string, string> = {};
        students.forEach(s => map[s.id] = s.campusId || '');
        teachers.forEach(t => map[t.id] = t.campusId || '');
        admins.forEach(a => map[a.id] = a.campusId || '');
        return map;
    }, [students, teachers, admins]);

    const filteredLogs = useMemo(() => {
        let l = logs;
        if (filterCampus) {
            l = l.filter(log => userToCampusMap[log.userId] === filterCampus);
        }
        if (filterRole) {
            l = l.filter(log => log.userRole === filterRole);
        }
        if (filterAction) {
            l = l.filter(log => log.action === filterAction);
        }
        return l;
    }, [logs, filterCampus, filterRole, filterAction, userToCampusMap]);

    const metricsData = useMemo(() => {
        const actionCounts: Record<string, number> = {};
        const roleCounts: Record<string, number> = {};
        const dateCounts: Record<string, number> = {};
        const userCounts: Record<string, number> = {};

        filteredLogs.forEach(log => {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
            roleCounts[log.userRole] = (roleCounts[log.userRole] || 0) + 1;
            
            const dateOnly = new Date(log.timestamp).toLocaleDateString('es-ES');
            dateCounts[dateOnly] = (dateCounts[dateOnly] || 0) + 1;
            
            userCounts[log.userName] = (userCounts[log.userName] || 0) + 1;
        });

        const actionData = Object.keys(actionCounts).map(k => ({ name: k, value: actionCounts[k] }))
                                        .sort((a,b) => b.value - a.value);
        const roleData = Object.keys(roleCounts).map(k => ({ name: k, value: roleCounts[k] }))
                                        .sort((a,b) => b.value - a.value);
        
        // Sorting dates
        const dateData = Object.keys(dateCounts).map(k => ({ date: k, count: dateCounts[k] }))
            .sort((a,b) => {
                const partsA = a.date.split('/');
                const partsB = b.date.split('/');
                if(partsA.length < 3 || partsB.length < 3) return 0;
                return new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`).getTime() - new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`).getTime();
            });
        
        const topUsersData = Object.keys(userCounts).map(k => ({ userName: k, count: userCounts[k] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // top 10

        return { actionData, roleData, dateData, topUsersData, totalEvents: filteredLogs.length };
    }, [filteredLogs]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <Card className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Sede</label>
                        <select 
                            value={filterCampus} 
                            onChange={e => setFilterCampus(e.target.value)} 
                            className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Todas las Sedes</option>
                            {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Rol</label>
                        <select 
                            value={filterRole} 
                            onChange={e => setFilterRole(e.target.value)} 
                            className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Todos los Roles</option>
                            {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Acción</label>
                        <select 
                            value={filterAction} 
                            onChange={e => setFilterAction(e.target.value)} 
                            className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Todas las Acciones</option>
                            <option value="LOGIN">INICIO DE SESIÓN</option>
                            <option value="CREATE">CREACIÓN</option>
                            <option value="UPDATE">ACTUALIZACIÓN</option>
                            <option value="DELETE">ELIMINACIÓN</option>
                            <option value="OTHER">OTROS</option>
                        </select>
                    </div>

                    <button 
                        onClick={() => { setFilterCampus(''); setFilterRole(''); setFilterAction(''); }}
                        className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </Card>

            {metricsData.totalEvents === 0 ? (
                <div className="text-center py-10 text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p>No hay datos disponibles para los filtros seleccionados.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Acciones por Tipo de Evento</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={metricsData.actionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {metricsData.actionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Eventos por Rol de Usuario</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={metricsData.roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {metricsData.roleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="lg:col-span-2">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Tendencia de Actividad de Usuarios (Eventos en el tiempo)</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metricsData.dateData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <RechartsTooltip formatter={(value) => [`${value} Eventos`, 'Cantidad']} />
                                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} name="Eventos Totales" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="lg:col-span-2">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Top 10 Usuarios Más Activos de la Plataforma</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metricsData.topUsersData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="userName" type="category" width={180} tick={{fontSize: 11}} />
                                    <RechartsTooltip formatter={(value) => [`${value} acciones`, 'Total']} />
                                    <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} name="Eventos Registrados" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AuditMetricsDashboard;
