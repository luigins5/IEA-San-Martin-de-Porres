import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Student } from '../../types';
import Card from '../ui/Card';
import { useData } from '../../context/DataContext';

const ProfileField: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row justify-between py-2.5 border-b dark:border-slate-700 text-sm">
        <span className="font-semibold text-text-secondary dark:text-slate-400">{label}</span>
        <span className="text-text-primary font-medium text-left sm:text-right dark:text-slate-200">{value || '-'}</span>
    </div>
);

const ParentProfilePage: React.FC = () => {
    const { user } = useAuth();
    const { students } = useData();
    const [student, setStudent] = useState<Student | null>(null);

    useEffect(() => {
        if (user && (user as any).studentId) {
            const found = students.find(s => s.id === (user as any).studentId);
            setStudent(found || null);
        }
    }, [user, students]);

    if (!student) {
        return <Card><p>Cargando perfil del estudiante...</p></Card>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 text-text-primary dark:text-white">Perfil del Estudiante</h1>
            <Card>
                <div className="flex flex-col md:flex-row items-center gap-6 p-4">
                    <img src={student.avatar} alt="Foto de perfil" className="w-28 h-28 rounded-full object-cover shadow-lg" />
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold text-text-primary dark:text-white">{student.name}</h2>
                        <p className="text-sm text-text-secondary dark:text-slate-400">{student.email}</p>
                        <span className="mt-2 inline-block bg-primary/10 text-primary font-semibold px-3 py-1 rounded-full text-sm dark:bg-primary/20 dark:text-sky-400">Estudiante</span>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                    <ProfileField label="Nombre Completo" value={student.name} />
                    <ProfileField label="Número de Matrícula" value={student.rollNumber} />
                    <ProfileField label="Número de Documento" value={student.documentNumber} />
                    <ProfileField label="Clase" value={`${student.class} - Sección '${student.section}'`} />
                    <ProfileField label="Sede" value={student.campusName} />
                    <ProfileField label="Año de Ingreso" value={student.schoolYear} />
                    <ProfileField label="Periodo de Ingreso" value={student.schoolPeriod} />
                     <ProfileField label="Estado" value={student.status === 'active' ? 'Activo' : 'Inactivo'} />
                </div>
            </Card>
        </div>
    );
};

export default ParentProfilePage;