import { html } from '../utils/htm.js';
import { Icon } from '../components/ui/Icon.js';

export const AuthLayout = ({ children, view, setView, isLogin }) => {
    return html`
        <div className="h-[100dvh] w-full bg-white dark:bg-midnight-950 overflow-hidden flex flex-col lg:flex-row relative selection:bg-primary-500/30">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 blur-[100px] rounded-full pointer-events-none hidden lg:block"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none hidden lg:block"></div>

            <div className="${view === 'form' ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[45%] h-full relative p-5 sm:p-8 shrink-0 border-r border-gray-100 dark:border-midnight-800 transition-all duration-500 bg-[#f8fafc] dark:bg-midnight-950/50 backdrop-blur-3xl overflow-hidden justify-between">
                
                <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]" style=${{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                
                <div className="relative z-10 flex items-center justify-between">
                    <img src="assets/NEXRA_IconBeside.png" alt="NEXRA" className="h-16 object-contain dark:contrast-125 hover:opacity-80 transition-opacity" />
                    
                    <button onClick=${() => setView('form')} className="lg:hidden text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-full flex items-center gap-1 active:scale-95 transition-transform">
                        ${isLogin ? 'Sign In' : 'Sign Up'} <${Icon} name="arrow-right" size=${16} />
                    </button>
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg mx-auto w-full group">
                    <div className="animate-slide-up space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-midnight-900 shadow-sm border border-gray-200 dark:border-midnight-800 text-xs font-semibold text-gray-700 dark:text-midnight-300">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                            </span>
                            NEXRA SMS Gateway 2.0
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
                            Communicate with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-500">impact.</span>
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base max-w-sm">
                            Experience next-generation messaging infrastructure built for scale and reliability.
                        </p>
                    </div>

                    <div className="relative h-56 sm:h-64 mt-8 sm:mt-12 mb-4 w-full max-w-md mx-auto pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/20 to-transparent rounded-full blur-[80px]"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white dark:bg-midnight-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-midnight-800 p-4 transition-transform duration-700 hover:scale-105 flex items-center justify-center z-20">
                            <img src="assets/NEXRA_IconAbove.png" className="w-24 h-24 object-contain drop-shadow-xl" />
                        </div>
                        
                        <div className="absolute top-[10%] left-[10%] w-12 h-12 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '0s' }}>
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <${Icon} name="user" size=${16} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 animate-ping" style=${{ animationDelay: '1s', animationDuration: '3s' }}></div>
                        </div>

                        <div className="absolute bottom-[10%] right-[10%] w-14 h-14 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '1.5s' }}>
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <${Icon} name="users" size=${18} className="text-green-600 dark:text-green-400" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-2 border-green-400 opacity-0 animate-ping" style=${{ animationDelay: '2.5s', animationDuration: '3s' }}></div>
                        </div>

                        <div className="absolute top-[20%] right-[5%] w-10 h-10 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '0.7s' }}>
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                <${Icon} name="smartphone" size=${12} className="text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>

                        <div className="absolute bottom-[20%] left-[5%] w-12 h-12 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '2.2s' }}>
                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                <${Icon} name="laptop" size=${16} className="text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>

                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(34,197,94,0.6)] z-30" style=${{ animation: 'send-packet-1 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}></div>
                        <div className="absolute top-[15%] left-[15%] w-2 h-2 bg-blue-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(59,130,246,0.6)] z-30" style=${{ animation: 'receive-packet-1 3s cubic-bezier(0.4, 0, 0.2, 1) infinite 1s' }}></div>
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-purple-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(168,85,247,0.6)] z-30" style=${{ animation: 'send-packet-2 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.5s' }}></div>
                        <div className="absolute bottom-[20%] left-[10%] w-2 h-2 bg-orange-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(249,115,22,0.6)] z-30" style=${{ animation: 'receive-packet-2 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.5s' }}></div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 font-medium">
                    <span>© 2026 NEXRA</span>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Terms</a>
                    </div>
                </div>
            </div>

            <div className="${view === 'showcase' ? 'hidden lg:flex' : 'flex'} flex-1 flex-col justify-center items-center px-4 py-8 sm:p-6 lg:p-12 h-full relative overflow-y-auto custom-scrollbar animate-slide-left bg-white dark:bg-midnight-950">
                <button 
                    onClick=${() => setView('showcase')}
                    className="lg:hidden absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-gray-100 dark:bg-midnight-800 text-gray-600 dark:text-midnight-400 hover:bg-gray-200 dark:hover:bg-midnight-700 transition-all active:scale-95 z-20"
                >
                    <${Icon} name="chevron-left" size=${20} />
                </button>

                <div className="w-full max-w-[360px] mx-auto space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center">
                        <img src="assets/NEXRA_IconAbove.png" className="h-[72px] sm:h-20 mx-auto -mt-6 mb-4 lg:hidden object-contain" />
                        ${children[0] /* Header Text */}
                    </div>
                    
                    ${children[1] /* The Form */}
                    
                    ${children[2] /* Footer Links */}
                </div>
            </div>
        </div>
    `;
};
