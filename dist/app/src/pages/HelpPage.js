import { html, useState } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';

const faqData = [
    {
        category: 'Getting Started',
        icon: 'play-circle',
        color: 'primary',
        items: [
            {
                q: 'How do I create an account?',
                a: 'Visit the registration page and fill in your name, business email, organization name, and a secure password. If your organization already exists, ask your admin to send you a staff invite link.'
            },
            {
                q: 'How do I request a Sender ID?',
                a: "Navigate to Sender IDs in the sidebar, click 'Request New', and enter a name of 3–11 characters (no spaces). It represents your brand (e.g. MY-BRAND). Most requests are approved within 2–4 business hours."
            },
            {
                q: 'Can I send messages without a Sender ID?',
                a: 'No. A verified Sender ID is required before you can send any campaign. This ensures your recipients know who the message is from and complies with Ghana NCA regulations.'
            },
        ]
    },
    {
        category: 'Messaging & Campaigns',
        icon: 'send',
        color: 'blue',
        items: [
            {
                q: 'What is the difference between Sending and Delivering?',
                a: '"Sending" means messages are being dispatched to the carrier network. "Delivering" means they have been accepted and are en route to recipients. "Delivered" confirms the recipient\'s handset received it.'
            },
            {
                q: 'Why did my campaign fail?',
                a: 'Common reasons: insufficient wallet balance, unapproved Sender ID, temporary gateway outage, or invalid phone numbers. Check the campaign details for per-recipient error messages, top up your wallet if needed, and use the Retry button.'
            },
            {
                q: 'How do I retry a failed campaign?',
                a: "Go to Campaigns, find your failed campaign, and click the retry icon (↺). All failed messages will be re-queued. Make sure your wallet balance is sufficient before retrying."
            },
            {
                q: 'How many messages can I send per campaign?',
                a: 'There is no hard limit per campaign. You can send to your entire contact list at once. Large campaigns are automatically batched and processed in the background.'
            },
            {
                q: 'Can I schedule campaigns in advance?',
                a: 'Yes. When creating a campaign, click the "Schedule" toggle and pick a future date and time. The campaign will automatically broadcast at the selected time without any manual action.'
            },
        ]
    },
    {
        category: 'Contacts',
        icon: 'users',
        color: 'purple',
        items: [
            {
                q: 'What CSV format is required for uploading contacts?',
                a: 'Your CSV must have these columns (in any order): phone_number, first_name, last_name. The phone_number column is required; others are optional. Numbers can be in 0XXXXXXXXX or 233XXXXXXXXX format.'
            },
            {
                q: 'What happens to duplicate phone numbers?',
                a: 'Duplicates are automatically detected and skipped during upload. You will see a summary after upload showing how many were created, added to the segment, and skipped.'
            },
            {
                q: 'If I delete a segment, are my contacts deleted too?',
                a: 'No. Deleting a segment only removes the group — your contacts remain in the system and can still be found in other segments or added to new ones.'
            },
        ]
    },
    {
        category: 'Billing & Credits',
        icon: 'credit-card',
        color: 'emerald',
        items: [
            {
                q: 'How does the credit system work?',
                a: '1 credit = 1 standard SMS (up to 160 characters). Multi-part messages (over 160 chars) use proportionally more credits. Credits are deducted at the moment of dispatch and refunded if delivery fails.'
            },
            {
                q: 'Do my credits expire?',
                a: 'Pay-As-You-Go credits never expire. Subscription credits are allocated monthly and reset on your billing cycle. Unused subscription credits do not roll over.'
            },
            {
                q: 'What payment methods are supported?',
                a: 'NEXRA supports MTN Mobile Money, Vodafone Cash, AirtelTigo Money, and bank transfer. Payment confirmations are instant for mobile money.'
            },
            {
                q: 'What happens if I run out of credits mid-campaign?',
                a: 'Messages that cannot be sent due to insufficient balance are marked as failed. Top up your wallet and use the campaign retry feature to resend them.'
            },
        ]
    },
    {
        category: 'API & Integrations',
        icon: 'code',
        color: 'indigo',
        items: [
            {
                q: 'How do I get an API key?',
                a: "Go to Developer in the sidebar, click 'Create API Key', give it a name, and copy the key shown. It will only be displayed once — store it securely."
            },
            {
                q: 'What do I pass in API requests?',
                a: "Add the header X-API-Key: YOUR_KEY to every request. The send endpoint accepts a JSON body with 'recipient' (phone number), 'sender' (Sender ID), and 'message' fields."
            },
            {
                q: 'How do I receive delivery reports on my server?',
                a: "Set up a Webhook under Developer → Webhooks. Enter your publicly accessible URL and NEXRA will POST a signed JSON payload to it every time a message is delivered or fails."
            },
        ]
    },
    {
        category: 'Account & Security',
        icon: 'shield',
        color: 'rose',
        items: [
            {
                q: 'How do I change my password?',
                a: "Go to Settings from the sidebar and update your password in the Security section. You must enter your current password to set a new one."
            },
            {
                q: 'Can multiple users share one organization?',
                a: 'Yes. Your organization admin can invite additional team members. Each user has their own login but shares the organization wallet, contacts, and campaigns.'
            },
            {
                q: 'Is my data secure?',
                a: 'All data is encrypted in transit (TLS/HTTPS). API keys are hashed before storage — we never store the raw key. Webhook payloads are signed with HMAC-SHA256 so you can verify authenticity.'
            },
        ]
    }
];

