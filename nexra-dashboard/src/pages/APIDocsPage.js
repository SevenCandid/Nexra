import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Icon } from '../components/ui/Icon.js';
import { Modal } from '../components/ui/Modal.js';
import { useToast } from '../context/ToastContext.js';
import apiClient from '../api/client.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';

export const APIDocsPage = () => {
    const { showToast } = useToast();

    // API Keys state
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [confirmRevoke, setConfirmRevoke] = useState({ open: false, id: null });
    const [isRevoking, setIsRevoking] = useState(false);

    // Webhooks state
    const [webhooks, setWebhooks] = useState([]);
    const [webhookLoading, setWebhookLoading] = useState(true);
    const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [isSavingWebhook, setIsSavingWebhook] = useState(false);
    const [confirmDeleteWebhook, setConfirmDeleteWebhook] = useState({ open: false, id: null });
    const [isDeletingWebhook, setIsDeletingWebhook] = useState(false);

    // Doc tab
    const [docTab, setDocTab] = useState('curl');

    const fetchApiKeys = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/developer/api-keys');
            setApiKeys(res.data);
        } catch (error) {
            showToast('Failed to fetch API keys', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchWebhooks = async () => {
        setWebhookLoading(true);
        try {
            const res = await apiClient.get('/developer/webhooks');
            setWebhooks(res.data || []);
        } catch (error) {
            console.error('Failed to fetch webhooks', error);
        } finally {
            setWebhookLoading(false);
        }
    };

    useEffect(() => {
        fetchApiKeys();
        fetchWebhooks();
    }, []);

    const handleCreateKey = async (e) => {
        e.preventDefault();
        setIsGenerating(true);
        try {
            const res = await apiClient.post('/developer/api-keys', { name: newKeyName });
            setCreatedKey(res.data.api_key);
            setNewKeyName('');
            fetchApiKeys();
        } catch (error) {
            showToast('Failed to generate key', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevokeKey = async () => {
        setIsRevoking(true);
        try {
            await apiClient.delete(`/developer/api-keys/${confirmRevoke.id}`);
            showToast('API key revoked', 'success');
            setConfirmRevoke({ open: false, id: null });
            fetchApiKeys();
        } catch (error) {
            showToast('Failed to revoke key', 'error');
        } finally {
            setIsRevoking(false);
        }
    };

    const handleCreateWebhook = async (e) => {
        e.preventDefault();
        setIsSavingWebhook(true);
        try {
            await apiClient.post('/developer/webhooks', {
                url: newWebhookUrl,
                events: ['message.delivered', 'message.failed']
            });
            setNewWebhookUrl('');
            setShowNewWebhookModal(false);
            showToast('Webhook registered successfully', 'success');
            fetchWebhooks();
        } catch (error) {
            showToast('Failed to register webhook: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        } finally {
            setIsSavingWebhook(false);
        }
    };

    const handleDeleteWebhook = async () => {
        setIsDeletingWebhook(true);
        try {
            await apiClient.delete(`/developer/webhooks/${confirmDeleteWebhook.id}`);
            showToast('Webhook removed', 'success');
            setConfirmDeleteWebhook({ open: false, id: null });
            fetchWebhooks();
        } catch (error) {
            showToast('Failed to remove webhook', 'error');
        } finally {
            setIsDeletingWebhook(false);
        }
    };

    const codeExamples = {
        curl: `curl -X POST "https://your-domain.com/api/v1/sms/send" \\
     -H "X-API-Key: YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     -d '{"recipient":"23324XXXXXXX","sender":"NEXRA","message":"Hello!"}'`,
        python: `import requests

headers = {"X-API-Key": "YOUR_API_KEY"}
data = {
    "recipient": "23324XXXXXXX",
    "sender": "NEXRA",
    "message": "Hello from Nexra!"
}
response = requests.post(
    "https://your-domain.com/api/v1/sms/send",
    json=data, headers=headers
)
print(response.json())`,
        javascript: `const response = await fetch('https://your-domain.com/api/v1/sms/send', {
  method: 'POST',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient: '23324XXXXXXX',
    sender: 'NEXRA',
    message: 'Hello from Nexra!'
  })
});
const data = await response.json();
console.log(data);`
    };

    return html`
        <div className="space-y-6 fade-in max-w-5xl mx-auto pb-12">
            <${Card} className="relative overflow-hidden p-6 sm:p-8 border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-950 shadow-sm">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 dark:bg-primary-600/5 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 rounded-full border border-primary-500/20">
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                            <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Developer API</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">Build with NEXRA</h2>
                        <p className="text-gray-500 dark:text-midnight-400 text-sm max-w-md">Programmatically send SMS, manage contacts, and track delivery with our REST API.</p>
                        <${Button} variant="primary" onClick=${() => setShowNewKeyModal(true)} className="rounded-2xl px-6 shadow-glow mt-2">
                            <${Icon} name="plus" size=${18} className="mr-2" />
                            Create API Key
                        </${Button}>
                    </div>
                    <${Icon} name="terminal" size=${64} className="text-primary-500/20 hidden md:block" />
                </div>
            </${Card}>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <!-- API Keys Column -->
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xs font-black text-gray-500 dark:text-white uppercase tracking-widest flex items-center gap-2 px-1">
                        <${Icon} name="key" size=${14} className="text-primary-600" />
                        Your API Keys
                    </h3>
                    <${Card} className="divide-y divide-gray-50 dark:divide-midnight-800 bg-white dark:bg-midnight-950 shadow-sm overflow-hidden">
                        ${loading ? html`<div className="p-8 text-center"><${Icon} name="loader-2" size=${24} className="animate-spin text-primary-600 mx-auto" /></div>`
                        : apiKeys.length === 0 ? html`<div className="p-8 text-center text-gray-400 dark:text-midnight-600"><p className="text-[10px] font-bold uppercase tracking-widest">No keys yet</p></div>`
                        : apiKeys.map(key => html`
                            <div key=${key.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-midnight-900/40 transition-colors">
                                <div>
                                    <p className="text-xs font-black text-gray-900 dark:text-white">${key.name}</p>
                                    <p className="text-[9px] font-mono text-gray-400 dark:text-midnight-500 mt-1">${key.key_prefix}••••••••••••</p>
                                </div>
                                <button onClick=${() => setConfirmRevoke({ open: true, id: key.id })} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Revoke">
                                    <${Icon} name="trash-2" size=${14} />
                                </button>
                            </div>
                        `)}
                    </${Card}>
                </div>

                <!-- Webhooks Column -->
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black text-gray-500 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <${Icon} name="webhook" size=${14} className="text-primary-600" />
                            Webhooks
                        </h3>
                        <button onClick=${() => setShowNewWebhookModal(true)} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 transition-colors">
                            + ADD URL
                        </button>
                    </div>
                    <${Card} className="divide-y divide-gray-50 dark:divide-midnight-800 bg-white dark:bg-midnight-950 shadow-sm overflow-hidden">
                        ${webhookLoading ? html`<div className="p-8 text-center"><${Icon} name="loader-2" size=${24} className="animate-spin text-primary-600 mx-auto" /></div>`
                        : webhooks.length === 0 ? html`
                            <div className="p-8 text-center text-gray-400 dark:text-midnight-600">
                                <${Icon} name="zap-off" size=${24} className="mx-auto mb-2 opacity-30" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">No webhooks</p>
                            </div>
                        `
                        : webhooks.map(webhook => html`
                            <div key=${webhook.id} className="p-4 flex flex-col gap-2 hover:bg-gray-50 dark:hover:bg-midnight-900/40 transition-colors">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate" title=${webhook.url}>
                                        ${webhook.url}
                                    </p>
                                    <button onClick=${() => setConfirmDeleteWebhook({ open: true, id: webhook.id })} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove">
                                        <${Icon} name="trash-2" size=${14} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-red-500'}"></span>
                                    <p className="text-[9px] font-mono text-gray-400 dark:text-midnight-500 truncate">Secret: ${webhook.secret.substring(0,8)}...</p>
                                </div>
                            </div>
                        `)}
                    </${Card}>
                </div>

                <!-- Quick Start Column -->
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xs font-black text-gray-500 dark:text-white uppercase tracking-widest flex items-center gap-2 px-1">
                        <${Icon} name="book-open" size=${14} className="text-primary-600" />
                        Quick Start
                    </h3>
                    <${Card} className="overflow-hidden bg-white dark:bg-midnight-950 border-gray-100 dark:border-midnight-800 shadow-sm">
                        <div className="flex border-b border-gray-100 dark:border-midnight-800 bg-gray-100/50 dark:bg-midnight-900/50">
                            ${['curl', 'python', 'javascript'].map(tab => html`
                                <button onClick=${() => setDocTab(tab)} className=${`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${docTab === tab ? 'border-primary-600 text-primary-600 bg-white dark:bg-midnight-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-midnight-500 dark:hover:text-midnight-300'}`}>
                                    ${tab === 'curl' ? 'cURL' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            `)}
                        </div>
                        <div className="p-4 bg-[#0f172a] relative border-x-0">
                            <button onClick=${() => { navigator.clipboard.writeText(codeExamples[docTab]); showToast('Copied!', 'success'); }}
                                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/50 hover:text-white transition-all">
                                <${Icon} name="copy" size=${14} />
                            </button>
                            <pre className="text-[10px] font-mono text-white overflow-x-auto leading-relaxed whitespace-pre">${codeExamples[docTab]}</pre>
                        </div>
                        <div className="p-3 border-t border-gray-100 dark:border-midnight-800 flex gap-2 bg-white dark:bg-midnight-900">
                            <${Icon} name="info" size=${16} className="text-primary-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-gray-700 dark:text-white font-bold leading-relaxed">
                                Pass <code className="bg-primary-100 dark:bg-primary-600/30 px-1.5 py-0.5 rounded text-primary-700 dark:text-primary-400 font-black">X-API-Key: YOUR_KEY</code> in every request.
                            </p>
                        </div>
                    </${Card}>
                </div>
            </div>

            <!-- Webhook Payload Format -->
            <${Card} className="p-6 bg-white dark:bg-midnight-950 border-gray-100 dark:border-midnight-800 shadow-sm">
                <h3 className="text-xs font-black text-gray-500 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                    <${Icon} name="zap" size=${14} className="text-primary-600" />
                    Webhook Payload Format
                </h3>
                <div className="bg-[#0f172a] rounded-2xl p-5 overflow-x-auto">
                    <pre className="text-[11px] font-mono text-white leading-relaxed">${`{
  "event": "message.delivered",   // or "message.failed"
  "timestamp": "2026-04-22T21:00:00",
  "data": {
    "id": 1234,
    "recipient": "233241234567",
    "status": "delivered",
    "provider_msg_id": "abc123xyz",
    "sent_at": "2026-04-22T20:59:00",
    "delivered_at": "2026-04-22T21:00:00",
    "error": null
  }
}`}</pre>
                </div>
                <p className="text-xs text-gray-500 dark:text-midnight-500 mt-3 font-medium">
                    All requests are signed with <code className="font-mono bg-gray-100 dark:bg-midnight-900 px-1.5 rounded">X-Nexra-Signature: HMAC-SHA256</code> using your webhook secret for verification.
                </p>
            </${Card}>

            <!-- Generate API Key Modal -->
            <${Modal} isOpen=${showNewKeyModal} onClose=${() => { setShowNewKeyModal(false); setCreatedKey(null); }} title="Generate API Key">
                ${createdKey ? html`
                    <div className="space-y-6 text-center py-2">
                        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <${Icon} name="check" size=${28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold dark:text-white">Key Generated!</h3>
                            <p className="text-sm text-gray-500 mt-1">Copy now — it won't be shown again.</p>
                        </div>
                        <div className="relative">
                            <div className="p-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-900 font-mono text-xs text-primary-600 break-all select-all text-left">
                                ${createdKey}
                            </div>
                            <button onClick=${() => { navigator.clipboard.writeText(createdKey); showToast('Copied!', 'success'); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-xl shadow-glow">
                                <${Icon} name="copy" size=${14} />
                            </button>
                        </div>
                        <${Button} variant="primary" onClick=${() => { setShowNewKeyModal(false); setCreatedKey(null); }} className="w-full py-3 rounded-2xl font-black uppercase tracking-widest">
                            I've stored it safely ✓
                        </${Button}>
                    </div>
                ` : html`
                    <form onSubmit=${handleCreateKey} className="space-y-5">
                        <p className="text-sm text-gray-500">Give your key a name to identify it later (e.g. "Production App").</p>
                        <${Input} label="Key Name" placeholder='e.g. My Integration' required value=${newKeyName} onChange=${(e) => setNewKeyName(e.target.value)} />
                        <div className="flex gap-3 pt-1">
                            <${Button} type="button" variant="outline" onClick=${() => setShowNewKeyModal(false)} className="flex-1 rounded-2xl">Cancel</${Button}>
                            <${Button} type="submit" className="flex-1 rounded-2xl py-3 shadow-glow" disabled=${isGenerating || !newKeyName.trim()}>
                                ${isGenerating ? 'Generating...' : 'Generate Key'}
                            </${Button}>
                        </div>
                    </form>
                `}
            </${Modal}>

            <!-- Add Webhook Modal -->
            <${Modal} isOpen=${showNewWebhookModal} onClose=${() => setShowNewWebhookModal(false)} title="Add Webhook Endpoint">
                <form onSubmit=${handleCreateWebhook} className="space-y-5 pt-2">
                    <p className="text-sm text-gray-500 dark:text-midnight-500 font-medium">
                        Nexra will send a signed HTTP POST to this URL whenever a message is delivered or fails.
                    </p>
                    <${Input}
                        label="Endpoint URL"
                        placeholder="https://your-domain.com/webhook"
                        type="url"
                        value=${newWebhookUrl}
                        onChange=${(e) => setNewWebhookUrl(e.target.value)}
                        required
                    />
                    <div className="flex gap-4 pt-2">
                        <${Button} type="button" variant="outline" className="flex-1 rounded-2xl py-3.5" onClick=${() => setShowNewWebhookModal(false)}>
                            Cancel
                        </${Button}>
                        <${Button} type="submit" variant="primary" loading=${isSavingWebhook} className="flex-1 rounded-2xl py-3.5 shadow-glow">
                            Save Endpoint
                        </${Button}>
                    </div>
                </form>
            </${Modal}>

            <!-- Revoke API Key Confirm -->
            <${ConfirmModal}
                isOpen=${confirmRevoke.open}
                onClose=${() => setConfirmRevoke({ open: false, id: null })}
                onConfirm=${handleRevokeKey}
                loading=${isRevoking}
                title="Revoke API Key?"
                message="This will immediately disable all integrations using this key. This cannot be undone."
                confirmText="Revoke Key"
                variant="danger"
            />

            <!-- Delete Webhook Confirm -->
            <${ConfirmModal}
                isOpen=${confirmDeleteWebhook.open}
                onClose=${() => setConfirmDeleteWebhook({ open: false, id: null })}
                onConfirm=${handleDeleteWebhook}
                loading=${isDeletingWebhook}
                title="Remove Webhook?"
                message="Delivery reports will no longer be sent to this URL."
                confirmText="Remove Webhook"
                variant="danger"
            />
        </div>
    `;
};
