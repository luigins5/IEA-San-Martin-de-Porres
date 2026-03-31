
import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { InformationCircleIcon, AcademicCapIcon, PaintBrushIcon, ExclamationTriangleIcon, UploadIcon, CalendarIcon, CheckIcon } from '../icons';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Campus } from '../../types';
import { useData } from '../../context/DataContext';

// Define the type for our settings
interface GlobalSettings {
    schoolName: string;
    schoolLogo: string; // data URL
    rector: string;
    secretary: string;
    address: string;
    city: string;
    contactEmail: string;
    contactPhone: string;
    schoolPeriod: 'A' | 'B';
    schoolDay: number;
    schoolMonth: number;
    schoolYear: number;
    primaryColor: string;
    secondaryColor: string;
    maintenanceMode: boolean;
    numberOfPeriods: number;
    periodDates?: { startDate: string; endDate: string; }[];
}

// Initial default settings
const defaultSettings: GlobalSettings = {
    schoolName: 'Colegio Vanguardia',
    schoolLogo: 'https://media.giphy.com/media/cG2vQVd3MHIlmXlI99/giphy.gif',
    rector: 'Nombre Apellido Rector',
    secretary: 'Nombre Apellido Secretaria',
    address: 'Av. Siempre Viva 123',
    city: 'Springfield',
    contactEmail: 'info@colegiovanguardia.edu',
    contactPhone: '3001234567',
    schoolPeriod: 'A',
    schoolDay: 1,
    schoolMonth: 1,
    schoolYear: new Date().getFullYear(),
    primaryColor: '#005A9C',
    secondaryColor: '#FDB813',
    maintenanceMode: false,
    numberOfPeriods: 4,
    periodDates: Array(4).fill({ startDate: '', endDate: '' }),
};

const GlobalSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { campuses, getUserSetting, setUserSetting } = useData();
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
    const [selectedConfigId, setSelectedConfigId] = useState(''); // 'global' or campusId. Start empty.
    const [notification, setNotification] = useState('');

    useEffect(() => {
        const loadSettings = async () => {
            // If super admin hasn't selected anything, show defaults and do nothing.
            if (user?.role === UserRole.SUPER_ADMIN && !selectedConfigId) {
                setSettings(defaultSettings);
                return;
            }

            let storageKey = 'global';
            const fallbackKey = 'global';

            if (user?.role === UserRole.CAMPUS_ADMIN && user.campusId) {
                storageKey = `campus_${user.campusId}`;
            } else if (user?.role === UserRole.SUPER_ADMIN) {
                if (selectedConfigId !== 'global') {
                    storageKey = `campus_${selectedConfigId}`;
                }
            }
            
            let savedSettingsRaw = await getUserSetting(storageKey, 'school_settings');

            if (!savedSettingsRaw && storageKey !== fallbackKey) {
                savedSettingsRaw = await getUserSetting(fallbackKey, 'school_settings');
            }

            let loadedSettings = defaultSettings;
            if (savedSettingsRaw) {
                loadedSettings = { ...defaultSettings, ...savedSettingsRaw };
            }

            const currentDates = loadedSettings.periodDates || [];
            const numPeriods = loadedSettings.numberOfPeriods;
            loadedSettings.periodDates = Array.from({ length: numPeriods }, (_, i) => currentDates[i] || { startDate: '', endDate: '' });

            setSettings(loadedSettings);
        };
        loadSettings();

    }, [user, selectedConfigId, getUserSetting]);


    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(''), 3000);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (settings.contactPhone && settings.contactPhone.length !== 10) {
            alert('El número de contacto debe tener 10 dígitos.');
            return;
        }

        let storageKey = 'global';
        if (user?.role === UserRole.CAMPUS_ADMIN && user.campusId) {
            storageKey = `campus_${user.campusId}`;
        } else if (user?.role === UserRole.SUPER_ADMIN && selectedConfigId !== 'global') {
            storageKey = `campus_${selectedConfigId}`;
        }
        
        await setUserSetting(storageKey, 'school_settings', settings);
        showNotification('¡Configuración guardada! La página se recargará para aplicar los cambios.');
        setTimeout(() => window.location.reload(), 1000);
    };

    const handleCancel = async () => {
        let storageKey = 'global';
        const fallbackKey = 'global';

        if (user?.role === UserRole.CAMPUS_ADMIN && user.campusId) {
            storageKey = `campus_${user.campusId}`;
        } else if (user?.role === UserRole.SUPER_ADMIN && selectedConfigId && selectedConfigId !== 'global') {
            storageKey = `campus_${selectedConfigId}`;
        }
        
        let savedSettingsRaw = await getUserSetting(storageKey, 'school_settings');

        if (!savedSettingsRaw && storageKey !== fallbackKey) {
            savedSettingsRaw = await getUserSetting(fallbackKey, 'school_settings');
        }

        let loadedSettings = defaultSettings;
        if (savedSettingsRaw) {
            loadedSettings = { ...defaultSettings, ...savedSettingsRaw };
        }

        const currentDates = loadedSettings.periodDates || [];
        const numPeriods = loadedSettings.numberOfPeriods;
        loadedSettings.periodDates = Array.from({ length: numPeriods }, (_, i) => currentDates[i] || { startDate: '', endDate: '' });

        setSettings(loadedSettings);
        showNotification('Cambios descartados.');
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        // Custom validations
        if (['rector', 'secretary'].includes(name)) {
            if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(value)) return;
        }
        if (name === 'contactPhone') {
            if (!/^\d*$/.test(value) || value.length > 10) return;
        }

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setSettings(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'numberOfPeriods') {
            const newNumberOfPeriods = Number(value);
            setSettings(prev => {
                const currentDates = prev.periodDates || [];
                const newDates = Array.from({ length: newNumberOfPeriods }, (_, i) => {
                    return currentDates[i] || { startDate: '', endDate: '' };
                });
                return {
                    ...prev,
                    numberOfPeriods: newNumberOfPeriods,
                    periodDates: newDates
                };
            });
        }
        else if (['schoolDay', 'schoolMonth', 'schoolYear'].includes(name)) {
             setSettings(prev => ({...prev, [name]: Number(value) }));
        }
        else {
            setSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePeriodDateChange = (index: number, field: 'startDate' | 'endDate', value: string) => {
        setSettings(prev => {
            const newDates = [...(prev.periodDates || [])];
            newDates[index] = { ...newDates[index], [field]: value };
            return { ...prev, periodDates: newDates };
        });
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, schoolLogo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    // For campus admin, pre-select their config
    useEffect(() => {
        if (user?.role === UserRole.CAMPUS_ADMIN && user.campusId) {
            setSelectedConfigId(user.campusId);
        }
    }, [user]);

    const isFormDisabled = user?.role === UserRole.SUPER_ADMIN && !selectedConfigId;

    const tabs = [
        { id: 'general', label: 'Información General', icon: <InformationCircleIcon /> },
        { id: 'academic', label: 'Académico', icon: <AcademicCapIcon /> },
        { id: 'customization', label: 'Apariencia', icon: <PaintBrushIcon /> },
        { id: 'maintenance', label: 'Sistema', icon: <ExclamationTriangleIcon /> },
    ];

    const inputClasses = "w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:focus:ring-indigo-500/40 text-sm";
    const labelClasses = "block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300";

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* Logo Upload Section */}
                        <div className="flex flex-col sm:flex-row items-center gap-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <div className="relative group shrink-0">
                                <img src={settings.schoolLogo} alt="Logo" className="w-28 h-28 rounded-full object-cover shadow-lg border-4 border-white dark:border-slate-800" />
                                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <UploadIcon className="text-white w-8 h-8" />
                                </div>
                            </div>
                            <div className="flex-1 w-full text-center sm:text-left">
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Identidad Institucional</h4>
                                <p className="text-slate-500 text-sm mb-4 dark:text-slate-400">Sube el escudo o logo oficial de la institución. Se recomienda formato PNG transparente.</p>
                                <div className="relative overflow-hidden inline-block">
                                    <button className="bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors border border-indigo-200 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:hover:bg-slate-600">
                                        Seleccionar Archivo
                                    </button>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className={labelClasses}>Nombre Oficial de la Institución</label>
                                <input type="text" name="schoolName" value={settings.schoolName} onChange={handleChange} className={inputClasses} placeholder="Ej: Institución Educativa..." />
                            </div>
                            
                            <div>
                                <label className={labelClasses}>Nombre del Rector(a)</label>
                                <input type="text" name="rector" value={settings.rector} onChange={handleChange} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Nombre del Secretario(a)</label>
                                <input type="text" name="secretary" value={settings.secretary} onChange={handleChange} className={inputClasses} />
                            </div>

                            <div>
                                <label className={labelClasses}>Dirección Principal</label>
                                <input type="text" name="address" value={settings.address} onChange={handleChange} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Ciudad / Municipio</label>
                                <input type="text" name="city" value={settings.city} onChange={handleChange} className={inputClasses} />
                            </div>

                            <div>
                                <label className={labelClasses}>Correo Electrónico Institucional</label>
                                <input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Teléfono de Contacto</label>
                                <input type="tel" name="contactPhone" value={settings.contactPhone} onChange={handleChange} className={inputClasses} placeholder="10 dígitos" />
                            </div>
                        </div>
                    </div>
                );
            case 'academic':
                return (
                     <div className="space-y-8 animate-fade-in-up">
                        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-indigo-500" />
                                Ciclo Escolar
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                <div>
                                    <label className={labelClasses} htmlFor="schoolPeriod">Tipo de Calendario</label>
                                    <select id="schoolPeriod" name="schoolPeriod" value={settings.schoolPeriod} onChange={handleChange} className={inputClasses}>
                                        <option value="A">Calendario A</option>
                                        <option value="B">Calendario B</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses} htmlFor="numberOfPeriods">Estructura Académica</label>
                                    <select id="numberOfPeriods" name="numberOfPeriods" value={settings.numberOfPeriods} onChange={handleChange} className={inputClasses}>
                                        <option value={1}>Anual (1 Periodo)</option>
                                        <option value={2}>Semestral (2 Periodos)</option>
                                        <option value={3}>Trimestral (3 Periodos)</option>
                                        <option value={4}>Bimestral (4 Periodos)</option>
                                        <option value={5}>Quimestral (5 Periodos)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelClasses}>Fecha de Inicio Año Lectivo</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <select aria-label="Día" name="schoolDay" value={settings.schoolDay} onChange={handleChange} className={inputClasses}>
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => <option key={day} value={day}>{day}</option>)}
                                    </select>
                                    <select aria-label="Mes" name="schoolMonth" value={settings.schoolMonth} onChange={handleChange} className={inputClasses}>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => <option key={month} value={month}>{new Date(0, month - 1).toLocaleString('es-ES', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</option>)}
                                    </select>
                                    <select aria-label="Año" name="schoolYear" value={settings.schoolYear} onChange={handleChange} className={inputClasses}>
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {settings.numberOfPeriods > 0 && (
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Cronograma de Periodos</h4>
                                <p className="text-sm text-slate-500 mb-6 dark:text-slate-400">Defina las fechas de inicio y fin para cada corte académico. Esto controlará el bloqueo automático de notas.</p>
                                
                                <div className="space-y-4">
                                    {Array.from({ length: settings.numberOfPeriods }).map((_, i) => (
                                        <div key={i} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
                                            <div className="w-full md:w-32">
                                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg block text-center md:text-left">
                                                    Periodo {i + 1}
                                                </span>
                                            </div>
                                            <div className="flex-1 w-full grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Inicio</label>
                                                    <input type="date" value={settings.periodDates?.[i]?.startDate || ''} onChange={(e) => handlePeriodDateChange(i, 'startDate', e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-500"/>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cierre</label>
                                                    <input type="date" value={settings.periodDates?.[i]?.endDate || ''} onChange={(e) => handlePeriodDateChange(i, 'endDate', e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-500"/>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'customization':
                 return (
                     <div className="space-y-8 max-w-4xl mx-auto animate-fade-in-up">
                        <div className="text-center mb-8">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Identidad Visual</h3>
                            <p className="text-slate-500 mt-2 dark:text-slate-400">Personaliza los colores de la plataforma para que coincidan con la imagen de tu institución.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
                                <label htmlFor="primaryColor" className="text-base font-bold mb-4 text-slate-700 dark:text-slate-200">Color Primario</label>
                                <div className="relative group cursor-pointer mb-4">
                                    <div className="w-24 h-24 rounded-full shadow-lg border-4 border-white dark:border-slate-700 transition-transform group-hover:scale-105" style={{ backgroundColor: settings.primaryColor }}></div>
                                    <input id="primaryColor" type="color" name="primaryColor" value={settings.primaryColor} onChange={handleChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                                </div>
                                <div className="w-full relative">
                                    <input type="text" name="primaryColor" value={settings.primaryColor} onChange={handleChange} className="w-full text-center p-3 font-mono text-sm border rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none uppercase" maxLength={7} />
                                </div>
                                <p className="text-xs text-slate-400 mt-3 text-center">Usado en botones, encabezados y elementos activos.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
                                <label htmlFor="secondaryColor" className="text-base font-bold mb-4 text-slate-700 dark:text-slate-200">Color Secundario</label>
                                <div className="relative group cursor-pointer mb-4">
                                    <div className="w-24 h-24 rounded-full shadow-lg border-4 border-white dark:border-slate-700 transition-transform group-hover:scale-105" style={{ backgroundColor: settings.secondaryColor }}></div>
                                    <input id="secondaryColor" type="color" name="secondaryColor" value={settings.secondaryColor} onChange={handleChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                                </div>
                                <div className="w-full relative">
                                    <input type="text" name="secondaryColor" value={settings.secondaryColor} onChange={handleChange} className="w-full text-center p-3 font-mono text-sm border rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none uppercase" maxLength={7} />
                                </div>
                                <p className="text-xs text-slate-400 mt-3 text-center">Usado en acentos, etiquetas y elementos decorativos.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'maintenance':
                return (
                    <div className="py-10 flex justify-center animate-fade-in-up">
                        <div className="max-w-2xl w-full bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl text-center">
                            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 dark:bg-rose-900/20">
                                <ExclamationTriangleIcon className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Modo Mantenimiento</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                Activar esta opción bloqueará el acceso a la plataforma para estudiantes, padres y profesores. Solo los administradores podrán iniciar sesión para realizar ajustes.
                            </p>
                            
                            <label className="relative inline-flex items-center cursor-pointer group">
                                <input type="checkbox" name="maintenanceMode" checked={settings.maintenanceMode} onChange={handleChange} className="sr-only peer"/>
                                <div className="w-16 h-8 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 dark:peer-focus:ring-rose-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600"></div>
                                <span className="ml-4 text-base font-medium text-slate-700 dark:text-slate-300 group-hover:text-rose-600 transition-colors">
                                    {settings.maintenanceMode ? 'Sistema Bloqueado' : 'Sistema Activo'}
                                </span>
                            </label>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {notification && (
                <div className="fixed top-24 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-fade-in-up flex items-center gap-3">
                    <div className="bg-white/20 p-1 rounded-full"><CheckIcon className="w-5 h-5"/></div>
                    <div>
                        <p className="font-bold text-sm">Operación Exitosa</p>
                        <p className="text-xs opacity-90">{notification}</p>
                    </div>
                </div>
            )}
            <Card className="min-h-[calc(100vh-120px)] flex flex-col p-0 overflow-hidden">
                <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                                Configuración Global
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Administra los parámetros generales de la plataforma.</p>
                        </div>
                        
                        {user?.role === UserRole.SUPER_ADMIN && (
                            <div className="w-full md:w-auto">
                                <select
                                    value={selectedConfigId}
                                    onChange={e => setSelectedConfigId(e.target.value)}
                                    className="w-full md:w-64 p-2.5 pl-4 border rounded-xl bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white dark:border-slate-700 cursor-pointer"
                                >
                                    <option value="" disabled>Seleccione configuración...</option>
                                    <option value="global">Global (Por Defecto)</option>
                                    {campuses.map(campus => (
                                        <option key={campus.id} value={campus.id}>{campus.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${
                                    activeTab === tab.id
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                } flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap`}
                            >
                                {React.cloneElement(tab.icon, { className: `w-5 h-5 ${activeTab === tab.id ? 'stroke-2' : ''}` })}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-slate-900 p-6 md:p-8 overflow-y-auto">
                    <fieldset disabled={isFormDisabled} className="h-full">
                        {renderContent()}
                    </fieldset>
                </div>

                <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 sticky bottom-0 z-10">
                    <button 
                        type="button"
                        onClick={handleCancel}
                        disabled={isFormDisabled}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                        Descartar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isFormDisabled}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </Card>
        </>
    );
};

export default GlobalSettingsPage;
