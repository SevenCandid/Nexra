import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Icon } from '../components/ui/Icon.js';
import { Modal } from '../components/ui/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import apiClient from '../api/client.js';

export const APIDocsPage = () => {
    const { showToast } = useToast();
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
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

    useEffect(() => { fetchApiKeys(); }, []);

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

    const handleRevokeKey = async (id) => {
        if (!confirm('Are you sure? This will immediately disable all integrations using this key.')) return;
        try {
            await apiClient.delete(`/developer/api-keys/${id}`);
            showToast('API key revoked', 'success');
            fetchApiKeys();
        } catch (error) {
            showToast('Failed to revoke key', 'error');
        }
    };

    const codeExamples = {
        curl: `curl -X POST "http://localhost:8000/api/v1/sms/send" \\
     -H "X-API-Key: YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     -d '{"recipient":"23324XXXXXXX","sender":"NEXRA","message":"Hello!"}'`,
        python: `import requests\n\nheaders = {"X-API-Key": "YOUR_API_KEY"}\ndata = {"recipient": "23324XXXXXXX", "sender": "NEXRA", "message": "Hello!"}\nresponse = requests.post(\n    "http://localhost:8000/api/v1/sms/send",\n    json=data, headers=headers\n)\nprint(response.json())`,
        javascript: `fetch('http://localhost:8000/api/v1/sms/send', {\n  method: 'POST',\n  headers: {'X-API-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json'},\n  body: JSON.stringify({recipient: '23324XXXXXXX', sender: 'NEXRA', message: 'Hello!'})\n}).then(r => r.json()).then(console.log);`
    };

    return html`
        <div className="space-y-6 fade-in max-w-5xl mx-auto pb-12">
            <${Card} className="relative overflow-hidden p-6 sm:p-8 border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-950 shadow-sm">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 dark:bg-primary-600/5 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 rounded-full border border-primary-500/20">
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                            <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Developer Beta</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">Build with NEXRA</h2>
                        <p className="text-gray-500 dark:text-midnight-400 text-sm max-w-md">Programmatically send SMS, manage contacts, and track delivery with our REST API.</p>
                        <${Button} variant="primary" onClick=${() => setShowNewKeyModal(true)} className="rounded-2xl px-6 shadow-glow mt-2">
                            <${Icon} name="plus" size=${18} className="mr-2" />
                            Create API Key
                        </${Button} mt-2>
                    </div>
                    <${Icon} name="terminal" size=${64} className="text-primary-500/20 hidden md:block" />
                </div>
            </${Card}>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                <button onClick=${() => handleRevokeKey(key.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                    <${Icon} name="trash-2" size=${14} />
                                </button>
                            </div>
                        `)}
                    </${Card}>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-gray-500 dark:text-white uppercase tracking-widest flex items-center gap-2 px-1">
                        <${Icon} name="book-open" size=${14} className="text-primary-600" />
                        Quick Start
                    </h3>
                    <${Card} className="overflow-hidden bg-white dark:bg-midnight-950 border-gray-100 dark:border-midnight-800 shadow-sm">
                        <div className="flex border-b border-gray-100 dark:border-midnight-800 bg-gray-100/50 dark:bg-midnight-900/50">
                            ${['curl', 'python', 'javascript'].map(tab => html`
                                <button onClick=${() => setDocTab(tab)} className=${`px-5 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${docTab === tab ? 'border-primary-600 text-primary-600 bg-white dark:bg-midnight-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-midnight-500 dark:hover:text-midnight-300'}`}>
                                    ${tab === 'curl' ? 'cURL' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            `)}
                        </div>
                        <div className="p-4 sm:p-6 bg-[#0f172a] relative border-x-0">
                            <button onClick=${() => { navigator.clipboard.writeText(codeExamples[docTab]); showToast('Copied!', 'success'); }}
                                className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white/50 hover:text-white transition-all backdrop-blur-sm">
                                <${Icon} name="copy" size=${16} />
                            </button>
                            <pre className="text-[11px] sm:text-xs font-mono text-white selection:bg-primary-500/50 overflow-x-auto leading-relaxed whitespace-pre font-medium" style=${{ color: 'white' }}>${codeExamples[docTab]}</pre>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-midnight-800 flex gap-3 bg-white dark:bg-midnight-900">
                            <${Icon} name="info" size=${18} className="text-primary-600 shrink-0 mt-0.5" />
                            <p className="text-[12px] text-gray-900 dark:text-white font-bold leading-relaxed">
                                Include <code className="bg-primary-100 dark:bg-primary-600/30 px-2 py-0.5 rounded text-primary-700 dark:text-primary-400 font-black">X-API-Key: YOUR_KEY</code> in every request header.
                            </p>
                        </div>
                    </${Card}>
                </div>
            </div>

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
        </div>
    `;
};