const colorMap = {
    primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', text: 'text-primary-600 dark:text-primary-400', dot: 'bg-primary-500' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-600 dark:text-blue-400',     dot: 'bg-blue-500' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',     text: 'text-rose-600 dark:text-rose-400',     dot: 'bg-rose-500' },
};

const FAQItem = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return html`
        <div
            className="border border-gray-100 dark:border-midnight-800 rounded-2xl overflow-hidden transition-all"
            onClick=${() => setOpen(!open)}
        >
            <button className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 dark:hover:bg-midnight-900/40 transition-colors">
                <span className="font-bold text-sm text-gray-900 dark:text-white">${q}</span>
                <${Icon}
                    name=${open ? 'chevron-up' : 'chevron-down'}
                    size=${16}
                    className="text-gray-400 shrink-0 transition-transform"
                />
            </button>
            ${open ? html`
                <div className="px-5 pb-5 text-sm text-gray-600 dark:text-midnight-400 leading-relaxed border-t border-gray-50 dark:border-midnight-900 pt-4">
                    ${a}
                </div>
            ` : null}
        </div>
    `;
};

export const HelpPage = () => {
    const [activeCategory, setActiveCategory] = useState('all');

    const visibleCategories = activeCategory === 'all'
        ? faqData
        : faqData.filter(c => c.category === activeCategory);

    return html`
        <div className="space-y-6 fade-in max-w-5xl mx-auto pb-12">

            <!-- Hero Banner -->
            <${Card} className="bg-gradient-to-br from-primary-600 via-primary-700 to-blue-700 p-8 text-white relative overflow-hidden border-0 shadow-xl">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 blur-3xl rounded-full -ml-16 -mb-16 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Support Available 24/7</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black leading-tight">How can we help you?</h1>
                        <p className="text-blue-100/80 text-sm max-w-md">Find answers in our FAQ, read the full platform guide, or reach out to our support team directly.</p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <a href="mailto:frankbediako07@gmail.com" className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 text-xs font-bold uppercase tracking-wider">
                                <${Icon} name="mail" size=${16} />
                                frankbediako07@gmail.com
                            </a>
                            <a href="tel:+233549437374" className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 text-xs font-bold uppercase tracking-wider">
                                <${Icon} name="phone" size=${16} />
                                +233 54 943 7374
                            </a>
                            <a href="https://wa.me/233549437374" target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-green-500/30 hover:bg-green-500/50 rounded-xl transition-all border border-green-400/30 text-xs font-bold uppercase tracking-wider">
                                <${Icon} name="message-circle" size=${16} />
                                WhatsApp
                            </a>
                        </div>
                    </div>
                    <${Icon} name="help-circle" size=${100} className="opacity-10 hidden md:block shrink-0" />
                </div>
            </${Card}>

            <!-- Quick Resource Cards -->
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <${Card}
                    className="p-5 flex items-center gap-4 cursor-pointer hover:border-orange-300 hover:shadow-md transition-all group border-gray-100 dark:border-midnight-800"
                    onClick=${() => window.location.hash = '#/docs'}
                >
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform shrink-0">
                        <${Icon} name="book-open" size=${24} />
                    </div>
                    <div>
                        <h4 className="font-black text-sm text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Documentation</h4>
                        <p className="text-[11px] text-gray-500 dark:text-midnight-500 mt-0.5">Full platform guides</p>
                    </div>
                    <${Icon} name="chevron-right" size=${16} className="ml-auto text-gray-300 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                </${Card}>

                <${Card}
                    className="p-5 flex items-center gap-4 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group border-gray-100 dark:border-midnight-800"
                    onClick=${() => window.location.hash = '#/api-docs'}
                >
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0">
                        <${Icon} name="code" size=${24} />
                    </div>
                    <div>
                        <h4 className="font-black text-sm text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">API Reference</h4>
                        <p className="text-[11px] text-gray-500 dark:text-midnight-500 mt-0.5">Developer integrations</p>
                    </div>
                    <${Icon} name="chevron-right" size=${16} className="ml-auto text-gray-300 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </${Card}>

                <${Card}
                    className="p-5 flex items-center gap-4 border-gray-100 dark:border-midnight-800"
                >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                    </div>
                    <div>
                        <h4 className="font-black text-sm text-gray-900 dark:text-white">System Status</h4>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">All Systems Operational</p>
                        <p className="text-[10px] text-gray-400 dark:text-midnight-600">API latency: ~42ms</p>
                    </div>
                </${Card}>
            </div>

            <!-- Quick Start Steps -->
            <${Card} className="p-6 bg-white dark:bg-midnight-950 border-gray-100 dark:border-midnight-800 shadow-sm">
                <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <${Icon} name="zap" size=${20} className="text-amber-500" />
                    Quick Start Checklist
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    ${[
                        { step: 1, title: 'Create Account', desc: 'Register your organization', icon: 'user-plus', color: 'primary' },
                        { step: 2, title: 'Fund Wallet', desc: 'Purchase SMS credits', icon: 'credit-card', color: 'emerald' },
                        { step: 3, title: 'Request Sender ID', desc: 'Get your brand name approved', icon: 'tag', color: 'blue' },
                        { step: 4, title: 'Upload Contacts', desc: 'Add your recipient list', icon: 'upload-cloud', color: 'purple' },
                        { step: 5, title: 'Send Campaign', desc: 'Broadcast your message', icon: 'send', color: 'orange' },
                    ].map(({ step, title, desc, icon, color }) => {
                        const c = colorMap[color] || colorMap.primary;
                        return html`
                        <div key=${step} className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/40">
                            <div className="w-10 h-10 rounded-full ${c.bg} ${c.text} flex items-center justify-center font-black text-sm">
                                ${step}
                            </div>
                            <div>
                                <p className="font-black text-xs text-gray-900 dark:text-white">${title}</p>
                                <p className="text-[10px] text-gray-500 dark:text-midnight-500 mt-0.5">${desc}</p>
                            </div>
                        </div>
                    `;})}
                </div>
            </${Card}>

            <!-- FAQ Section -->
            <div>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="message-circle" size=${20} className="text-primary-600" />
                        Frequently Asked Questions
                    </h2>
                    <div className="text-[10px] text-gray-400 dark:text-midnight-600 font-bold uppercase tracking-widest">
                        ${faqData.reduce((acc, c) => acc + c.items.length, 0)} Questions
                    </div>
                </div>

                <!-- Category Filter Pills -->
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick=${() => setActiveCategory('all')}
                        className=${`px-4 py-2 rounded-full text-xs font-bold transition-all ${activeCategory === 'all' ? 'bg-primary-600 text-white shadow-glow' : 'bg-gray-100 dark:bg-midnight-900 text-gray-500 dark:text-midnight-400 hover:bg-gray-200 dark:hover:bg-midnight-800'}`}
                    >
                        All Topics
                    </button>
                    ${faqData.map(cat => {
                        const c = colorMap[cat.color];
                        const isActive = activeCategory === cat.category;
                        return html`
                            <button
                                key=${cat.category}
                                onClick=${() => setActiveCategory(cat.category)}
                                className=${`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${isActive ? `${c.bg} ${c.text}` : 'bg-gray-100 dark:bg-midnight-900 text-gray-500 dark:text-midnight-400 hover:bg-gray-200 dark:hover:bg-midnight-800'}`}
                            >
                                <${Icon} name=${cat.icon} size=${12} />
                                ${cat.category}
                            </button>
                        `;
                    })}
                </div>

                <!-- FAQ Groups -->
                <div className="space-y-8">
                    ${visibleCategories.map(category => {
                        const c = colorMap[category.color];
                        return html`
                            <div key=${category.category}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-xl ${c.bg} flex items-center justify-center">
                                        <${Icon} name=${category.icon} size=${14} className=${c.text} />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-700 dark:text-white uppercase tracking-widest">${category.category}</h3>
                                </div>
                                <div className="space-y-2">
                                    ${category.items.map(item => html`
                                        <${FAQItem} key=${item.q} q=${item.q} a=${item.a} />
                                    `)}
                                </div>
                            </div>
                        `;
                    })}
                </div>
            </div>

            <!-- Contact CTA -->
            <${Card} className="p-6 bg-gray-50 dark:bg-midnight-950 border-gray-100 dark:border-midnight-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-black text-gray-900 dark:text-white">Still need help?</h3>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-0.5">Our support team typically responds within 2 hours on business days.</p>
                </div>
                <a
                    href="mailto:frankbediako07@gmail.com"
                    className="shrink-0 flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-sm font-bold shadow-glow transition-all"
                >
                    <${Icon} name="mail" size=${16} />
                    Contact Support
                </a>
            </${Card}>
        </div>
    `;
};
