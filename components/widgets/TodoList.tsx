import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { PlusIcon, TrashIcon, CheckIcon } from '../icons';

interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

const TodoList: React.FC = () => {
    const { user } = useAuth();
    const { getUserSetting, setUserSetting } = useData();
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        const loadTodos = async () => {
            if (user) {
                const savedTodos = await getUserSetting(user.id, 'user_todos');
                if (savedTodos) {
                    setTasks(savedTodos);
                }
            }
        };
        loadTodos();
    }, [user, getUserSetting]);

    const saveTodos = async (newTodos: Todo[]) => {
        setTasks(newTodos);
        if (user) {
            await setUserSetting(user.id, 'user_todos', newTodos);
        }
    };

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newTodo: Todo = {
            id: Date.now().toString(),
            text: inputValue.trim(),
            completed: false
        };

        saveTodos([newTodo, ...tasks]);
        setInputValue("");
    };

    const toggleTask = (id: string) => {
        const newTodos = tasks.map(t => 
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        // Optional: Move completed to bottom
        // newTodos.sort((a, b) => Number(a.completed) - Number(b.completed));
        saveTodos(newTodos);
    };

    const deleteTask = (id: string) => {
        const newTodos = tasks.filter(t => t.id !== id);
        saveTodos(newTodos);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Mis Tareas</h3>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {tasks.filter(t => !t.completed).length} pendientes
                </span>
            </div>
            
            <div className="p-4 flex-grow flex flex-col">
                <form onSubmit={addTask} className="relative mb-4">
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Añadir nueva tarea..."
                        className="w-full bg-gray-50 dark:bg-slate-900 border-none rounded-lg py-3 pl-4 pr-12 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm text-sm dark:text-white"
                    />
                    <button 
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </form>

                <div className="flex-grow overflow-y-auto max-h-[300px] space-y-2 pr-1 custom-scrollbar">
                    {tasks.length > 0 ? (
                        tasks.map((task) => (
                            <div 
                                key={task.id} 
                                className={`group flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                                    task.completed 
                                        ? 'bg-gray-50 border-gray-100 dark:bg-slate-800/50 dark:border-slate-700' 
                                        : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'
                                }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button
                                        onClick={() => toggleTask(task.id)}
                                        className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
                                            task.completed 
                                                ? 'bg-green-500 border-green-500 text-white' 
                                                : 'border-gray-300 hover:border-indigo-400 dark:border-gray-600'
                                        }`}
                                    >
                                        {task.completed && <CheckIcon className="w-3.5 h-3.5" />}
                                    </button>
                                    <span 
                                        className={`text-sm truncate transition-all duration-300 ${
                                            task.completed 
                                                ? 'text-gray-400 line-through decoration-gray-300 dark:text-gray-500' 
                                                : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                    >
                                        {task.text}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => deleteTask(task.id)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-50">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                                <CheckIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">No hay tareas pendientes</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TodoList;
