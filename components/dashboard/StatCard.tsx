
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
        className={`bg-white dark:bg-slate-900 rounded-xl p-5 shadow-card border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all hover:shadow-md duration-300 group ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
        onClick={onClick}
    >
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</h3>
            {trend && (
                <span className={`text-xs font-medium mt-1 inline-block ${trendColor === 'green' ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded'}`}>
                    {trend}
                </span>
            )}
        </div>
        <div 
            className="p-3 rounded-xl transition-colors duration-300 group-hover:scale-110" 
            style={{ backgroundColor: `${color}10`, color: color }}
        >
            {icon}
        </div>
    </div>
  );
};

export default StatCard;
