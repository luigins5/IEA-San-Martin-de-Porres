
import React, { useState, useEffect } from 'react';
import { Exam } from '../../types';
import Card from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { PlusIcon, EditIcon, TrashIcon } from '../icons';
import { useData } from '../../context/DataContext';

const CRITERIA_OPTIONS = [
    'Examen',
    'Trabajo individual',
    'Trabajo en grupo',
    'Exposición',
    'Otro'
];

const ExamFormModal: React.FC<{
    onClose: () => void;
    onSave: (exam: Omit<Exam, 'id' | 'campusId' | 'status' | 'teacherId'>) => void;
    examToEdit: Exam | null;
    numberOfPeriods: number;
}> = ({ onClose, onSave, examToEdit, numberOfPeriods }) => {
    const isEditing = !!examToEdit;
    const [selectedCriteria, setSelectedCriteria] = useState(CRITERIA_OPTIONS[0]);
    const [customTitle, setCustomTitle] = useState('');
    
    const [formData, setFormData] = useState({
        title: examToEdit?.title || CRITERIA_OPTIONS[0],
        startDate: examToEdit?.startDate || '',
        endDate: examToEdit?.endDate || '',
        schoolYear: examToEdit?.schoolYear || new Date().getFullYear(),
        schoolPeriod: examToEdit?.schoolPeriod || '1',
        maxScore: examToEdit?.maxScore || 5.0,
    });

    useEffect(() => {
        if (examToEdit) {
            if (CRITERIA_OPTIONS.includes(examToEdit.title)) {
                setSelectedCriteria(examToEdit.title);
                setCustomTitle('');
            } else {
                setSelectedCriteria('Otro');
                setCustomTitle(examToEdit.title);
            }
        }
    }, [examToEdit]);

    useEffect(() => {
        if (selectedCriteria === 'Otro') {
            setFormData(prev => ({ ...prev, title: customTitle }));
        } else {
            setFormData(prev => ({ ...prev, title: selectedCriteria }));
        }
    }, [selectedCriteria, customTitle]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 5 - i);
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6 dark:text-white">{isEditing ? 'Editar Actividad' : 'Programar Nueva Actividad'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2 dark:text-gray-300">Criterio / Actividad</label>
                        <select 
                            value={selectedCriteria} 
                            onChange={(e) => setSelectedCriteria(e.target.value)} 
                            className="w-full p-2 border rounded bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600 mb-2"
                        >
                            {CRITERIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        {selectedCriteria === 'Otro' && (
                            <input 
                                type="text" 
                                placeholder="Especifique el nombre de la actividad"
                                value={customTitle} 
                                onChange={(e) => setCustomTitle(e.target.value)} 
                                className="w-full p-2 border rounded bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white dark:border-gray-600 animate-fade-in-up" 
                                required 
                            />
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 dark:text-gray-300">Año Académico</label>
                            <select name="schoolYear" value={formData.schoolYear} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600" required>
                                {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-bold mb-2 dark:text-gray-300">Periodo</label>
                            <select name="schoolPeriod" value={formData.schoolPeriod} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600" required>
                                {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map(p => (
                                    <option key={p} value={p}>P{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold mb-2 dark:text-gray-300">Fecha Inicial</label>
                            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 dark:text-gray-300">Fecha Final</label>
                            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 dark:text-gray-300">Puntaje Máximo</label>
                        <input type="number" name="maxScore" value={formData.maxScore} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600" required min="0.1" step="0.1" max="5.0" />
                    </div>
                    <div className="flex justify-end space-x-4 mt-6 pt-4 border-t dark:border-gray-600">
                        <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200">Cancelar</button>
                        <button type="submit" className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">{isEditing ? 'Guardar Cambios' : 'Programar'}</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


const DeleteConfirmationModal: React.FC<{
    exam: Exam;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ exam, onClose, onConfirm }) => {
     return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-md">
                <h2 className="text-xl font-bold text-text-primary mb-4 dark:text-white">Confirmar Eliminación</h2>
                <p className="text-text-secondary mb-6 dark:text-gray-300">
                    ¿Está seguro de que desea eliminar la actividad <span className="font-bold">{exam.title}</span>?
                </p>
                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200">Cancelar</button>
                    <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">Eliminar</button>
                </div>
            </Card>
        </div>
    );
};


const ExamsManagementPage: React.FC = () => {
    const { user } = useAuth();
    const { exams, addExam, updateExam, deleteExam, globalSettings, campusSettings } = useData();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [deletingExam, setDeletingExam] = useState<Exam | null>(null);
    const [numberOfPeriods, setNumberOfPeriods] = useState(4);

    useEffect(() => {
        let settings: any = null;
        if (globalSettings) settings = { ...globalSettings };
        
        if (user?.campusId && campusSettings) {
            settings = { ...settings, ...campusSettings };
        }
        if (settings && settings.numberOfPeriods) setNumberOfPeriods(settings.numberOfPeriods);
    }, [user, globalSettings, campusSettings]);

    const handleSave = async (examData: Omit<Exam, 'id' | 'campusId' | 'status' | 'teacherId'>) => {
        try {
            if (editingExam) {
                await updateExam(editingExam.id, examData);
            } else {
                const newExamData = {
                    ...examData,
                    status: 'Programado' as Exam['status'],
                    campusId: user?.campusId || '',
                };
                await addExam(newExamData);
            }
        } catch (error) {
            console.error("Failed to save exam:", error);
        }
        setIsModalOpen(false);
        setEditingExam(null);
    };

    const handleDelete = async () => {
        if (deletingExam) {
            try {
                await deleteExam(deletingExam.id);
            } catch (error) {
                console.error("Failed to delete exam:", error);
            }
            setDeletingExam(null);
        }
    };
    
    const examsForView = exams.filter(ex => ex.campusId === user?.campusId);
    
    const getStatusBadge = (status: Exam['status']) => {
        switch (status) {
            case 'Programado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case 'Completado': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'Cancelado': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        }
    };

    return (
        <>
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-text-primary dark:text-white">Gestión de Criterios y Actividades</h2>
                    <button onClick={() => { setEditingExam(null); setIsModalOpen(true); }} className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300 flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/> Programar Actividad
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Criterio/Actividad</th>
                                <th scope="col" className="px-6 py-3">Periodo</th>
                                <th scope="col" className="px-6 py-3">Fecha de Inicio</th>
                                <th scope="col" className="px-6 py-3">Fecha de Fin</th>
                                <th scope="col" className="px-6 py-3">Estado</th>
                                <th scope="col" className="px-6 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {examsForView.map(exam => (
                                <tr key={exam.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{exam.title}</td>
                                    <td className="px-6 py-4">{exam.schoolYear}-P{exam.schoolPeriod}</td>
                                    <td className="px-6 py-4">{exam.startDate}</td>
                                    <td className="px-6 py-4">{exam.endDate}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(exam.status)}`}>
                                            {exam.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center space-x-2">
                                        <button onClick={() => { setEditingExam(exam); setIsModalOpen(true); }} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-yellow-600 dark:text-yellow-400 transition-colors focus:outline-none shadow-sm" title="Editar"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => setDeletingExam(exam)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-red-600 dark:text-red-400 transition-colors focus:outline-none shadow-sm" title="Eliminar"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                            {examsForView.length === 0 && (
                                <tr><td colSpan={6} className="text-center p-4 text-text-secondary">No se encontraron actividades.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && <ExamFormModal onClose={() => { setIsModalOpen(false); setEditingExam(null); }} onSave={handleSave} examToEdit={editingExam} numberOfPeriods={numberOfPeriods} />}
            {deletingExam && <DeleteConfirmationModal exam={deletingExam} onClose={() => setDeletingExam(null)} onConfirm={handleDelete} />}
        </>
    );
};
export default ExamsManagementPage;
