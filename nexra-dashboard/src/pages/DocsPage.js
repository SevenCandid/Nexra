import { html, useState } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';

const sections = [
    {
        id: 'introduction',
        icon: 'zap',
        title: 'Introduction to NEXRA',
        color: 'primary',
        content: [
            {
                heading: 'What is NEXRA?',
                body: `NEXRA is a powerful, enterprise-grade bulk SMS messaging platform built for businesses in Ghana and across Africa. It enables organizations to send high-volume SMS campaigns, manage contacts, track delivery in real time, and integrate programmatically via a REST API.\n\nWhether you're sending OTP codes, marketing blasts, appointment reminders, or transactional alerts — NEXRA handles it all through a clean, intuitive dashboard.`
            },
            {
                heading: 'Core Features',
                list: [
                    '📤 Bulk SMS Campaigns — Send to thousands of contacts in seconds',
                    '📋 Contact Segments — Organize audiences into smart groups',
                    '🟢 Real-time Delivery Tracking — Know exactly who received your message',
                    '💳 Wallet & Credit System — Pay-as-you-go and subscription credits',
                    '🔑 Sender ID Management — Brand your messages with a custom name',
                    '🔗 REST API — Build integrations with any language or framework',
                    '🪝 Webhooks — Receive delivery events on your own server',
                    '📝 Message Templates — Save and reuse your best messages',
                ]
            }
        ]
    },
    {
        id: 'getting-started',
        icon: 'play-circle',
        title: 'Getting Started',
        color: 'green',
        content: [
            {
                heading: 'Step 1 — Create Your Account',
                body: `Visit your NEXRA dashboard URL and click "Create Account". Fill in your full name, business email, organization name, and a strong password (min 8 characters, 1 uppercase, 1 digit). Click "Create Account" to proceed.\n\nIf you were invited by your organization's admin, you will have received a staff invitation link via email — use that to register directly under your organization.`
            },
            {
                heading: 'Step 2 — Fund Your Wallet',
                body: `Before sending messages, your account needs credits. Navigate to Wallet & Billing in the sidebar. You can purchase credits via mobile money (MTN, Vodafone, AirtelTigo) or bank transfer. Credits never expire and are shared across your entire organization.`
            },
            {
                heading: 'Step 3 — Request a Sender ID',
                body: `A Sender ID is the name your recipients see as the sender (e.g. "MY-BRAND"). Navigate to Sender IDs → Request New. Your Sender ID must be 3–11 characters with no spaces. Requests are reviewed by the NEXRA team and approved within 2–4 business hours.`
            },
            {
                heading: 'Step 4 — Add Your Contacts',
                body: `Go to Contacts → New Segment to create a group (e.g. "Marketing List" or "Premium Customers"). Inside the segment, you can:\n• Upload a CSV file (columns: phone_number, first_name, last_name)\n• Add contacts manually one by one\n• Import from another existing segment\n\nAll phone numbers should be in Ghana format (e.g. 0241234567 or 233241234567).`
            },
            {
                heading: 'Step 5 — Send Your First Campaign',
                body: `Navigate to Campaigns → New Campaign. Select your approved Sender ID, type your message, choose a contact segment, and optionally schedule a send time. Click "Launch Campaign" to broadcast immediately or schedule for later.`
            }
        ]
    },
    {
        id: 'sender-ids',
        icon: 'tag',
        title: 'Sender IDs',
        color: 'blue',
        content: [
            {
                heading: 'What is a Sender ID?',
                body: `A Sender ID is the alphanumeric name displayed to your recipients as the "From" field when they receive your SMS. Instead of seeing a random number, they see your brand name (e.g. "NEXRA", "SHOPIFY", "HOSPITAL").\n\nSender IDs must be registered and approved by Ghana's NCA via your SMS provider before they can be used.`
            },
            {
                heading: 'Rules & Requirements',
                list: [
                    'Must be 3–11 characters long',
                    'No spaces or special characters (hyphens allowed)',
                    'Must represent your actual business name',
                    'Cannot impersonate banks, government bodies, or other brands',
                    'Approval takes 2–4 business hours on weekdays',
                ]
            },
            {
                heading: 'Status Meanings',
                list: [
                    '🟡 Pending — Under review by NEXRA admin',
                    '✅ Approved — Ready to use in campaigns',
                    '❌ Rejected — Does not meet requirements (see admin comment)',
                ]
            }
        ]
    },
    {
        id: 'contacts',
        icon: 'users',
        title: 'Contacts & Segments',
        color: 'purple',
        content: [
            {
                heading: 'What are Segments?',
                body: `Segments are named groups of contacts (e.g. "VIP Customers", "Newsletter", "Accra Region"). You can send a campaign to one or more segments at a time. Contacts can belong to multiple segments simultaneously.`
            },
            {
                heading: 'CSV Upload Format',
                body: `When uploading contacts via CSV, ensure your file has these columns (order matters):\n\nphone_number, first_name, last_name\n\nExample:\n0241234567, John, Doe\n0551234567, Abena, Mensah\n\nThe phone_number column is required. All others are optional. Duplicate numbers are automatically skipped.`
            },
            {
                heading: 'Managing Contacts',
                list: [
                    'Open a segment to view, search, and remove individual members',
                    'Import contacts from another segment via the "Existing" tab',
                    'Remove a contact from a segment without deleting them system-wide',
                    'Delete a segment — contacts themselves are preserved',
                ]
            }
        ]
    },
    {
        id: 'campaigns',
        icon: 'send',
        title: 'Campaigns',
        color: 'orange',
        content: [
            {
                heading: 'Creating a Campaign',
                body: `Go to Campaigns → New Campaign. Fill in:\n• Campaign Name — internal reference only\n• Sender ID — must be pre-approved\n• Message — your SMS content (160 chars = 1 SMS, 320 = 2 SMS, etc.)\n• Recipients — select one or more contact segments\n• Schedule — optional date/time to auto-send`
            },
            {
                heading: 'Campaign Statuses',
                list: [
                    '🟡 Draft — Created but not yet sent',
                    '🕐 Scheduled — Will auto-send at the set time',
                    '🔵 Sending — Messages are being dispatched to recipients',
                    '🔵 Delivering — Sent, awaiting delivery confirmation from carriers',
                    '✅ Completed — All messages successfully delivered',
                    '❌ Failed — Most or all messages could not be delivered',
                ]
            },
            {
                heading: 'Retrying Failed Campaigns',
                body: `If a campaign fails due to a gateway outage or insufficient balance, navigate to the campaign and click the Retry button (↺). This re-queues all failed messages for reprocessing. Top up your wallet before retrying if the failure was credit-related.`
            },
            {
                heading: 'Viewing Delivery Logs',
                body: `In Messages History, expand any campaign to see a per-recipient delivery log. Each row shows the phone number, current status, and — for failed messages — the exact error reason from the carrier network.`
            }
        ]
    },
    {
        id: 'billing',
        icon: 'credit-card',
        title: 'Billing & Wallet',
        color: 'emerald',
        content: [
            {
                heading: 'How Credits Work',
                body: `NEXRA uses a credit-based billing system. 1 credit = 1 standard SMS (up to 160 characters) to a Ghana network. Multi-part messages (>160 chars) consume additional credits proportionally.\n\nCredits are deducted from your organization's wallet the moment a message is dispatched. If delivery fails, the credit is automatically refunded to your wallet.`
            },
            {
                heading: 'Credit Types',
                list: [
                    '📦 Subscription Credits — Allocated monthly based on your plan',
                    '💰 Pay-As-You-Go Credits — Purchased top-ups that never expire',
                    'Subscription credits are used first; PAYG credits are used when subscription balance runs out',
                ]
            },
            {
                heading: 'Topping Up',
                body: `Go to Wallet & Billing → Top Up. Choose your amount and preferred payment method (MoMo, card, or bank transfer). Payment is verified automatically, and credits appear in your wallet instantly upon confirmation.`
            },
            {
                heading: 'Ledger & History',
                body: `Every credit transaction (debit for SMS, credit for refunds or top-ups) is logged in your Billing History. You can export this ledger for accounting purposes.`
            }
        ]
    },
    {
        id: 'templates',
        icon: 'layout',
        title: 'Message Templates',
        color: 'pink',
        content: [
            {
                heading: 'What are Templates?',
                body: `Templates are saved message drafts that you can reuse across multiple campaigns. They save time when you repeatedly send similar messages (e.g. appointment reminders, OTPs, promotions).`
            },
            {
                heading: 'Creating a Template',
                body: `Go to Templates → New Template. Give it a recognizable title and write your message content. Templates support plain text only (no HTML). When creating a campaign, click "Use Template" to prefill the message field.`
            },
            {
                heading: 'Character Count',
                body: `NEXRA shows the character count for every template. Standard SMS supports 160 characters per message part. Going over results in a multi-part SMS which costs additional credits.`
            }
        ]
    },
    {
        id: 'api',
        icon: 'code',
        title: 'API Integration',
        color: 'indigo',
        content: [
            {
                heading: 'Overview',
                body: `NEXRA provides a REST API that lets you programmatically send SMS, manage contacts, and receive delivery reports. All API requests require an API key passed in the request header as X-API-Key.`
            },
            {
                heading: 'Authentication',
                body: `Generate an API key from the Developer → API page. Keep it secure — it grants full send access to your organization's account.\n\nHeader format:\nX-API-Key: nx_your_key_here`
            },
            {
                heading: 'Send SMS Endpoint',
                body: `POST /api/v1/sms/send\n\nRequest body:\n{\n  "recipient": "23324XXXXXXX",\n  "sender": "YOUR-SENDER-ID",\n  "message": "Your message here"\n}\n\nResponse:\n{\n  "id": 1234,\n  "status": "sent",\n  "recipient": "23324XXXXXXX",\n  "provider_name": "arkesel",\n  "created_at": "2026-04-22T12:00:00"\n}`
            },
            {
                heading: 'Rate Limits',
                list: [
                    'API requests are rate-limited per API key',
                    'Recommended: batch your sends into campaigns rather than individual API calls for large volumes',
                    'Contact support to request higher rate limits for enterprise use cases',
                ]
            }
        ]
    },
    {
        id: 'webhooks',
        icon: 'webhook',
        title: 'Webhooks',
        color: 'cyan',
        content: [
            {
                heading: 'What are Webhooks?',
                body: `Webhooks allow NEXRA to push delivery status events to your own server in real time. Instead of polling the API to check if a message was delivered, your server receives an HTTP POST the moment the carrier confirms delivery or failure.`
            },
            {
                heading: 'Setting Up a Webhook',
                body: `Go to Developer → Webhooks → Add URL. Enter your publicly accessible endpoint URL. NEXRA will send POST requests to this URL for every message.delivered and message.failed event from your organization.`
            },
            {
                heading: 'Payload Format',
                body: `{\n  "event": "message.delivered",\n  "timestamp": "2026-04-22T21:00:00",\n  "data": {\n    "id": 1234,\n    "recipient": "233241234567",\n    "status": "delivered",\n    "sent_at": "2026-04-22T20:59:00",\n    "delivered_at": "2026-04-22T21:00:00",\n    "error": null\n  }\n}`
            },
            {
                heading: 'Verifying Webhook Requests',
                body: `Every webhook request includes an X-Nexra-Signature header containing an HMAC-SHA256 signature of the payload, signed using your webhook secret. Always verify this signature on your server to ensure the request is legitimate.`
            }
        ]
    },
    {
        id: 'settings',
        icon: 'settings',
        title: 'Settings & Account',
        color: 'slate',
        content: [
            {
                heading: 'Profile Settings',
                body: `Navigate to Settings to update your display name, email address, and password. Changes take effect immediately.`
            },
            {
                heading: 'Organization Settings',
                body: `Organization admins can manage team members, invite staff, and configure organization-wide preferences from the Settings page.`
            },
            {
                heading: 'Dark Mode',
                body: `Click the moon/sun icon in the top navigation bar to toggle between light and dark mode. Your preference is saved automatically.`
            }
        ]
    }
];

