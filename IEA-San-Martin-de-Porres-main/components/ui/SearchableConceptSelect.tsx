import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '../icons';

interface Concept {
    code: string;
    text: string;
}

interface SearchableConceptSelectProps {
    concepts: Concept[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    hasError?: boolean;
    isSmall?: boolean;
}

export const SearchableConceptSelect: React.FC<SearchableConceptSelectProps> = ({
    concepts,
    value,
    onChange,
    disabled = false,
    placeholder = "Seleccionar concepto...",
    hasError = false,
    isSmall = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Get currently selected concept full text for display, or show value itself if not found
    const selectedConceptDisplay = value 
        ? (concepts.find(c => c.text === value) ? `[${concepts.find(c => c.text === value)?.code}] ${value}` : value)
        : '';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredConcepts = concepts.filter(c => {
        const term = searchTerm.toLowerCase();
        return c.code.toLowerCase().includes(term) || c.text.toLowerCase().includes(term);
    });

    const handleSelect = (v: string) => {
        onChange(v);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                className={`flex items-center justify-between w-full border rounded-xl overflow-hidden cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700
                    ${isSmall ? 'p-1.5 text-xs max-w-[120px]' : 'py-2.5 px-3 text-xs sm:text-sm max-w-sm'}
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : 'bg-slate-50 hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20'}
                    ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200'}
                `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                title={selectedConceptDisplay || placeholder}
            >
                <div className="truncate flex-1 text-slate-600 dark:text-slate-300 min-w-0">
                    {selectedConceptDisplay || <span className="text-slate-400">{placeholder}</span>}
                </div>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full md:w-[300px] lg:w-[400px] mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Buscar código o concepto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full text-xs sm:text-sm p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:text-white"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredConcepts.length > 0 ? (
                            <ul className="py-1">
                                <li 
                                    className="px-3 py-2 text-xs sm:text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer italic"
                                    onClick={() => handleSelect('')}
                                >
                                    -- Ninguno / Borrar --
                                </li>
                                {filteredConcepts.map(c => (
                                    <li 
                                        key={c.code}
                                        onClick={() => handleSelect(c.text)}
                                        className="px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                    >
                                        <div className="font-bold text-blue-600 dark:text-blue-400 mb-0.5">[{c.code}]</div>
                                        <div className="leading-snug">{c.text}</div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-xs sm:text-sm text-slate-500">
                                No se encontraron resultados.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
