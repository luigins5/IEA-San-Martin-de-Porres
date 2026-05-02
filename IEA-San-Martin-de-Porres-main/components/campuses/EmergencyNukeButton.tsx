import React, { useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { TrashIcon } from '../icons';

interface Props {
    campusId: string;
    campusName: string;
    onSuccess?: () => void;
}

const EmergencyNukeButton: React.FC<Props> = ({ campusId, campusName, onSuccess }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleNuke = async () => {
        setIsProcessing(true);
        setStatus("Iniciando borrado en cascada...");
        
        try {
            const campusRef = doc(db, 'campuses', campusId);
            
            setStatus(`Buscando estudiantes de ${campusName}...`);
            
            // 2. Fetch students
            const stQuery = query(collection(db, 'students'), where('campusId', '==', campusId));
            const stSnap = await getDocs(stQuery);
            const studentIds = stSnap.docs.map(d => d.id);
            
            // Delete Grades and Attendance for these students
            setStatus(`Borrando notas y asistencias de ${studentIds.length} estudiantes... esto tomará unos segundos.`);
            for (const sId of studentIds) {
                const gQuery = query(collection(db, 'grades'), where('studentId', '==', sId));
                const gSnap = await getDocs(gQuery);
                for (const gDoc of gSnap.docs) await deleteDoc(gDoc.ref);
                
                const aQuery = query(collection(db, 'attendance'), where('studentId', '==', sId));
                const aSnap = await getDocs(aQuery);
                for (const aDoc of aSnap.docs) await deleteDoc(aDoc.ref);
                
                // delete student itself
                await deleteDoc(doc(db, 'students', sId));
            }
            
            // 3. Delete teachers & their assignments & schedules
            setStatus(`Borrando profesores, exámenes y horarios asignados...`);
            const tQuery = query(collection(db, 'teachers'), where('campusId', '==', campusId));
            const tSnap = await getDocs(tQuery);
            for (const tDoc of tSnap.docs) {
                const tId = tDoc.id;
                
                const asQuery = query(collection(db, 'assignments'), where('teacherId', '==', tId));
                const asSnap = await getDocs(asQuery);
                for (const asDoc of asSnap.docs) await deleteDoc(asDoc.ref);
                
                const schQuery = query(collection(db, 'schedules'), where('teacherId', '==', tId));
                const schSnap = await getDocs(schQuery);
                for (const schDoc of schSnap.docs) await deleteDoc(schDoc.ref);
                
                const exQuery = query(collection(db, 'exams'), where('teacherId', '==', tId));
                const exSnap = await getDocs(exQuery);
                for (const exDoc of exSnap.docs) await deleteDoc(exDoc.ref);
                
                await deleteDoc(tDoc.ref);
            }
            
            // 4. Delete admins
            setStatus(`Borrando administradores de esta sede...`);
            const aQuery = query(collection(db, 'admins'), where('campusId', '==', campusId));
            const aSnap = await getDocs(aQuery);
            for (const adDoc of aSnap.docs) await deleteDoc(adDoc.ref);
            
            // 5. Delete communications related to campus
            setStatus(`Borrando comunicaciones y circulares locales...`);
            const cQuery = query(collection(db, 'communications'), where('campusId', '==', campusId));
            const cSnap = await getDocs(cQuery);
            for (const cDoc of cSnap.docs) await deleteDoc(cDoc.ref);
            
            // 6. Delete events related to campus
            const evQuery = query(collection(db, 'events'), where('campusId', '==', campusId));
            const evSnap = await getDocs(evQuery);
            for (const evDoc of evSnap.docs) await deleteDoc(evDoc.ref);

            const exCampQuery = query(collection(db, 'exams'), where('campusId', '==', campusId));
            const exCampSnap = await getDocs(exCampQuery);
            for (const exDoc of exCampSnap.docs) await deleteDoc(exDoc.ref);
            
            // 8. Delete the campus itself
            setStatus(`Realizando borrado final del registro de la sede...`);
            await deleteDoc(campusRef);
            
            // 9. Clear local cache
            localStorage.removeItem('school_campuses');
            localStorage.removeItem('school_students');
            localStorage.removeItem('school_teachers');
            localStorage.removeItem('school_admins');
            
            setStatus(`✅ ¡Completado! Toda la información de la sede ha sido borrada exitosamente.`);
            if (onSuccess) onSuccess();
            
        } catch (error: any) {
            setStatus(`❌ Error: ${error.message}`);
        }
        setIsProcessing(false);
    };

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                title={`Eliminar Sede ${campusName}`}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 text-xs rounded-lg shadow-sm border border-red-800 transition-all flex items-center justify-center whitespace-nowrap"
            >
                ⚠️ DESTRUIR SEDE
            </button>
            
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-center border dark:border-slate-800">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            ⚠️
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">¡ADVERTENCIA DE SEGURIDAD!</h2>
                        <p className="text-slate-700 dark:text-slate-300 font-medium mb-4">
                            Estás a punto de borrar <strong className="text-red-500">definitiva e irreversiblemente</strong> la sede:
                            <br/><span className="text-lg font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg mt-3 inline-block">{campusName}</span>
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 px-4">
                            Esta acción ejecutará un borrado en cascada. Se eliminarán permanentemente:
                            <br/>• Todos los <b>estudiantes</b> de esta sede y su historial.
                            <br/>• Todas las <b>notas y asistencias</b> asignadas a esos estudiantes.
                            <br/>• Todos los <b>profesores</b> de esta sede, junto con sus horarios y asignaciones.
                            <br/>• Directivos (Administradores) de la sede.
                            <br/>• Circulares, mensajes y eventos propios de la sede.
                        </p>
                        
                        {status && (
                            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 p-4 rounded-xl mb-6 text-sm text-left max-h-40 overflow-y-auto">
                                <span className="font-mono whitespace-pre-wrap">{status}</span>
                            </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                            <button 
                                onClick={() => setIsOpen(false)}
                                disabled={isProcessing}
                                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 transition"
                            >
                                Cancelar y salir
                            </button>
                            <button 
                                onClick={handleNuke}
                                disabled={isProcessing || status.includes('✅')}
                                className="px-5 py-2.5 bg-red-600 outline-none focus:ring-4 focus:ring-red-500/20 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition"
                            >
                                {isProcessing ? 'Borrando...' : 'Sí, destruir todo ahora'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EmergencyNukeButton;
