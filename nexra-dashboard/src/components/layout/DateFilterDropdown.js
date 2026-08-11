import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, Input, Dropdown } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const DateFilterDropdown = ({ currentRange, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [
        { label: 'Today', getValue: () => {
            const start = new Date(); start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            return { label: 'Today', start: start.toISOString(), end: end.toISOString() };
        }},
        { label: 'This Week', getValue: () => {
            const start = new Date();
            start.setDate(start.getDate() - start.getDay()); // Sunday
            start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            return { label: 'This Week', start: start.toISOString(), end: end.toISOString() };
        }},
        { label: 'This Month', getValue: () => {
            const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            return { label: 'This Month', start: start.toISOString(), end: end.toISOString() };
        }},
        { label: 'This Year', getValue: () => {
            const start = new Date(); start.setMonth(0, 1); start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            return { label: 'This Year', start: start.toISOString(), end: end.toISOString() };
        }},
        { label: 'All Time', getValue: () => {
            return { label: 'All Time', start: null, end: null };
        }}
    ];

    const handleSelect = (opt) => {
        onChange(opt.getValue());
        setIsOpen(false);
    };

    const handleCustomApply = () => {
        if (!customStart || !customEnd) return;
        const start = new Date(customStart); start.setHours(0,0,0,0);
        const end = new Date(customEnd); end.setHours(23,59,59,999);
        onChange({ label: `Custom: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, start: start.toISOString(), end: end.toISOString() });
        setIsOpen(false);
    };

    return html`
        <div className="relative inline-block text-left" ref=${dropdownRef}>
            <button 
                onClick=${() => setIsOpen(!isOpen)}
                className="inline-flex justify-center items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:bg-midnight-900 dark:border-midnight-700 dark:text-gray-200"
            >
                <${Icon} name="calendar" size=${16} className="mr-2 text-gray-400" />
                ${currentRange.label}
                <${Icon} name="chevron-down" size=${16} className="ml-2 -mr-1 text-gray-400" />
            </button>

            ${isOpen && html`
                <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-midnight-900 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden divide-y divide-gray-100 dark:divide-midnight-800">
                    <div className="py-1">
                        ${options.map(opt => html`
                            <button
                                key=${opt.label}
                                onClick=${() => handleSelect(opt)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-midnight-800 ${currentRange.label === opt.label ? 'font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10' : ''}"
                            >
                                ${opt.label}
                            </button>
                        `)}
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-midnight-950/50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Custom Range</p>
                        <div className="flex flex-col gap-2">
                            <input 
                                type="date" 
                                value=${customStart}
                                onChange=${(e) => setCustomStart(e.target.value)}
                                className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-midnight-900 dark:border-midnight-700 dark:text-white"
                            />
                            <input 
                                type="date" 
                                value=${customEnd}
                                onChange=${(e) => setCustomEnd(e.target.value)}
                                className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-midnight-900 dark:border-midnight-700 dark:text-white"
                            />
                            <button
                                onClick=${handleCustomApply}
                                disabled=${!customStart || !customEnd}
                                className="mt-2 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};
