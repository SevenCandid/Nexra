import { html, useState, useEffect } from '../utils/htm.js';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { Icon } from './ui/Icon.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

export const RecipientSelector = ({
    selectedContacts, setSelectedContacts,
    selectedGroups, setSelectedGroups,
    rawContacts, setRawContacts,
    contactPersistence, setContactPersistence,
    groupName, setGroupName,
    contacts, groups,
    onAddManualContact,
    setShowContactModal, setShowGroupModal
}) => {
    const [recipientMode, setRecipientMode] = useState('none');
    const [newManualContact, setNewManualContact] = useState({ first_name: '', last_name: '', phone_number: '' });
    const [isSavingManual, setIsSavingManual] = useState(false);

    // Check if Contact Picker API is available
    const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);
    useEffect(() => {
        setIsContactPickerSupported('contacts' in navigator && 'ContactsManager' in window);
    }, []);

    const handleSelectPhoneContacts = async () => {
        if (!isContactPickerSupported) return;
        
        try {
            const props = ['name', 'tel'];
            const opts = { multiple: true };
            const selected = await navigator.contacts.select(props, opts);
            
            if (selected && selected.length > 0) {
                // Map and normalize
                const processed = selected.map(c => {
                    const name = (c.name && c.name.length > 0) ? c.name[0] : '';
                    const phoneRaw = (c.tel && c.tel.length > 0) ? c.tel[0] : '';
                    return {
                        name: name,
                        phone: normalizePhoneNumber(phoneRaw)
                    };
                }).filter(c => c.phone); // filter out empty phones
                
                setRawContacts([...rawContacts, ...processed]);
                // Default to temporary to avoid silent persistence
                if (!contactPersistence) {
                    setContactPersistence('temporary');
                }
            }
        } catch (ex) {
            console.error('Contact selection failed or was cancelled', ex);
        }
    };

    const handleManualAdd = () => {
        if (!newManualContact.phone_number) return;
        setIsSavingManual(true);
        // Normalize phone number
        const normalizedPhone = normalizePhoneNumber(newManualContact.phone_number);
        
        const contact = {
            name: (newManualContact.first_name + ' ' + newManualContact.last_name).trim(),
            phone: normalizedPhone
        };
        
        setRawContacts([...rawContacts, contact]);
        if (!contactPersistence) {
            setContactPersistence('temporary');
        }
        
        setNewManualContact({ first_name: '', last_name: '', phone_number: '' });
        setIsSavingManual(false);
    };

    const removeRawContact = (index) => {
        const newRaw = [...rawContacts];
        newRaw.splice(index, 1);
        setRawContacts(newRaw);
    };

    return html`
        <div className="space-y-6">
            <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Step 2: Add Recipients</h2>
                <div className="flex flex-row items-center gap-2 overflow-x-auto pb-1 custom-scrollbar w-full">
                    ${isContactPickerSupported && html`
                        <${Button} variant="primary" size="sm" onClick=${handleSelectPhoneContacts} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 min-w-max !px-2 !py-1.5 !text-[9px]">
                            <${Icon} name="smartphone" size=${12} />
                            <span className="ml-1 whitespace-nowrap">Phone Contacts</span>
                        </${Button}>
                    `}
                    <${Button} variant=${selectedGroups.length > 0 ? 'primary' : 'outline'} size="sm" onClick=${() => setShowGroupModal(true)} className="flex-1 min-w-max !px-2 !py-1.5 !text-[9px]">
                        <${Icon} name="tag" size=${12} />
                        <span className="ml-1 whitespace-nowrap">Segments</span>
                    </${Button}>
                    <${Button} variant=${selectedContacts.length > 0 ? 'primary' : 'outline'} size="sm" onClick=${() => setShowContactModal(true)} className="flex-1 min-w-max !px-2 !py-1.5 !text-[9px]">
                        <${Icon} name="users" size=${12} />
                        <span className="ml-1 whitespace-nowrap">Contacts</span>
                    </${Button}>
                    <${Button} 
                        variant=${recipientMode === 'manual' ? 'primary' : 'outline'} 
                        size="sm" 
                        onClick=${() => setRecipientMode(recipientMode === 'manual' ? 'none' : 'manual')}
                        className="flex-1 min-w-max !px-2 !py-1.5 !text-[9px]"
                    >
                        <${Icon} name="plus" size=${12} />
                        <span className="ml-1 whitespace-nowrap">Manual</span>
                    </${Button}>
                </div>
            </div>

            ${recipientMode === 'manual' && html`
                <div className="p-5 bg-primary-50/50 dark:bg-midnight-900/50 rounded-2xl border border-primary-100 dark:border-midnight-800 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                        <${Input}
                            label="First Name"
                            value=${newManualContact.first_name}
                            onChange=${(e) => setNewManualContact({ ...newManualContact, first_name: e.target.value })}
                            placeholder="John"
                        />
                        <${Input}
                            label="Last Name"
                            value=${newManualContact.last_name}
                            onChange=${(e) => setNewManualContact({ ...newManualContact, last_name: e.target.value })}
                            placeholder="Doe"
                        />
                    </div>
                    <${Input}
                        label="Phone Number"
                        value=${newManualContact.phone_number}
                        onChange=${(e) => setNewManualContact({ ...newManualContact, phone_number: e.target.value })}
                        placeholder="233241234567"
                        required
                    />
                    <${Button}
                        onClick=${handleManualAdd}
                        className="w-full"
                        disabled=${!newManualContact.phone_number || isSavingManual}
                    >
                        Add to Campaign
                    </${Button}>
                </div>
            `}

            ${rawContacts.length > 0 && html`
                <div className="p-5 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl space-y-4">
                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">
                        ${rawContacts.length} New Contacts Selected
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        What would you like to do with these contacts?
                    </p>
                    
                    <div className="space-y-3">
                        <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${contactPersistence === 'temporary' ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-midnight-800 hover:bg-gray-50 dark:hover:bg-midnight-800/50'}">
                            <input type="radio" name="persistence" value="temporary" 
                                checked=${contactPersistence === 'temporary'}
                                onChange=${(e) => setContactPersistence(e.target.value)}
                                className="mt-1" />
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Send Once (Temporary)</div>
                                <div className="text-xs text-gray-500">Only use for this campaign. They will be deleted afterwards.</div>
                            </div>
                        </label>
                        
                        <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${contactPersistence === 'save_group' ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-midnight-800 hover:bg-gray-50 dark:hover:bg-midnight-800/50'}">
                            <input type="radio" name="persistence" value="save_group"
                                checked=${contactPersistence === 'save_group'}
                                onChange=${(e) => setContactPersistence(e.target.value)}
                                className="mt-1" />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">Save as Contact Group</div>
                                <div className="text-xs text-gray-500">Add to your contacts and save as a group for future use.</div>
                                
                                ${contactPersistence === 'save_group' && html`
                                    <div className="mt-3">
                                        <${Input} 
                                            placeholder="e.g. SRC Campaign Team" 
                                            value=${groupName}
                                            onChange=${(e) => setGroupName(e.target.value)}
                                            onClick=${(e) => e.stopPropagation()}
                                        />
                                    </div>
                                `}
                            </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${contactPersistence === 'save_contacts' ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-midnight-800 hover:bg-gray-50 dark:hover:bg-midnight-800/50'}">
                            <input type="radio" name="persistence" value="save_contacts"
                                checked=${contactPersistence === 'save_contacts'}
                                onChange=${(e) => setContactPersistence(e.target.value)}
                                className="mt-1" />
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Save to Contacts Only</div>
                                <div className="text-xs text-gray-500">Permanently add them to your contacts without creating a group.</div>
                            </div>
                        </label>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar mt-4">
                        ${rawContacts.map((contact, idx) => html`
                            <div key=${idx} className="flex items-center justify-between p-2 bg-white dark:bg-midnight-900 rounded-lg border border-gray-100 dark:border-midnight-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold uppercase">
                                        ${contact.name ? contact.name[0] : (contact.phone ? contact.phone[0] : '?')}
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold">${contact.name || 'Unknown'}</div>
                                        <div className="text-[10px] text-gray-500 font-mono">${contact.phone}</div>
                                    </div>
                                </div>
                                <button onClick=${() => removeRawContact(idx)} className="text-gray-400 hover:text-red-500">
                                    <${Icon} name="x" size=${14} />
                                </button>
                            </div>
                        `)}
                    </div>
                </div>
            `}

            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">Selected Segments (${selectedGroups.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${selectedGroups.length > 0 ? groups.filter(g => selectedGroups.includes(g.id)).map(group => html`
                        <div key=${group.id} className="flex items-center justify-between p-3 bg-primary-500/5 border border-primary-500/10 rounded-2xl group transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center">
                                    <${Icon} name="tag" size=${14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">${group.name}</p>
                                    <p className="text-[10px] text-primary-600 font-bold">${group.contact_count} contacts</p>
                                </div>
                            </div>
                            <button onClick=${() => setSelectedGroups(selectedGroups.filter(id => id !== group.id))} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <${Icon} name="x" size=${16} />
                            </button>
                        </div>
                    `) : html`
                        <div className="col-span-full py-6 text-center border-2 border-dashed border-gray-100 dark:border-midnight-800 rounded-2xl">
                            <p className="text-xs text-gray-400 italic">No segments selected yet</p>
                        </div>
                    `}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">
                    Existing Contacts Selected (${selectedContacts.length})
                </h3>
                
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    ${selectedContacts.length > 0 ? contacts.filter(c => selectedContacts.includes(c.id)).map((contact) => html`
                        <div key=${contact.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center font-bold text-xs uppercase">
                                    ${(contact.first_name?.[0] || contact.phone_number?.[0] || '?').toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                            ${contact.first_name || ''} ${contact.last_name || ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-gray-500 dark:text-midnight-400 font-medium font-mono">${contact.phone_number}</p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick=${() => setSelectedContacts(selectedContacts.filter(id => id !== contact.id))}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <${Icon} name="x" size=${16} />
                            </button>
                        </div>
                    `) : html`
                        <div className="text-center py-6 border-2 border-dashed border-gray-50 dark:border-midnight-900 rounded-2xl">
                            <p className="text-xs text-gray-400 italic font-medium">No individual contacts selected</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
};
