import { html } from '../utils/htm.js';
import { Icon } from '../components/ui/Icon.js';

export const AuthLayout = ({ children, view, setView, isLogin }) => {
    return html`
        <div className="h-[100dvh] w-full bg-white dark:bg-midnight-950 overflow-hidden flex flex-col lg:flex-row relative selection:bg-primary-500/30">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 blur-[100px] rounded-full pointer-events-none hidden lg:block auth-orb-drift"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none hidden lg:block auth-orb-drift" style=${{ animationDelay: '2s' }}></div>

            <div className="${view === 'form' ? 'hidden lg:grid' : 'grid'} grid-rows-[auto_minmax(0,1fr)_auto] w-full lg:w-[45%] h-full min-h-0 relative px-5 pt-5 sm:px-8 sm:pt-8 auth-safe-footer shrink-0 border-r border-gray-100 dark:border-midnight-800 transition-all duration-500 bg-[#f8fafc] dark:bg-midnight-950/50 backdrop-blur-3xl overflow-hidden">
                
                <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style=${{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                <div className="absolute top-24 right-6 w-28 h-28 bg-primary-400/15 rounded-full blur-3xl auth-orb-drift pointer-events-none hidden sm:block"></div>
                <div className="absolute bottom-32 left-4 w-20 h-20 bg-blue-400/10 rounded-full blur-2xl auth-orb-drift pointer-events-none" style=${{ animationDelay: '1.2s' }}></div>
                
                <div className="relative z-10 flex items-center justify-between shrink-0 auth-reveal auth-delay-1">
                    <img src="assets/NEXRA_IconBeside.png" alt="NEXRA" className="h-14 sm:h-16 object-contain dark:contrast-125 hover:opacity-80 transition-opacity" />
                    
                    <button onClick=${() => setView('form')} className="lg:hidden text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-full flex items-center gap-1 active:scale-95 transition-transform">
                        ${isLogin ? 'Sign In' : 'Sign Up'} <${Icon} name="arrow-right" size=${16} />
                    </button>
                </div>

                <div className="relative z-10 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col justify-center max-w-lg mx-auto w-full py-4 sm:py-6 no-scrollbar">
                    <div className="space-y-4">
                        <div className="auth-reveal auth-delay-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-midnight-900 shadow-sm border border-gray-200 dark:border-midnight-800 text-xs font-semibold text-gray-700 dark:text-midnight-300">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                            </span>
                            NEXRA SMS Gateway 2.0
                        </div>
                        <h1 className="auth-reveal auth-delay-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
                            Communicate with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-blue-500 to-primary-400 auth-gradient-text">impact.</span>
                        </h1>
                        <p className="auth-reveal auth-delay-4 text-gray-600 dark:text-gray-400 text-sm lg:text-base max-w-sm leading-relaxed">
                            Experience next-generation messaging infrastructure built for scale and reliability.
                        </p>
                    </div>

                    <div className="auth-reveal auth-delay-5 relative h-44 sm:h-52 mt-6 sm:mt-8 w-full max-w-md mx-auto pointer-events-none shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/20 to-transparent rounded-full blur-[80px] auth-orb-drift"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="auth-logo-pulse w-28 h-28 sm:w-32 sm:h-32 bg-white dark:bg-midnight-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-midnight-800 p-3 sm:p-4 flex items-center justify-center">
                                <img src="assets/NEXRA_IconAbove.png" alt="" className="w-full h-full object-contain drop-shadow-xl" />
                            </div>
                        </div>
                        
                        <div className="absolute top-[8%] left-[8%] w-11 h-11 sm:w-12 sm:h-12 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '0s' }}>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <${Icon} name="user" size=${16} className="text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>

                        <div className="absolute bottom-[8%] right-[8%] w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '1.5s' }}>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <${Icon} name="users" size=${18} className="text-green-600 dark:text-green-400" />
                            </div>
                        </div>

                        <div className="absolute top-[18%] right-[4%] w-9 h-9 sm:w-10 sm:h-10 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '0.7s' }}>
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                <${Icon} name="smartphone" size=${12} className="text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>

                        <div className="absolute bottom-[18%] left-[4%] w-11 h-11 sm:w-12 sm:h-12 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '2.2s' }}>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                <${Icon} name="laptop" size=${16} className="text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>

                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(34,197,94,0.6)] z-30" style=${{ animation: 'send-packet-1 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}></div>
                        <div className="absolute top-[15%] left-[15%] w-2 h-2 bg-blue-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(59,130,246,0.6)] z-30" style=${{ animation: 'receive-packet-1 3s cubic-bezier(0.4, 0, 0.2, 1) infinite 1s' }}></div>
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-purple-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(168,85,247,0.6)] z-30" style=${{ animation: 'send-packet-2 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.5s' }}></div>
                        <div className="absolute bottom-[20%] left-[10%] w-2 h-2 bg-orange-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(249,115,22,0.6)] z-30" style=${{ animation: 'receive-packet-2 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.5s' }}></div>
                    </div>
                </div>

                <footer className="relative z-10 shrink-0 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 font-medium pt-3 border-t border-gray-100/80 dark:border-midnight-800/80 bg-[#f8fafc]/90 dark:bg-midnight-950/90 backdrop-blur-sm auth-reveal auth-delay-5">
                    <span>© 2026 NEXRA</span>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Terms</a>
                    </div>
                </footer>
            </div>

            <div className="${view === 'showcase' ? 'hidden lg:flex' : 'flex'} flex-1 flex-col justify-center items-center px-4 py-8 sm:p-6 lg:p-12 min-h-0 h-full relative overflow-y-auto custom-scrollbar animate-slide-left bg-white dark:bg-midnight-950 pb-[max(2rem,env(safe-area-inset-bottom))]">
                <button 
                    onClick=${() => setView('showcase')}
                    className="lg:hidden absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-gray-100 dark:bg-midnight-800 text-gray-600 dark:text-midnight-400 hover:bg-gray-200 dark:hover:bg-midnight-700 transition-all active:scale-95 z-20"
                    style=${{ top: 'max(1rem, env(safe-area-inset-top))' }}
                >
                    <${Icon} name="chevron-left" size=${20} />
                </button>

                <div className="w-full max-w-[360px] mx-auto space-y-6 lg:space-y-8">
                    <div className="text-center auth-reveal auth-delay-2">
                        <img src="assets/NEXRA_IconAbove.png" className="h-[72px] sm:h-20 mx-auto -mt-6 mb-4 lg:hidden object-contain" alt="NEXRA" />
                        ${children[0] /* Header Text */}
                    </div>
                    
                    <div className="auth-reveal auth-delay-3">
                        ${children[1] /* The Form */}
                    </div>
                    
                    <div className="auth-reveal auth-delay-4">
                        ${children[2] /* Footer Links */}
                    </div>
                </div>
            </div>
        </div>
    `;
};
