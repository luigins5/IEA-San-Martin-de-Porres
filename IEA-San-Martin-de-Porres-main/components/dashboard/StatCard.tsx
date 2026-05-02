
import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend?: string;
  trendColor?: 'green' | 'red';
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, trend, trendColor = 'green', color, onClick }) => {
  return (
    <div 
        className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/60 flex items-center justify-between transition-all hover:shadow-md duration-300 group ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
        onClick={onClick}
    >
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest dark:text-slate-400 mb-1">{title}</p>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{value}</h3>
            {trend && (
                <span className={`text-[10px] font-bold mt-2 inline-block ${trendColor === 'green' ? 'text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded-full dark:bg-emerald-900/20' : 'text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded-full dark:bg-rose-900/20'}`}>
                    {trend}
                </span>
            )}
        </div>
        <div 
            className="p-4 rounded-full transition-transform duration-300 group-hover:scale-110 shadow-sm" 
            style={{ backgroundColor: `${color}15`, color: color }}
        >
            {icon}
        </div>
    </div>
  );
};

export default StatCard;
