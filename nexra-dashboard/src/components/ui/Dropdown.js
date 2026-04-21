import { html, useState, useEffect, useRef } from '../../utils/htm.js';

export const Dropdown = ({ trigger, children, align = 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return html`
        <div className="relative" ref=${dropdownRef}>
            <div onClick=${() => setIsOpen(!isOpen)}>${trigger}</div>
            ${isOpen && html`
                <div className="absolute z-10 mt-2 w-48 rounded-2xl shadow-xl bg-white dark:bg-midnight-950 border border-gray-100 dark:border-midnight-800 ring-1 ring-black/5 backdrop-blur-xl ${align === 'right' ? 'right-0' : 'left-0'} animate-dropdown-pop">
                    <div className="py-1 overflow-hidden rounded-2xl" role="menu" aria-orientation="vertical">
                        ${children}
                    </div>
                </div>
            `}
        </div>
    `;
};
