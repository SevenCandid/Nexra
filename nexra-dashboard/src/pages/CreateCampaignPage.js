import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { SenderIDSelect } from '../components/SenderIDSelect.js';
import { TemplateSelector } from '../components/ui/TemplateSelector.js';
import { BroadcastCheckoutModal } from '../components/BroadcastCheckoutModal.js';
import { RecipientSelector } from '../components/RecipientSelector.js';

const getNetworkBadge = (network) => {
    if (!network) return null;
    let colorClasses = 'bg-gray-100 text-gray-700 dark:bg-midnight-800 dark:text-midnight-300';
    const lower = network.toLowerCase();
    if (lower.includes('mtn')) {
        colorClasses = 'bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300';
    } else if (lower.includes('vodafone') || lower.includes('telecel')) {
        colorClasses = 'bg-red-500/10 text-red-700 border border-red-500/20 dark:bg-red-500/20 dark:text-red-300';
    } else if (lower.includes('airtel') || lower.includes('tigo') || lower.includes('at ')) {
        colorClasses = 'bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300';
    }
    return html`
        <span className=${`text-[9px] font-black px-2 py-0.5 rounded-full ${colorClasses}`}>
            ${network}
        </span>
    `;
};

export const CreateCampaignPage = () => {
    const { showToast } = useToast();
    const [step, setStep] = useState(() => parseInt(sessionStorage.getItem('cc_step')) || 1);
    const [formData, setFormData] = useState(() => {
        const saved = sessionStorage.getItem('cc_formData');
        return saved ? JSON.parse(saved) : { name: '', sender: '', template: '', scheduled_at: '' };
    });
    const [contacts, setContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState(() => {
        const saved = sessionStorage.getItem('cc_selectedContacts');
        return saved ? JSON.parse(saved) : [];
    });
    const [rawContacts, setRawContacts] = useState(() => {
        const saved = sessionStorage.getItem('cc_rawContacts');
        return saved ? JSON.parse(saved) : [];
    });
    const [contactPersistence, setContactPersistence] = useState(() => sessionStorage.getItem('cc_persistence') || 'temporary');
    const [groupName, setGroupName] = useState(() => sessionStorage.getItem('cc_groupName') || '');
    const [loading, setLoading] = useState(false);
    const [recipientMode, setRecipientMode] = useState('none');
    const [searchQuery, setSearchQuery] = useState('');
    const [newContact, setNewContact] = useState({ first_name: '', last_name: '', phone_number: '' });
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState(() => {
        const saved = sessionStorage.getItem('cc_selectedGroups');
        return saved ? JSON.parse(saved) : [];
    });
    const [previewContact, setPreviewContact] = useState({ first_name: 'John', last_name: 'Doe', phone_number: '233241234567' });
    const [checkoutCampaign, setCheckoutCampaign] = useState(null);

    // Save state to sessionStorage whenever it changes
    useEffect(() => {
        if (!isEditMode) {
            sessionStorage.setItem('cc_step', step);
            sessionStorage.setItem('cc_formData', JSON.stringify(formData));
            sessionStorage.setItem('cc_selectedContacts', JSON.stringify(selectedContacts));
            sessionStorage.setItem('cc_rawContacts', JSON.stringify(rawContacts));
            sessionStorage.setItem('cc_persistence', contactPersistence);
            sessionStorage.setItem('cc_groupName', groupName);
            sessionStorage.setItem('cc_selectedGroups', JSON.stringify(selectedGroups));
        }
    }, [step, formData, selectedContacts, rawContacts, contactPersistence, groupName, selectedGroups]);

    // Update preview contact based on selection
    useEffect(() => {
        const updatePreview = async () => {
            // Priority 1: Specifically selected individual contacts
            if (selectedContacts.length > 0) {
                const contact = contacts.find(c => c.id === selectedContacts[0]);
                if (contact) {
                    setPreviewContact(contact);
                    return;
                }
            }
            
            // Priority 2: Contacts from selected segments
            if (selectedGroups.length > 0) {
                try {
                    const response = await apiClient.get(`/groups/${selectedGroups[0]}/contacts`);
                    const groupContacts = response.data || [];
                    if (groupContacts.length > 0) {
                        setPreviewContact(groupContacts[0]);
                        return;
                    }
                } catch (error) {
                    console.error('Failed to fetch group contact for preview:', error);
                }
            }

            // Fallback: Default placeholder if nothing else is available
            if (selectedContacts.length === 0 && selectedGroups.length === 0) {
                setPreviewContact({ first_name: 'John', last_name: 'Doe', phone_number: '233241234567' });
            }
        };
        updatePreview();
    }, [selectedContacts, selectedGroups, contacts]);

    // Edit Mode Support
    const editId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('edit');
    const isEditMode = !!editId;

    useEffect(() => {
        if (isEditMode) {
            fetchCampaignToEdit();
        }
    }, [editId]);

    const fetchCampaignToEdit = async () => {
        try {
            const response = await apiClient.get(`/campaigns/${editId}`);
            const camp = response.data;
            setFormData({
                name: camp.name,
                sender: camp.sender,
                template: camp.template,
                scheduled_at: camp.scheduled_at ? camp.scheduled_at.split('Z')[0] : '',
            });
            // Note: Recipient selection editing is more complex, 
            // for now we focus on name/template/schedule.
        } catch (error) {
            showToast('Failed to load campaign for editing', 'error');
        }
    };

    useEffect(() => {
        if (step === 2 || showContactModal || showGroupModal) {
            fetchContacts();
            fetchGroups();
        }
    }, [step, showContactModal, showGroupModal]);

    const fetchGroups = async () => {
        try {
            const response = await apiClient.get('/groups');
            setGroups(response.data || []);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        }
    };

    const fetchContacts = async () => {
        try {
            const response = await apiClient.get('/contacts');
            setContacts(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
        }
    };

    const handleAddManualContact = async () => {
        if (!newContact.phone_number) return;
        setIsSavingContact(true);
        try {
            const response = await apiClient.post('/contacts', newContact);
            const savedContact = response.data;
            setContacts([...contacts, savedContact]);
            setSelectedContacts([...selectedContacts, savedContact.id]);
            setNewContact({ first_name: '', last_name: '', phone_number: '' });
            // Stay on manual mode so user can add more
        } catch (error) {
            showToast('Failed to save contact: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        } finally {
            setIsSavingContact(false);
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedContacts(filteredContacts.map(c => c.id));
        } else {
            setSelectedContacts([]);
        }
    };

    const filteredContacts = contacts.filter(c =>
        (c.first_name + ' ' + c.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_number.includes(searchQuery)
    );

    const selectedContactObjects = contacts.filter(c => selectedContacts.includes(c.id));

    const clearSessionState = () => {
        ['cc_step', 'cc_formData', 'cc_selectedContacts', 'cc_rawContacts', 'cc_persistence', 'cc_groupName', 'cc_selectedGroups'].forEach(k => sessionStorage.removeItem(k));
    };

    const handleSubmit = async (shouldBroadcast = false, redirect = true) => {
        setLoading(true);
        try {
            const payload = {
                ...formData,
                scheduled_at: formData.scheduled_at || null,
                contact_ids: selectedContacts,
                group_ids: selectedGroups,
                raw_contacts: rawContacts,
                contact_persistence: contactPersistence,
                group_name: groupName
            };
            
            let campaignId = editId;
            if (isEditMode) {
                await apiClient.put(`/campaigns/${editId}`, payload);
                showToast('Campaign details updated', 'success');
            } else {
                const response = await apiClient.post('/campaigns', payload);
                campaignId = response.data.id;
                showToast('Campaign record saved', 'success');
            }

            if (shouldBroadcast) {
                showToast('Starting broadcast...', 'info');
                await apiClient.post(`/campaigns/${campaignId}/broadcast`);
                showToast('Broadcast initiated successfully!', 'success');
            }

            if (redirect) {
                clearSessionState();
                window.location.href = '#/campaigns';
            }
            return campaignId;
        } catch (error) {
            let errorMsg = 'Unknown error';
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    errorMsg = error.response.data.detail[0].msg;
                } else {
                    errorMsg = error.response.data.detail;
                }
            }
            showToast(`Action failed: ` + errorMsg, 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleBroadcastClick = async () => {
        const campaignId = await handleSubmit(false, false);
        if (!campaignId) return;

        const groupRecipients = groups
            .filter(g => selectedGroups.includes(g.id))
            .reduce((acc, g) => acc + g.contact_count, 0);
        const totalRecipients = selectedContacts.length + groupRecipients + rawContacts.length;

        setCheckoutCampaign({
            id: campaignId,
            name: formData.name,
            template: formData.template,
            total_recipients: totalRecipients
        });
    };

    const confirmBroadcast = async (usePayg) => {
        if (!checkoutCampaign) return;
        const campaignId = checkoutCampaign.id;
        setCheckoutCampaign(null);
        setLoading(true);
        try {
            showToast('Starting broadcast...', 'info');
            await apiClient.post(`/campaigns/${campaignId}/broadcast?use_payg=${usePayg}`);
            showToast('Broadcast started successfully!', 'success');
            clearSessionState();
            window.location.href = '#/campaigns';
        } catch (error) {
            showToast('Broadcast failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div className="max-w-3xl mx-auto space-y-6 fade-in">

            <div className="flex gap-2">
                ${[1, 2, 3, 4].map((s) => html`
                    <div
                        key=${s}
                        className="flex-1 h-2 rounded-full ${s <= step ? 'bg-primary-600' : 'bg-gray-200'}"
                    />
                `)}
            </div>

            <${Card} className="p-6">
                ${step === 1 && html`
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Campaign Details</h2>
                            <a href="#/sender-ids" className="text-xs font-bold text-primary-600 hover:underline">Request New ID</a>
                        </div>
                        <${Input}
                            label="Campaign Name"
                            value=${formData.name}
                            onChange=${(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Summer Sale 2024"
                            required
                        />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-midnight-300">Sender ID</label>
                            <${SenderIDSelect} 
                                value=${formData.sender} 
                                onChange=${(val) => setFormData({ ...formData, sender: val })} 
                            />
                        </div>
                        <${Button} size="md" onClick=${() => setStep(2)} className="w-full py-3" disabled=${!formData.sender}>
                            Next
                        </${Button}>
                    </div>
                `}

                ${step === 2 && html`
                        <${RecipientSelector} 
                            selectedContacts=${selectedContacts} 
                            setSelectedContacts=${setSelectedContacts}
                            selectedGroups=${selectedGroups} 
                            setSelectedGroups=${setSelectedGroups}
                            rawContacts=${rawContacts} 
                            setRawContacts=${setRawContacts}
                            contactPersistence=${contactPersistence} 
                            setContactPersistence=${setContactPersistence}
                            groupName=${groupName} 
                            setGroupName=${setGroupName}
                            contacts=${contacts} 
                            groups=${groups}
                            setShowContactModal=${setShowContactModal}
                            setShowGroupModal=${setShowGroupModal}
                        />

                        <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-midnight-800">
                            <${Button} variant="secondary" size="md" onClick=${() => setStep(1)} className="flex-1 py-3 px-4">
                                Back
                            </${Button}>
                            <${Button} size="md" onClick=${() => setStep(3)} className="flex-1 py-3 px-4" disabled=${selectedContacts.length === 0 && selectedGroups.length === 0 && rawContacts.length === 0}>
                                Next
                            </${Button}>
                        </div>
                    </div>
                `}

                ${step === 3 && html`
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold mb-4">Message Content</h2>
                        <label className="block text-sm font-medium text-gray-700 dark:text-midnight-300 mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span>Message Content</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supports {name}, {first_name}</span>
                            </div>
                            <${TemplateSelector} onSelect=${(content) => setFormData({ ...formData, template: content })} />
                        </label>
                            
                        <div className="flex flex-wrap gap-2 mb-3">
                            ${['name', 'first_name', 'last_name'].map(tag => html`
                                <button
                                    key=${tag}
                                    type="button"
                                    onClick=${() => {
                                        const textarea = document.getElementById('template-editor');
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const text = formData.template;
                                        const newText = text.substring(0, start) + `{${tag}}` + text.substring(end);
                                        setFormData({ ...formData, template: newText });
                                        setTimeout(() => {
                                            textarea.focus();
                                            textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
                                        }, 0);
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-midnight-900 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-gray-200 dark:border-midnight-800 rounded-full text-[10px] font-black text-gray-600 dark:text-midnight-400 hover:text-primary-600 dark:hover:text-primary-400 uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    <${Icon} name="plus" size=${10} />
                                    ${tag.replace('_', ' ')}
                                </button>
                            `)}
                        </div>

                        <textarea
                            id="template-editor"
                            value=${formData.template}
                            onChange=${(e) => setFormData({ ...formData, template: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-900/50 border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm lg:text-base text-gray-900 dark:text-white"
                            rows=${6}
                            placeholder="Hi {name}, welcome to NEXRA!"
                            required
                        />
                        ${(() => {
                            const len = formData.template.length;
                            const over = len > 612;
                            let parts = 1;
                            if (len > 160) {
                                parts = Math.ceil(len / 153);
                            } else if (len === 0) {
                                parts = 0;
                            }
                            
                            const isMulti = parts > 1 && !over;
                            let textColor = 'text-gray-500 dark:text-midnight-400';
                            if (over) textColor = 'text-red-500 dark:text-red-400';
                            else if (isMulti) textColor = 'text-amber-500 dark:text-amber-400';

                            return html`
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className=${`text-sm font-medium transition-colors ${textColor}`}>
                                            ${over ? '⚠ ' : ''}${len} / 612 characters
                                            ${parts > 0 && !over ? html`<span className="ml-2 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-xs">${parts} SMS Part${parts > 1 ? 's' : ''}</span>` : ''}
                                            ${over ? html`<span className="ml-2 font-bold">— ${len - 612} over limit</span>` : ''}
                                        </p>
                                    </div>
                                    
                                    ${isMulti ? html`
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl flex gap-3 text-sm">
                                            <${Icon} name="info" size=${16} className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
                                                <strong>Multi-part Message:</strong> Messages over 160 characters are split into parts of 153 characters each. 
                                                You will be billed <strong>${parts}x credits per recipient</strong> based on your current plan's SMS rate.
                                            </p>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        })()}
                        
                        <div className="flex gap-3 pt-4">
                            <${Button} variant="secondary" size="md" onClick=${() => setStep(2)} className="flex-1 py-3">
                                Back
                            </${Button}>
                            <${Button} size="md" onClick=${() => setStep(4)} className="flex-1 py-3" disabled=${!formData.template || formData.template.length > 612}>
                                Next
                            </${Button}>
                        </div>
                    </div>
                `}

                ${step === 4 && html`
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4">Schedule</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 mb-4">
                                        <input
                                            type="radio"
                                            name="schedule"
                                            checked=${!formData.scheduled_at}
                                            onChange=${() => setFormData({ ...formData, scheduled_at: '' })}
                                        />
                                        <span>Send Now</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="schedule"
                                            checked=${!!formData.scheduled_at}
                                            onChange=${() => setFormData({ ...formData, scheduled_at: new Date().toISOString().slice(0, 16) })}
                                        />
                                        <span>Schedule for Later</span>
                                    </label>
                                </div>

                                ${formData.scheduled_at && html`
                                    <${Input}
                                        type="datetime-local"
                                        value=${formData.scheduled_at}
                                        onChange=${(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                    />
                                `}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-[0.2em] px-1">Message Preview</h3>
                            <div className="relative p-6 bg-gray-100 dark:bg-midnight-950 rounded-[2.5rem] border border-gray-200 dark:border-midnight-800 shadow-inner">
                                <div className="max-w-[280px] mx-auto space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-midnight-800 animate-pulse"></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-900 dark:text-white">${formData.sender || 'Sender ID'}</p>
                                            <p className="text-[8px] text-gray-500 tracking-widest uppercase">Text Message</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white dark:bg-midnight-900 p-4 rounded-2xl rounded-tl-none border border-gray-200 dark:border-midnight-800 shadow-sm relative mr-6">
                                        <p className="text-sm text-gray-800 dark:text-midnight-200 leading-relaxed whitespace-pre-wrap">
                                            ${(() => {
                                                if (!formData.template) return html`<span className="italic text-gray-400">Enter message content to see preview...</span>`;
                                                
                                                const fName = (previewContact.first_name || "").trim();
                                                const lName = (previewContact.last_name || "").trim();
                                                const fullName = `${fName} ${lName}`.trim();
                                                const displayName = fullName || (fName || previewContact.phone_number);

                                                return formData.template
                                                    .replace(/{name}/g, displayName)
                                                    .replace(/{first_name}/g, fName)
                                                    .replace(/{last_name}/g, lName)
                                                    .replace(/{phone_number}/g, previewContact.phone_number);
                                            })()}
                                        </p>
                                        <div className="flex justify-end mt-2">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary-50/30 dark:bg-primary-900/10 p-4 rounded-2xl border border-primary-100/50 dark:border-primary-800/20">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-primary-100/50 dark:border-primary-800/20">
                                <h3 className="font-bold text-gray-900 dark:text-white uppercase text-[10px] tracking-widest">Broadcast Summary</h3>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold">Smart-Routed Enabled</span>
                                </div>
                            </div>
                            <ul className="text-sm text-gray-600 dark:text-midnight-400 space-y-2">
                                <li className="flex justify-between">
                                    <span>Campaign:</span>
                                    <span className="font-semibold text-gray-900 dark:text-midnight-200">${formData.name}</span>
                                </li>
                                <li className="flex justify-between text-xs lg:text-sm">
                                    <span>Recipients:</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-900 dark:text-midnight-200">
                                            ${selectedContacts.length + (groups.filter(g => selectedGroups.includes(g.id)).reduce((acc, g) => acc + g.contact_count, 0))}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-midnight-800 border border-gray-200 dark:border-midnight-700 font-bold">Deduplicated</span>
                                    </div>
                                </li>
                                <li className="flex justify-between">
                                    <span>Segments:</span>
                                    <span className="font-semibold text-gray-900 dark:text-midnight-200">${selectedGroups.length}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Sender ID:</span>
                                    <span className="font-semibold text-gray-900 dark:text-midnight-200">${formData.sender}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <${Button} variant="secondary" size="md" onClick=${() => setStep(3)} className="flex-1 order-3 sm:order-1">
                                Back
                            </${Button}>
                            <${Button} 
                                variant="outline"
                                size="md"
                                onClick=${() => handleSubmit(false)} 
                                className="flex-1 order-2 sm:order-2 text-primary-600 border-primary-100 dark:border-primary-900/30" 
                                disabled=${loading}
                            >
                                ${formData.scheduled_at ? 'Schedule Campaign' : 'Save as Draft'}
                            </${Button}>
                            ${!formData.scheduled_at && html`
                                <${Button} 
                                    size="md"
                                    onClick=${handleBroadcastClick} 
                                    className="flex-1 order-1 sm:order-3 shadow-lg shadow-primary-200 py-3 font-bold" 
                                    disabled=${loading}
                                >
                                    ${loading ? 'Processing...' : 'Broadcast Now'}
                                </${Button}>
                            `}
                        </div>
                    </div>
                `}
            </${Card}>

            <${Modal} isOpen=${showContactModal} onClose=${() => setShowContactModal(false)} title="Select Contacts">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <${Icon} name="search" size=${18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value=${searchQuery}
                                onChange=${(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            />
                        </div>
                        <button onClick=${fetchContacts} className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                            <${Icon} name="refresh-cw" size=${20} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-2 text-sm text-gray-500">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked=${filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                                onChange=${(e) => handleSelectAll(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            Select All
                        </label>
                        <span>${selectedContacts.length} selected</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        ${filteredContacts.length > 0 ? filteredContacts.map((contact) => html`
                            <label key=${contact.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-transparent rounded-xl cursor-pointer hover:bg-white hover:border-primary-100 hover:shadow-sm transition-all group">
                                <input
                                    type="checkbox"
                                    checked=${selectedContacts.includes(contact.id)}
                                    onChange=${(e) => {
                                        if (e.target.checked) {
                                            setSelectedContacts([...selectedContacts, contact.id]);
                                        } else {
                                            setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                                        }
                                    }}
                                    className="w-5 h-5 rounded-md border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors text-sm">
                                        ${contact.first_name || ''} ${contact.last_name || ''}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-gray-500 font-medium font-mono">${contact.phone_number}</p>
                                        ${getNetworkBadge(contact.network)}
                                    </div>
                                </div>
                            </label>
                        `) : html`
                            <div className="text-center py-12">
                                <${Icon} name="users" size=${48} className="mx-auto text-gray-200 mb-3" />
                                <p className="text-gray-400">No contacts found</p>
                            </div>
                        `}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <${Button} className="w-full" onClick=${() => setShowContactModal(false)}>
                            Done (${selectedContacts.length} selected)
                        </${Button}>
                    </div>
                </div>
            </${Modal}>

            <${Modal} isOpen=${showGroupModal} onClose=${() => setShowGroupModal(false)} title="Select Segments">
                <div className="space-y-4">
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        ${groups.length > 0 ? groups.map((group) => html`
                            <label key=${group.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-midnight-900/50 border border-transparent dark:border-midnight-800 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-midnight-800 hover:border-primary-100 dark:hover:border-primary-900/40 hover:shadow-lg hover:shadow-primary-600/5 transition-all group">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked=${selectedGroups.includes(group.id)}
                                        onChange=${(e) => {
                                            if (e.target.checked) {
                                                setSelectedGroups([...selectedGroups, group.id]);
                                            } else {
                                                setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                            }
                                        }}
                                        className="w-5 h-5 rounded-md border-gray-300 dark:border-midnight-700 text-primary-600 focus:ring-primary-500 bg-white dark:bg-midnight-900"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors text-sm">${group.name}</p>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                                            ${group.contact_count} contacts
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-midnight-400 mt-0.5 line-clamp-1">${group.description || 'No description'}</p>
                                </div>
                            </label>
                        `) : html`
                            <div className="text-center py-12">
                                <${Icon} name="tag" size=${48} className="mx-auto text-gray-200 dark:text-midnight-800 mb-3" />
                                <p className="text-gray-400 dark:text-midnight-600 font-medium">No segments found</p>
                            </div>
                        `}
                    </div>
                    <${Button} variant="primary" className="w-full rounded-2xl py-3.5 shadow-glow font-bold" onClick=${() => setShowGroupModal(false)}>
                        Confirm Selection (${selectedGroups.length})
                    </${Button}>
                </div>
            </${Modal}>

            <${BroadcastCheckoutModal}
                isOpen=${!!checkoutCampaign}
                onClose=${() => setCheckoutCampaign(null)}
                campaign=${checkoutCampaign}
                onConfirm=${confirmBroadcast}
            />
        </div>
    `;
};
