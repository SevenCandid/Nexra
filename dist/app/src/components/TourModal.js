import { html, useState, useEffect } from '../utils/htm.js';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { Icon } from './ui/Icon.js';

const TOUR_STEPS = [
    {
        title: 'Welcome to NEXRA! 🎉',
        content: 'Your powerful SMS engagement platform. We will take you through a quick 3-step tour to help you launch your first campaign in minutes.',
        icon: 'rocket',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
        title: 'Step 1: Set up a Sender ID',
        content: 'A Sender ID is the name that appears on your customers\' phones (like "MY-BRAND"). Head over to Sender IDs from the sidebar to request one.',
        icon: 'at-sign',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
        title: 'Step 2: Add Segments & Contacts',
        content: 'Create segments to organise your audience and upload your contacts via CSV or manually. This makes targeting your campaigns a breeze.',
        icon: 'users',
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
        title: 'Step 3: Top Up Your Wallet',
        content: 'Ensure you have enough credits to send your campaigns. Visit the Pricing & Wallet page to view our flexible Pay-As-You-Go rates or Subscribe to a plan.',
        icon: 'wallet',
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20'
    }
];

export const TourModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasSeenTour = window.localStorage.getItem('nexra_tour_completed');
        if (!hasSeenTour) {
            // Slight delay so the user sees the dashboard load first
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const completeTour = () => {
        window.localStorage.setItem('nexra_tour_completed', 'true');
        setIsOpen(false);
    };

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeTour();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isOpen) return null;

    const stepInfo = TOUR_STEPS[currentStep];

    return html`
        <${Modal} isOpen=${isOpen} onClose=${completeTour} title="Get Started with NEXRA">
            <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300" key=${currentStep}>
                
                <div className=${`w-24 h-24 rounded-full flex items-center justify-center ${stepInfo.bg} ${stepInfo.color} mb-2 shadow-inner`}>
                    <${Icon} name=${stepInfo.icon} size=${40} strokeWidth=${2.5} />
                </div>
                
                <div className="space-y-3">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">${stepInfo.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed px-4">
                        ${stepInfo.content}
                    </p>
                </div>

                <div className="flex gap-1.5 pt-4">
                    ${TOUR_STEPS.map((_, idx) => html`
                        <div key=${idx} className=${`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'bg-primary-600 w-6' : 'bg-gray-200 dark:bg-midnight-800'}`}></div>
                    `)}
                </div>

                <div className="flex items-center justify-between w-full pt-8 mt-4 border-t border-gray-100 dark:border-midnight-800">
                    <button 
                        onClick=${completeTour} 
                        className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors uppercase tracking-widest px-2"
                    >
                        Skip Tour
                    </button>
                    
                    <div className="flex gap-2">
                        ${currentStep > 0 && html`
                            <${Button} variant="secondary" onClick=${prevStep} className="px-5">
                                Back
                            </${Button}>
                        `}
                        <${Button} variant="primary" onClick=${nextStep} className="px-6 font-black uppercase tracking-widest shadow-glow">
                            ${currentStep === TOUR_STEPS.length - 1 ? "Let's Go!" : "Next"}
                            ${currentStep < TOUR_STEPS.length - 1 && html`<${Icon} name="chevron-right" size=${16} className="ml-1 -mr-1" />`}
                        </${Button}>
                    </div>
                </div>
            </div>
        </${Modal}>
    `;
};
