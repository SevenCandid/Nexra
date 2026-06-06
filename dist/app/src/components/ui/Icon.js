import { html, useEffect, useRef } from '../../utils/htm.js';

export const Icon = ({ name, size = 24, className = '' }) => {
    const iconRef = useRef(null);

    useEffect(() => {
        if (window.lucide && iconRef.current) {
            iconRef.current.innerHTML = `<i data-lucide="${name}" style="width: ${size}px; height: ${size}px;"></i>`;
            window.lucide.createIcons({
                root: iconRef.current,
            });
        }
    }, [name, size]);

    return html`<span 
        ref=${iconRef} 
        className=${`inline-flex items-center justify-center ${className}`} 
        style=${{ width: `${size}px`, height: `${size}px` }}
    ></span>`;
};
