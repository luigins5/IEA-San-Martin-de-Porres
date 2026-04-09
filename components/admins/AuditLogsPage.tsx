import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import Card from '../ui/Card';
import { AuditLog } from '../../utils/audit';
import { DocumentTextIcon } from '../icons';

const AuditLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'audit_logs'), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const auditLogs: AuditLog[] = [];
            snapshot.forEach((doc) => {
                auditLogs.push({ id: doc.id, ...doc.data() } as AuditLog);
            });
            auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setLogs(auditLogs);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching audit logs:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-primary" />
                        Registro de Auditoría
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Historial de acciones realizadas en el sistema.</p>
                </div>
            </header>

            <Card>
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Fecha y Hora</th>
                                    <th className="px-6 py-4 font-bold">Usuario</th>
                                    <th className="px-6 py-4 font-bold">Rol</th>
                                    <th className="px-6 py-4 font-bold">Acción</th>
                                    <th className="px-6 py-4 font-bold">Detalles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {logs.map((log) => (
                                    <tr key={log.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString('es-ES')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {log.userName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium">
                                                {log.userRole}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                                log.action === 'LOGIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                log.action === 'DELETE' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                                            No hay registros de auditoría disponibles.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AuditLogsPage;
