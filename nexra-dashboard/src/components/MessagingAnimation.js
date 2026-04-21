import { html, useState, useEffect } from '../utils/htm.js';
import { Icon } from './ui/Icon.js';

export const MessagingAnimation = () => {
    const [messages, setMessages] = useState([]);
    const [receivedCount, setReceivedCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const id = Date.now();
            setMessages(prev => [...prev, { id, target: Math.floor(Math.random() * 3) }]);

            setTimeout(() => {
                setMessages(prev => prev.filter(m => m.id !== id));
                setReceivedCount(prev => (prev + 1) % 4);
            }, 2000);
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    const receivers = [
        { x: 80, y: 20, icon: 'user' },
        { x: 85, y: 50, icon: 'users' },
        { x: 80, y: 80, icon: 'building' }
    ];

    return html`
        <div className="relative h-32 w-full mb-6 select-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-signal"></div>
                    <div className="bg-white p-3 rounded-xl shadow-xl relative z-10">
                        <${Icon} name="smartphone" size=${24} className="text-primary-600" />
                    </div>
                </div>
                <span className="text-[10px] font-medium text-blue-100 uppercase tracking-widest">You</span>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                ${receivers.map((r, i) => html`
                    <line
                        key=${i}
                        x1="15%" y1="50%"
                        x2="${r.x}%" y2="${r.y}%"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1.5"
                    />
                `)}

                ${messages.map((m) => {
                    const r = receivers[m.target];
                    return html`
                        <circle
                            key=${m.id}
                            r="3"
                            fill="white"
                            style=${{
                                animation: 'message-move 2s ease-in-out forwards',
                                '--target-y': `${r.y}%`
                            }}
                        />
                    `;
                })}
            </svg>

            ${receivers.map((r, i) => html`
                <div
                    key=${i}
                    className="absolute flex flex-col items-center gap-1 transition-all duration-300"
                    style=${{ left: `${r.x}%`, top: `${r.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                    <div className="relative">
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20 transition-all ${receivedCount === i + 1 ? 'scale-110 bg-white/30 border-white/50' : ''}">
                            <${Icon} name=${r.icon} size=${16} />
                        </div>
                        ${receivedCount === i + 1 && html`
                            <div className="absolute -top-1.5 -right-1.5 bg-green-400 p-0.5 rounded-full shadow-lg animate-pop-in">
                                <${Icon} name="check" size=${8} className="text-white" />
                            </div>
                        `}
                    </div>
                </div>
            `)}

            <style>${`
                @keyframes message-move {
                    0% { left: 15%; top: 50%; opacity: 0; transform: scale(0.5); }
                    20% { opacity: 1; transform: scale(1); }
                    80% { opacity: 1; transform: scale(1); }
                    100% { left: 80%; top: var(--target-y); opacity: 0; transform: scale(0.5); }
                }
            `}</style>
        </div>
    `;
};
