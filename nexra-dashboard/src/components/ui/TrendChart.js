import { html, useState, useEffect, useRef, useMemo } from '../../utils/htm.js';
import { Icon } from './index.js';

export const TrendChart = ({ data, dataKey, color, label, prefix = '' }) => {
    if (!data || data.length === 0) return null;
    
    const height = 100;
    const width = 400;
    const padding = 10;
    
    const maxVal = Math.max(...data.map(d => d[dataKey])) * 1.2 || 10;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((d[dataKey] / maxVal) * (height - padding * 2) + padding);
        return `${x},${y}`;
    }).join(' ');

    const lastVal = data[data.length - 1][dataKey];

    return html`
        <${Card} className="p-6 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">${label}</p>
                        <h3 className="text-2xl font-black dark:text-white mt-1">
                            ${prefix}${lastVal.toLocaleString()}
                        </h3>
                    </div>
                    <div className=${`w-10 h-10 rounded-full flex items-center justify-center ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary-50 text-primary-600'}`}>
                        <${Icon} name=${dataKey === 'revenue' ? 'trending-up' : 'activity'} size=${20} />
                    </div>
                </div>
                
                <div className="mt-auto pt-4">
                    <svg viewBox="0 0 ${width} ${height}" className="w-full h-24 overflow-visible">
                        <defs>
                            <linearGradient id=${`grad-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style=${{ stopColor: color === 'emerald' ? '#10b981' : '#3b82f6', stopOpacity: 0.2 }} />
                                <stop offset="100%" style=${{ stopColor: color === 'emerald' ? '#10b981' : '#3b82f6', stopOpacity: 0 }} />
                            </linearGradient>
                        </defs>
                        <path
                            d=${`M ${points} L ${width - padding},${height} L ${padding},${height} Z`}
                            fill=${`url(#grad-${dataKey})`}
                            className="transition-all duration-1000"
                        />
                        <polyline
                            fill="none"
                            stroke=${color === 'emerald' ? '#10b981' : '#3b82f6'}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points=${points}
                            className="transition-all duration-1000"
                        />
                    </svg>
                </div>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-[10px] font-bold text-gray-400 uppercase">Last 14 Days</span>
            </div>
        </${Card}>
    `;
};