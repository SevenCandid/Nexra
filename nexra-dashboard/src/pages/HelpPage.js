import { html } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';

export const HelpPage = () => {
    const faqs = [
        {
            q: "How do I request a Sender ID?",
            a: "Go to the 'Sender IDs' section in the menu, enter your desired name (3-11 characters), and click 'Request Approval'. Most requests are approved within 2-4 hours."
        },
        {
            q: "What is the 'Pending' status?",
            a: "Messages in 'Pending' status are either drafted but not yet sent, or are currently in the process of being delivered by our gateway."
        },
        {
            q: "How do I top up my balance?",
            a: "Visit the 'Wallet' section to see pricing and contact support to purchase credits. Automated online payments are coming soon."
        },
        {
            q: "Why did my campaign fail?",
            a: "Campaigns usually fail if the SMS gateway is temporarily offline or if your account balance is insufficient. You can retry failed campaigns from the Campaigns list."
        }
    ];

    return html`
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            <${Card} className="bg-gradient-to-br from-primary-600 to-blue-700 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black uppercase tracking-tight">Need Assistance?</h2>
                        <p className="text-blue-100/80 text-sm max-w-sm">Our support team is available 24/7 to help you with your messaging needs.</p>
                        <div className="flex gap-4 pt-4">
                            <a href="mailto:support@nexra.com" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 text-xs font-bold uppercase tracking-wider">
                                <${Icon} name="mail" size=${16} />
                                Email Support
                            </a>
                            <a href="tel:+23300000000" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 text-xs font-bold uppercase tracking-wider">
                                <${Icon} name="phone" size=${16} />
                                Call Us
                            </a>
                        </div>
                    </div>
                    <${Icon} name="help-circle" size=${80} className="opacity-20 hidden md:block" />
                </div>
            </${Card}>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="message-circle" size=${20} className="text-primary-600" />
                        Frequently Asked Questions
                    </h3>
                    
                    <div className="space-y-4">
                        ${faqs.map(faq => html`
                            <${Card} key=${faq.q} className="p-5 border-gray-100 bg-white hover:border-primary-200 transition-all">
                                <h4 className="font-bold text-gray-900 mb-2">${faq.q}</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">${faq.a}</p>
                            </${Card}>
                        `)}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="book-open" size=${20} className="text-primary-600" />
                        Resources
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        <${Card} className="p-4 border-gray-100 flex items-center gap-4 hover:border-primary-200 cursor-pointer transition-all">
                            <div className="p-3 rounded-xl bg-orange-50 text-orange-600"><${Icon} name="file-text" size=${24} /></div>
                            <div>
                                <h4 className="font-bold text-sm">Documentation</h4>
                                <p className="text-[10px] text-gray-500">Full platform guides</p>
                            </div>
                        </${Card}>
                        <${Card} className="p-4 border-gray-100 flex items-center gap-4 hover:border-primary-200 cursor-pointer transition-all" onClick=${() => window.location.hash = '#/api-docs'}>
                            <div className="p-3 rounded-xl bg-purple-50 text-purple-600"><${Icon} name="code" size=${24} /></div>
                            <div>
                                <h4 className="font-bold text-sm">API Reference</h4>
                                <p className="text-[10px] text-gray-500">Developer integrations</p>
                            </div>
                        </${Card}>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="zap" size=${20} className="text-amber-500" />
                        Quick Start
                    </h3>
                    
                    <${Card} className="p-5 bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20">
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="h-6 w-6 shrink-0 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-amber-600 shadow-sm border border-amber-100">1</div>
                                <div className="text-sm">
                                    <p className="font-bold text-gray-900">Request ID</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Start by getting a verified Sender ID approved.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="h-6 w-6 shrink-0 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-amber-600 shadow-sm border border-amber-100">2</div>
                                <div className="text-sm">
                                    <p className="font-bold text-gray-900">Add Contacts</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Upload your recipient list in the Contacts section.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="h-6 w-6 shrink-0 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-amber-600 shadow-sm border border-amber-100">3</div>
                                <div className="text-sm">
                                    <p className="font-bold text-gray-900">Send News</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Create and broadcast your first campaign.</p>
                                </div>
                            </li>
                        </ul>
                    </${Card}>

                    <${Card} className="p-5 border-emerald-100 bg-emerald-50/30">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Platform Status</h4>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <p className="font-bold text-emerald-900">System Healthy</p>
                        <p className="text-[10px] text-emerald-700/70 mt-1 uppercase tracking-wider font-bold">API latency: 42ms</p>
                    </${Card}>
                </div>
            </div>
        </div>
    `;
};