const colorMap = {
    primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', text: 'text-primary-600 dark:text-primary-400', border: 'border-primary-200 dark:border-primary-800/50' },
    green:   { bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-600 dark:text-green-400',   border: 'border-green-200 dark:border-green-800/50' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-600 dark:text-blue-400',     border: 'border-blue-200 dark:border-blue-800/50' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800/50' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50' },
    pink:    { bg: 'bg-pink-50 dark:bg-pink-900/20',     text: 'text-pink-600 dark:text-pink-400',     border: 'border-pink-200 dark:border-pink-800/50' },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800/50' },
    cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',     text: 'text-cyan-600 dark:text-cyan-400',     border: 'border-cyan-200 dark:border-cyan-800/50' },
    slate:   { bg: 'bg-slate-50 dark:bg-slate-900/20',   text: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-200 dark:border-slate-800/50' },
};

export const DocsPage = () => {
    const [activeSection, setActiveSection] = useState('introduction');

    const currentSection = sections.find(s => s.id === activeSection);
    const colors = colorMap[currentSection.color];

    return html`
        <div className="fade-in max-w-6xl mx-auto pb-12">

            <!-- Header -->
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick=${() => window.location.hash = '#/help'} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                        <${Icon} name="arrow-left" size=${18} />
                    </button>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 rounded-full border border-primary-500/20">
                        <${Icon} name="book-open" size=${12} className="text-primary-600" />
                        <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Full Documentation</span>
                    </div>
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">NEXRA Platform Guide</h1>
                <p className="text-gray-500 dark:text-midnight-400 mt-1 text-sm max-w-xl">Everything you need to know about using NEXRA — from setup to advanced integrations.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

                <!-- Sidebar Nav -->
                <div className="lg:w-64 shrink-0">
                    <div className="sticky top-4 space-y-1">
                        ${sections.map(section => {
                            const c = colorMap[section.color];
                            const isActive = activeSection === section.id;
                            return html`
                                <button
                                    key=${section.id}
                                    onClick=${() => setActiveSection(section.id)}
                                    className=${`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all text-sm font-bold ${
                                        isActive
                                        ? `${c.bg} ${c.text} shadow-sm`
                                        : 'text-gray-500 dark:text-midnight-400 hover:bg-gray-50 dark:hover:bg-midnight-900/40'
                                    }`}
                                >
                                    <${Icon} name=${section.icon} size=${16} className=${isActive ? c.text : 'text-gray-400'} />
                                    ${section.title}
                                </button>
                            `;
                        })}
                    </div>
                </div>

                <!-- Content -->
                <div className="flex-1 min-w-0">
                    <${Card} className="p-6 sm:p-8 bg-white dark:bg-midnight-950 border-gray-100 dark:border-midnight-800 shadow-sm">

                        <!-- Section Header -->
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-midnight-800">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colors.bg}">
                                <${Icon} name=${currentSection.icon} size=${24} className=${colors.text} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white">${currentSection.title}</h2>
                                <p className="text-xs font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-0.5">NEXRA Documentation</p>
                            </div>
                        </div>

                        <!-- Section Content -->
                        <div className="space-y-8">
                            ${currentSection.content.map((block, i) => html`
                                <div key=${i} className="space-y-3">
                                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="w-1.5 h-5 rounded-full ${colors.bg.replace('bg-', 'bg-').replace('/20', '/50')} block"></span>
                                        ${block.heading}
                                    </h3>
                                    ${block.body ? html`
                                        <div className="space-y-2">
                                            ${block.body.split('\n').map((line, li) => line.trim() ? html`
                                                <p key=${li} className=${`text-sm leading-relaxed ${line.startsWith('{') || line.startsWith('POST') || line.startsWith('X-API') || line.startsWith('"') || line.startsWith('}') ? 'font-mono text-xs bg-gray-50 dark:bg-midnight-900/60 px-4 py-1 rounded-lg text-gray-800 dark:text-gray-300' : 'text-gray-600 dark:text-midnight-400'}`}>${line}</p>
                                            ` : html`<div key=${li} className="h-2"></div>`)}
                                        </div>
                                    ` : null}
                                    ${block.list ? html`
                                        <ul className="space-y-2">
                                            ${block.list.map((item, ii) => html`
                                                <li key=${ii} className="flex items-start gap-3 text-sm text-gray-600 dark:text-midnight-400">
                                                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${colors.bg.replace('/20', '/80')} ${colors.text}"></span>
                                                    ${item}
                                                </li>
                                            `)}
                                        </ul>
                                    ` : null}
                                </div>
                            `)}
                        </div>

                        <!-- Navigation Footer -->
                        <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-100 dark:border-midnight-800">
                            ${sections.findIndex(s => s.id === activeSection) > 0 ? html`
                                <button
                                    onClick=${() => setActiveSection(sections[sections.findIndex(s => s.id === activeSection) - 1].id)}
                                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary-600 dark:text-midnight-400 dark:hover:text-primary-400 transition-colors"
                                >
                                    <${Icon} name="arrow-left" size=${16} />
                                    ${sections[sections.findIndex(s => s.id === activeSection) - 1].title}
                                </button>
                            ` : html`<div></div>`}
                            ${sections.findIndex(s => s.id === activeSection) < sections.length - 1 ? html`
                                <button
                                    onClick=${() => setActiveSection(sections[sections.findIndex(s => s.id === activeSection) + 1].id)}
                                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary-600 dark:text-midnight-400 dark:hover:text-primary-400 transition-colors"
                                >
                                    ${sections[sections.findIndex(s => s.id === activeSection) + 1].title}
                                    <${Icon} name="arrow-right" size=${16} />
                                </button>
                            ` : html`<div></div>`}
                        </div>
                    </${Card}>
                </div>
            </div>
        </div>
    `;
};
