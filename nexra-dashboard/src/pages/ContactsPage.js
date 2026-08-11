import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';

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

const GroupsSidebar = ({ selectedGroupId, onOpenSegment, onRefresh }) => {
    const { showToast } = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroup, setNewGroup] = useState(() => {
        const saved = sessionStorage.getItem('contacts_sidebar_newGroup');
        return saved ? JSON.parse(saved) : { name: '', description: '' };
    });
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        sessionStorage.setItem('contacts_sidebar_newGroup', JSON.stringify(newGroup));
    }, [newGroup]);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await apiClient.get('/groups');
            setGroups(res.data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const res = await apiClient.post('/groups', newGroup);
            showToast('Segment created!', 'success');
            setShowCreateModal(false);
            setNewGroup({ name: '', description: '' });
            sessionStorage.removeItem('contacts_sidebar_newGroup');
            fetchGroups();
            if (onRefresh) onRefresh();
            onOpenSegment(res.data);
        } catch (error) {
            showToast('Failed to create segment', 'error');
        }
    };

    const handleDeleteGroup = async () => {
        const id = confirmDelete.id;
        setIsDeleting(true);
        try {
            await apiClient.delete(`/groups/${id}`);
            showToast('Segment deleted', 'success');
            setConfirmDelete({ open: false, id: null });
            if (selectedGroupId === id) onOpenSegment(null);
            fetchGroups();
            if (onRefresh) onRefresh();
        } catch (error) {
            showToast('Failed to delete segment', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return html`
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-2">Segments</h3>
                <button onClick=${() => setShowCreateModal(true)} className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg transition-colors">
                    <${Icon} name="plus" size=${14} />
                </button>
            </div>

            <div className="space-y-1">
                <button
                    onClick=${() => onOpenSegment(null)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${!selectedGroupId ? 'bg-primary-600 text-white shadow-glow' : 'text-gray-600 dark:text-midnight-400 hover:bg-gray-100 dark:hover:bg-midnight-900'}"
                >
                    <div className="flex items-center gap-3">
                        <${Icon} name="users" size=${16} />
                        <span className="text-sm font-bold">All Contacts</span>
                    </div>
                </button>

                ${loading ? html`
                    <div className="space-y-2 mt-4 px-2">
                        ${[1, 2, 3].map(i => html`<div key=${i} className="h-8 bg-gray-50 dark:bg-midnight-900 rounded-lg animate-pulse" />`)}
                    </div>
                ` : groups.map(group => html`
                    <button
                        key=${group.id}
                        onClick=${() => onOpenSegment(group)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${selectedGroupId === group.id ? 'bg-primary-600 text-white shadow-glow' : 'text-gray-600 dark:text-midnight-400 hover:bg-gray-100 dark:hover:bg-midnight-900'}"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <${Icon} name="tag" size=${14} className="${selectedGroupId === group.id ? 'text-primary-200' : 'text-gray-400'}" />
                            <span className="text-sm font-bold truncate">${group.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black opacity-60">${group.contact_count}</span>
                            <span onClick=${(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: group.id }); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                                <${Icon} name="x" size=${12} />
                            </span>
                        </div>
                    </button>
                `)}
            </div>

            <${Modal} isOpen=${showCreateModal} onClose=${() => setShowCreateModal(false)} title="New Segment">
                <form onSubmit=${handleCreateGroup} className="space-y-4 pt-4">
                    <${Input}
                        label="Segment Name"
                        placeholder="e.g. VIP Customers"
                        value=${newGroup.name}
                        onChange=${(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        required
                    />
                    <${Input}
                        label="Description (Optional)"
                        placeholder="Purpose of this group..."
                        value=${newGroup.description}
                        onChange=${(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                    <div className="flex gap-3 pt-4">
                        <${Button} type="button" variant="outline" className="flex-1 rounded-2xl" onClick=${() => setShowCreateModal(false)}>Cancel</${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1 rounded-2xl shadow-glow">Create</${Button}>
                    </div>
                </form>
            </${Modal}>

            <${ConfirmModal}
                isOpen=${confirmDelete.open}
                onClose=${() => setConfirmDelete({ open: false, id: null })}
                onConfirm=${handleDeleteGroup}
                loading=${isDeleting}
                title="Delete Segment?"
                message="Are you sure? Contacts inside will not be deleted, but this segment will be removed."
                confirmText="Delete Segment"
                variant="danger"
            />
        </div>
    `;
};

const SegmentDetailView = ({ segment, onBack, onSegmentUpdated }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('members');
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isListExpanded, setIsListExpanded] = useState(false);
    
    // Add Manually State
    const [newContact, setNewContact] = useState(() => {
        const saved = sessionStorage.getItem('segment_detail_newContact');
        return saved ? JSON.parse(saved) : { first_name: '', last_name: '', phone_number: '' };
    });
    const [isSavingManual, setIsSavingManual] = useState(false);
    
    // Phonebook Contact Picker State
    const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);
    const [isImportingPhonebook, setIsImportingPhonebook] = useState(false);

    useEffect(() => {
        setIsContactPickerSupported('contacts' in navigator && 'ContactsManager' in window);
    }, []);

    useEffect(() => {
        sessionStorage.setItem('segment_detail_newContact', JSON.stringify(newContact));
    }, [newContact]);

    // Upload CSV State
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadResult, setUploadResult] = useState(null);

    // From Existing State
    const [allContacts, setAllContacts] = useState([]);
    const [allSegments, setAllSegments] = useState([]);
    const [searchExisting, setSearchExisting] = useState('');
    const [selectedExisting, setSelectedExisting] = useState(new Set());
    const [isBulkAdding, setIsBulkAdding] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ open: false, type: '', data: null });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (segment) {
            fetchMembers();
            if (activeTab === 'existing') {
                fetchAllContactsAndSegments();
            }
        }
    }, [segment, activeTab]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/groups/${segment.id}/contacts`);
            setMembers(res.data);
        } catch (err) {
            showToast('Failed to load members', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllContactsAndSegments = async () => {
        try {
            const [contactsRes, groupsRes] = await Promise.all([
                apiClient.get('/contacts'),
                apiClient.get('/groups')
            ]);
            setAllContacts(contactsRes.data.items || []);
            setAllSegments(groupsRes.data.filter(g => g.id !== segment.id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveMember = async (contactId) => {
        try {
            await apiClient.delete(`/groups/${segment.id}/contacts/${contactId}`);
            showToast('Member removed', 'success');
            fetchMembers();
            onSegmentUpdated();
        } catch (err) {
            showToast('Failed to remove member', 'error');
        }
    };

    const handleManualAdd = async (e) => {
        e.preventDefault();
        setIsSavingManual(true);
        try {
            // Create contact
            const res = await apiClient.post('/contacts', newContact);
            const createdContact = res.data;
            // Add to group
            if (segment && segment.id) {
                await apiClient.post(`/groups/${segment.id}/contacts/${createdContact.id}`);
                showToast('Contact created and added to segment!', 'success');
            } else {
                showToast('Contact created successfully!', 'success');
            }
            setNewContact({ first_name: '', last_name: '', phone_number: '' });
            sessionStorage.removeItem('segment_detail_newContact');
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (err) {
            showToast('Failed to add contact', 'error');
        } finally {
            setIsSavingManual(false);
        }
    };

    const handleSelectPhoneContacts = async () => {
        if (!isContactPickerSupported) return;
        
        try {
            const props = ['name', 'tel'];
            const opts = { multiple: true };
            const selected = await navigator.contacts.select(props, opts);
            
            if (selected && selected.length > 0) {
                setIsImportingPhonebook(true);
                let successCount = 0;
                
                for (const c of selected) {
                    try {
                        const nameParts = (c.name && c.name.length > 0) ? c.name[0].split(' ') : [''];
                        const firstName = nameParts[0] || 'Unknown';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        const phoneRaw = (c.tel && c.tel.length > 0) ? c.tel[0] : '';
                        
                        if (!phoneRaw) continue;
                        
                        let phone = phoneRaw.replace(/\D/g, '');
                        if (phoneRaw.startsWith('+')) phone = '+' + phone;
                        
                        const res = await apiClient.post('/contacts', { first_name: firstName, last_name: lastName, phone_number: phone });
                        const createdContact = res.data;
                        
                        if (segment.id) {
                            await apiClient.post(`/groups/${segment.id}/contacts/${createdContact.id}`);
                        }
                        successCount++;
                    } catch (err) {
                        console.error('Failed to import contact', c, err);
                    }
                }
                
                if (successCount > 0) {
                    showToast(`Successfully imported ${successCount} contact(s) from phonebook!`, 'success');
                    fetchAllContactsAndSegments();
                } else {
                    showToast('No valid contacts could be imported.', 'error');
                }
            }
        } catch (ex) {
            console.error('Contact selection failed or was cancelled', ex);
        } finally {
            setIsImportingPhonebook(false);
        }
    };

    const handleDeleteSegment = async () => {
        setIsDeleting(true);
        try {
            await apiClient.delete(`/groups/${segment.id}`);
            showToast('Segment deleted', 'success');
            setConfirmAction({ open: false, type: '', data: null });
            onSegmentUpdated();
            onBack();
        } catch (err) {
            showToast('Failed to delete segment', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;
        setIsUploading(true);
        setUploadError(null);
        setUploadResult(null);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('group_id', segment.id);
        try {
            const response = await apiClient.post('/contacts/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { created, group_added, skipped } = response.data;
            setUploadResult({ created, group_added, skipped });
            showToast(`Upload complete! ${group_added} added to segment.`, 'success');
            setUploadFile(null);
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (error) {
            // Detect CORS / network error (server unreachable, cold-start crash, etc.)
            const isNetworkError = !error.response;
            let message;
            if (isNetworkError) {
                message = 'Could not reach the server. This is usually a temporary cold-start issue — please wait 10–15 seconds and try again. If it persists, check your connection.';
            } else {
                // Extract the real error from the API response
                const detail = error.response?.data?.detail;
                if (Array.isArray(detail)) {
                    message = detail.map(d => d.msg || JSON.stringify(d)).join(' | ');
                } else if (typeof detail === 'string') {
                    message = detail;
                } else {
                    message = `Server error (${error.response?.status || 'unknown'}). Please check your file format and try again.`;
                }
            }
            setUploadError(message);
            showToast('Upload failed — see details below.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleBulkAddExisting = async () => {
        if (selectedExisting.size === 0) return;
        setIsBulkAdding(true);
        try {
            await apiClient.post(`/groups/${segment.id}/contacts/bulk`, {
                contact_ids: Array.from(selectedExisting)
            });
            showToast(`Added ${selectedExisting.size} contacts to segment`, 'success');
            setSelectedExisting(new Set());
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (err) {
            showToast('Failed to bulk add contacts', 'error');
        } finally {
            setIsBulkAdding(false);
        }
    };

    const handleSelectSegmentContacts = (sourceSegment) => {
        setConfirmAction({
            open: true,
            type: 'import',
            data: sourceSegment,
            title: 'Import Contacts?',
            message: `Add all ${sourceSegment.contact_count} contacts from "${sourceSegment.name}" to this segment?`
        });
    };

    const confirmImport = async () => {
        const sourceSegment = confirmAction.data;
        setIsBulkAdding(true);
        try {
            const res = await apiClient.get(`/groups/${sourceSegment.id}/contacts`);
            const ids = res.data.map(c => c.id);
            if (ids.length === 0) return showToast('That segment is empty.', 'info');
            
            await apiClient.post(`/groups/${segment.id}/contacts/bulk`, {
                contact_ids: ids
            });
            showToast(`Added contacts from ${sourceSegment.name}`, 'success');
            setConfirmAction({ open: false, type: '', data: null });
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (err) {
            showToast('Failed to add from segment', 'error');
        } finally {
            setIsBulkAdding(false);
        }
    };

    const toggleExistingContact = (id) => {
        setSelectedExisting(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const existingMembersIds = new Set(members.map(m => m.id));
    const availableContacts = allContacts.filter(c => !existingMembersIds.has(c.id));
    const filteredAvailable = availableContacts.filter(c => 
        (c.first_name + ' ' + c.last_name).toLowerCase().includes(searchExisting.toLowerCase()) || 
        c.phone_number.includes(searchExisting)
    );

    return html`
        <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-midnight-800 pb-6">
                <button onClick=${onBack} className="p-2.5 bg-gray-50 dark:bg-midnight-900 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-xl transition-colors self-start lg:self-center">
                    <${Icon} name="arrow-left" size=${18} className="text-gray-600 dark:text-gray-300" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="tag" size=${20} className="text-primary-500 shrink-0" />
                        <span className="truncate">${segment.name}</span>
                    </h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-1">
                        ${members.length} member${members.length !== 1 ? 's' : ''} ${segment.description ? '· ' + segment.description : ''}
                    </p>
                </div>
                <button 
                    onClick=${() => setConfirmAction({ 
                        open: true, 
                        type: 'delete', 
                        title: 'Delete Segment?', 
                        message: 'Permanently remove this segment? Contacts will not be deleted.' 
                    })}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors self-start lg:self-center"
                    title="Delete Segment"
                >
                    <${Icon} name="trash-2" size=${20} />
                </button>
            </div>


            ${isContactPickerSupported && html`
                <button 
                    onClick=${handleSelectPhoneContacts}
                    disabled=${isImportingPhonebook}
                    className="w-full max-w-4xl mx-auto py-3 sm:py-3.5 px-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/20 mb-4 shadow-sm"
                >
                    <${Icon} name="smartphone" size=${18} className=${isImportingPhonebook ? 'animate-pulse' : ''} />
                    ${isImportingPhonebook ? 'Importing from Phonebook...' : 'Import from Phonebook'}
                </button>
            `}

            <div className="flex flex-col lg:flex-row bg-transparent lg:bg-gray-100 lg:dark:bg-midnight-900 lg:p-1.5 rounded-2xl w-full max-w-4xl mx-auto lg:shadow-inner gap-3 lg:gap-0 fade-in">
                <button 
                    onClick=${() => setActiveTab('members')}
                    className="w-full lg:w-auto lg:flex-1 py-3.5 lg:py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'members' ? 'bg-white dark:bg-midnight-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-midnight-700 lg:ring-0' : 'bg-gray-50 dark:bg-midnight-900 lg:bg-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                >
                    <${Icon} name="list" size=${16} className=${activeTab === 'members' ? 'text-primary-500' : 'text-gray-400'} />
                    Directory Members
                </button>
                
                <div className="hidden lg:block w-px bg-gray-300 dark:bg-midnight-800 my-2 mx-2"></div>
                
                <div className="grid grid-cols-3 gap-2 lg:gap-1 lg:flex lg:flex-1">
                    ${['existing', 'manual', 'upload'].map(tab => html`
                        <button 
                            key=${tab}
                            onClick=${() => setActiveTab(tab)}
                            className="lg:flex-1 py-3 lg:py-2.5 px-1 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col lg:flex-row items-center justify-center gap-1.5 sm:gap-2 ${activeTab === tab ? 'bg-primary-600 text-white shadow-glow ring-1 ring-primary-500/50' : 'bg-gray-50 dark:bg-midnight-900 lg:bg-transparent text-gray-500 hover:bg-gray-200/50 dark:hover:bg-midnight-800/50 hover:text-gray-700 dark:hover:text-gray-300'}"
                        >
                            <${Icon} name=${tab === 'existing' ? 'users' : tab === 'manual' ? 'user-plus' : 'upload-cloud'} size=${16} className=${activeTab === tab ? 'text-white' : 'text-gray-400 dark:text-gray-500'} />
                            <span className="text-[10px] sm:text-xs tracking-wide uppercase lg:normal-case">${tab === 'existing' ? 'From Existing' : tab === 'manual' ? 'Add Manually' : 'Upload CSV'}</span>
                        </button>
                    `)}
                </div>
            </div>

            <div className="flex-1 min-h-[400px]">
                ${activeTab === 'members' && html`
                    ${loading ? html`
                        <div className="flex justify-center py-12"><${Icon} name="loader-2" size=${32} className="animate-spin text-primary-500" /></div>
                    ` : members.length === 0 ? html`
                        <div className="text-center py-16 bg-gray-50 dark:bg-midnight-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-midnight-800">
                            <${Icon} name="users" size=${48} className="mx-auto mb-4 text-gray-300 dark:text-midnight-600" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Segment is empty</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Use the buttons above to start adding contacts to this segment.</p>
                        </div>
                    ` : html`
                        <${Card} className="overflow-hidden border-gray-100 dark:border-midnight-800">
                            <div 
                                className="p-4 bg-gray-50/50 dark:bg-midnight-900/20 flex justify-between items-center cursor-pointer hover:bg-gray-100/50 dark:hover:bg-midnight-900/50 transition-colors"
                                onClick=${() => setIsListExpanded(!isListExpanded)}
                            >
                                <h3 className="font-bold flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                                    <${Icon} name="list" size=${16} className="text-primary-500" />
                                    Contact Directory (${members.length})
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 font-medium">${isListExpanded ? 'Hide' : 'View All'}</span>
                                    <${Icon} name=${isListExpanded ? "chevron-up" : "chevron-down"} size=${16} className="text-gray-400" />
                                </div>
                            </div>
                            
                            ${isListExpanded && html`
                                <div className="overflow-auto max-h-[500px] custom-scrollbar relative border-t border-gray-100 dark:border-midnight-800">
                                    <table className="w-full text-left relative">
                                        <thead className="bg-gray-50/95 dark:bg-midnight-900/95 border-b border-gray-100 dark:border-midnight-800 sticky top-0 z-10 backdrop-blur-sm">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                                                <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
                                                <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-24">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-midnight-800">
                                            ${members.map(member => {
                                                const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                                                const initial = (member.first_name?.[0] || member.phone_number?.[0] || '?').toUpperCase();
                                                return html`
                                                    <tr key=${member.id} className="hover:bg-gray-50/60 dark:hover:bg-midnight-900/40 transition-colors group">
                                                        <td className="px-4 sm:px-6 py-4">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 dark:bg-midnight-900 flex items-center justify-center text-sm font-black text-gray-600 dark:text-gray-300">
                                                                    ${initial}
                                                                </div>
                                                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                                    ${fullName || '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-mono text-gray-600 dark:text-midnight-300">${member.phone_number}</span>
                                                                ${getNetworkBadge(member.network)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick=${() => handleRemoveMember(member.id)}
                                                                className="inline-flex items-center justify-center p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                                                                title="Remove from segment"
                                                            >
                                                                <${Icon} name="user-minus" size=${16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `;
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </${Card}>
                    `}
                `}

                ${activeTab === 'manual' && html`
                    <div className="max-w-md mx-auto fade-in">
                        <${Card} className="p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <${Icon} name="user-plus" size=${20} className="text-primary-500" />
                                Add Contact via Form
                            </h3>
                            <form onSubmit=${handleManualAdd} className="space-y-4">
                                <${Input} label="First Name" placeholder="John" value=${newContact.first_name} onChange=${(e) => setNewContact({ ...newContact, first_name: e.target.value })} />
                                <${Input} label="Last Name" placeholder="Doe" value=${newContact.last_name} onChange=${(e) => setNewContact({ ...newContact, last_name: e.target.value })} />
                                <${Input} label="Phone Number" placeholder="233241234567" required value=${newContact.phone_number} onChange=${(e) => setNewContact({ ...newContact, phone_number: e.target.value })} />
                                <${Button} type="submit" variant="primary" className="w-full rounded-2xl shadow-glow py-3" disabled=${isSavingManual}>
                                    ${isSavingManual ? 'Saving & Adding...' : 'Save and Add to Segment'}
                                </${Button}>
                            </form>
                        </${Card}>
                    </div>
                `}

                ${activeTab === 'upload' && html`
                    <div className="max-w-2xl mx-auto fade-in">
                        <${Card} className="p-6 sm:p-8">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-4">
                                    <${Icon} name="upload-cloud" size=${28} className="text-primary-600" />
                                </div>
                                <h3 className="font-black text-xl mb-2">Upload CSV or Excel</h3>
                                <p className="text-sm text-gray-500">Bulk import contacts into this segment from any spreadsheet. The system is flexible — use whatever column names you already have.</p>
                            </div>

                            ${uploadError && html`
                                <div className="mb-5 p-4 rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/15 flex gap-3 animate-pop-in">
                                    <div className="shrink-0 mt-0.5">
                                        <${Icon} name="alert-triangle" size=${18} className="text-red-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-red-700 dark:text-red-400 mb-1">Upload Failed</p>
                                        <p className="text-xs text-red-600 dark:text-red-400/80 leading-relaxed">${uploadError}</p>
                                        <button
                                            onClick=${() => setUploadError(null)}
                                            className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider transition-colors"
                                        >Dismiss</button>
                                    </div>
                                </div>
                            `}
                            
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange=${(e) => { setUploadFile(e.target.files[0]); setUploadError(null); }}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/20 dark:file:text-primary-400 dark:hover:file:bg-primary-900/30 mb-6 cursor-pointer transition-colors"
                            />
                            
                            <${Button} onClick=${handleUpload} disabled=${!uploadFile || isUploading} variant="primary" className="w-full rounded-2xl shadow-glow py-3.5 text-sm font-bold mb-8">
                                ${isUploading ? html`
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Uploading & Processing...
                                    </span>
                                ` : 'Upload and Add to Segment'}
                            </${Button}>

                            <div className="space-y-4 mb-6 pt-4 border-t border-gray-100 dark:border-midnight-800/50">

                                <!-- Phone column names -->
                                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300">
                                        <${Icon} name="phone" size=${14} />
                                        Accepted Phone Number Column Names
                                    </h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">Any capitalisation works — <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">Phone</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">PHONE</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">phone</code> all match.</p>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        ${[
                                            'phone', 'Phone', 'PHONE',
                                            'phone number', 'Phone Number', 'Phone No',
                                            'contact', 'contact number', 'Contact Number',
                                            'mobile', 'Mobile', 'mobile number',
                                            'Mobile Number', 'cell', 'Cell Number',
                                            'tel', 'telephone', 'Telephone',
                                            'number', 'Number', 'num',
                                            'msisdn', 'gsm', 'GSM Number',
                                        ].map(v => html`
                                            <span key=${v} className="px-2 py-1 bg-white dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 rounded-lg font-mono text-blue-700 dark:text-blue-300">${v}</span>
                                        `)}
                                    </div>
                                </div>

                                <!-- Name column names -->
                                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-purple-800 dark:text-purple-300">
                                        <${Icon} name="user" size=${14} />
                                        Accepted Name Column Names
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">First / Full Name</p>
                                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                                                ${[
                                                    'name', 'Name', 'first name', 'First Name',
                                                    'firstname', 'FirstName', 'fname', 'Fname',
                                                    'given name', 'Given Name', 'full name', 'Full Name',
                                                    'customer name', 'client name',
                                                ].map(v => html`
                                                    <span key=${v} className="px-2 py-1 bg-white dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 rounded-lg font-mono text-purple-700 dark:text-purple-300">${v}</span>
                                                `)}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">Last / Surname</p>
                                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                                                ${[
                                                    'last name', 'Last Name', 'lastname', 'LastName',
                                                    'lname', 'Lname', 'surname', 'Surname',
                                                    'family name', 'Family Name',
                                                ].map(v => html`
                                                    <span key=${v} className="px-2 py-1 bg-white dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 rounded-lg font-mono text-purple-700 dark:text-purple-300">${v}</span>
                                                `)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Phone number format -->
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                        <${Icon} name="info" size=${14} />
                                        Phone Number Format Rules
                                    </h4>
                                    <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
                                        <li className="flex gap-2 items-start"><span className="font-bold shrink-0 mt-0.5">✓</span> <span className="min-w-0">Include the country code — Ghana numbers must start with <strong>233</strong></span></li>
                                        <li className="flex gap-2 items-start"><span className="font-bold shrink-0 mt-0.5">✓</span> <span className="min-w-0 break-words">All of these work: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded inline-block mb-1">0241234567</code> · <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded inline-block mb-1">233241234567</code> · <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded inline-block mb-1">+233241234567</code></span></li>
                                        <li className="flex gap-2 items-start"><span className="font-bold shrink-0 mt-0.5">✓</span> <span className="min-w-0">Spaces, dashes and parentheses are automatically stripped</span></li>
                                        <li className="flex gap-2 items-start"><span className="text-red-500 shrink-0 mt-0.5">✗</span> <span className="min-w-0">Rows with missing, blank, or invalid phone numbers are skipped</span></li>
                                    </ul>
                                </div>

                                <!-- Excel Visualizations side by side -->
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                    <!-- Minimal Excel Example -->
                                    <div className="p-3 bg-white dark:bg-midnight-950 rounded-xl border border-green-200 dark:border-green-900/30 overflow-hidden flex flex-col">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5 shrink-0">
                                            <${Icon} name="grid" size=${12} />
                                            Minimal Example (Excel)
                                        </p>
                                        <div className="overflow-x-auto rounded border border-gray-200 dark:border-midnight-800 flex-1">
                                            <table className="w-full text-left text-xs whitespace-nowrap">
                                                <thead>
                                                    <tr className="bg-gray-100 dark:bg-midnight-900 text-gray-600 dark:text-midnight-300 border-b border-gray-200 dark:border-midnight-800">
                                                        <th className="px-2 py-1.5 font-bold border-r border-gray-200 dark:border-midnight-800 text-center w-8 bg-gray-200 dark:bg-midnight-800"></th>
                                                        <th className="px-3 py-1.5 font-bold border-r border-gray-200 dark:border-midnight-800 text-center bg-gray-200 dark:bg-midnight-800">A</th>
                                                        <th className="px-3 py-1.5 font-bold border-r border-gray-200 dark:border-midnight-800 text-center bg-gray-200 dark:bg-midnight-800">B</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-700 dark:text-midnight-200">
                                                    <tr className="border-b border-gray-100 dark:border-midnight-800/50">
                                                        <td className="px-2 py-1.5 border-r border-gray-200 dark:border-midnight-800 bg-gray-100 dark:bg-midnight-900 text-center text-gray-500 font-medium">1</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50 font-bold bg-green-50 dark:bg-green-900/10">name</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50 font-bold bg-green-50 dark:bg-green-900/10">phone</td>
                                                    </tr>
                                                    <tr className="border-b border-gray-100 dark:border-midnight-800/50">
                                                        <td className="px-2 py-1.5 border-r border-gray-200 dark:border-midnight-800 bg-gray-100 dark:bg-midnight-900 text-center text-gray-500 font-medium">2</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Kofi Mensah</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50 font-mono text-[10px]">0241234567</td>
                                                    </tr>
                                                    <tr className="border-b border-gray-100 dark:border-midnight-800/50">
                                                        <td className="px-2 py-1.5 border-r border-gray-200 dark:border-midnight-800 bg-gray-100 dark:bg-midnight-900 text-center text-gray-500 font-medium">3</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Ama Owusu</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50 font-mono text-[10px]">233501234567</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-2 py-1.5 border-r border-gray-200 dark:border-midnight-800 bg-gray-100 dark:bg-midnight-900 text-center text-gray-500 font-medium">4</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Kweku</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50 font-mono text-[10px]">+233271234567</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    
                                    <!-- Full Excel Example -->
                                    <div className="p-3 bg-white dark:bg-midnight-950 rounded-xl border border-green-200 dark:border-green-900/30 overflow-hidden flex flex-col">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5 shrink-0">
                                            <${Icon} name="grid" size=${12} />
                                            Full Example (Excel)
                                        </p>
                                        <div className="overflow-x-auto rounded border border-gray-200 dark:border-midnight-800 flex-1">
                                            <table className="w-full text-left text-xs whitespace-nowrap">
                                                <thead>
                                                    <tr className="bg-gray-100 dark:bg-midnight-900 text-gray-600 dark:text-midnight-300 border-b border-gray-200 dark:border-midnight-800">
                                                        <th className="px-2 py-1.5 font-bold border-r border-gray-200 dark:border-midnight-800 text-center w-8 bg-gray-200 dark:bg-midnight-800"></th>
                                                        <th className="px-3 py-1.5 font-bold border-r border-gray-200 dark:border-midnight-800 text-center bg-gray-200 dark:bg-midnight-800">A</th>
                                                        <th className="px-3 py-1.5 font-bold border-r border-gray-200 dark:border-midnight-800 text-center bg-gray-200 dark:bg-midnight-800">B</th>
                                                        <th className="px-3 py-1.5 font-bold border-r border-gray-200 dark:border-midnight-800 text-center bg-gray-200 dark:bg-midnight-800">C</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-700 dark:text-midnight-200">
                                                    <tr className="border-b border-gray-100 dark:border-midnight-800/50">
                                                        <td className="px-2 py-1.5 border-r border-gray-200 dark:border-midnight-800 bg-gray-100 dark:bg-midnight-900 text-center text-gray-500 font-medium">1</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50 font-bold bg-green-50 dark:bg-green-900/10">First Name</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50 font-bold bg-green-50 dark:bg-green-900/10">Last Name</td>
                                                        <td className="px-3 py-1.5 font-bold bg-green-50 dark:bg-green-900/10">Mobile</td>
                                                    </tr>
                                                    <tr className="border-b border-gray-100 dark:border-midnight-800/50">
                                                        <td className="px-2 py-1.5 border-r border-gray-200 dark:border-midnight-800 bg-gray-100 dark:bg-midnight-900 text-center text-gray-500 font-medium">2</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Kofi</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Mensah</td>
                                                        <td className="px-3 py-1.5 font-mono text-[10px]">0241234567</td>
                                                    </tr>
                                                    <tr className="border-b border-gray-100 dark:border-midnight-800/50">
                                                        <td className="px-2 py-1.5 border-r border-gray-200 dark:border-midnight-800 bg-gray-100 dark:bg-midnight-900 text-center text-gray-500 font-medium">3</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Ama</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Owusu</td>
                                                        <td className="px-3 py-1.5 font-mono text-[10px]">0501234567</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-2 py-1.5 border-r border-gray-200 dark:border-midnight-800 bg-gray-100 dark:bg-midnight-900 text-center text-gray-500 font-medium">4</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Kweku</td>
                                                        <td className="px-3 py-1.5 border-r border-gray-100 dark:border-midnight-800/50">Asante</td>
                                                        <td className="px-3 py-1.5 font-mono text-[10px]">0271234567</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[11px] text-gray-400 dark:text-midnight-500 text-center mt-6">Supports <strong>.csv</strong>, <strong>.xlsx</strong> and <strong>.xls</strong> files. Duplicate phone numbers are automatically skipped.</p>

                            </div>
                        </${Card}>
                    </div>
                `}

                ${activeTab === 'existing' && html`
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in h-auto lg:h-[600px]">
                        <div className="flex flex-col border border-gray-200 dark:border-midnight-800 rounded-3xl overflow-hidden bg-white dark:bg-midnight-950">
                            <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-900/20">
                                <h3 className="font-bold mb-3 flex items-center justify-between">
                                    <span>Pick Contacts</span>
                                    <span className="text-xs font-black bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-1 rounded-md">
                                        ${selectedExisting.size} selected
                                    </span>
                                </h3>
                                <div className="relative">
                                    <${Icon} name="search" size=${16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search ${availableContacts.length} contacts..."
                                        value=${searchExisting}
                                        onChange=${e => setSearchExisting(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 relative" style=${{ minHeight: '300px' }}>
                                ${filteredAvailable.length === 0 ? html`
                                    <p className="text-center text-sm text-gray-500 py-10">No available contacts found.</p>
                                ` : filteredAvailable.map(c => html`
                                    <button 
                                        key=${c.id}
                                        onClick=${() => toggleExistingContact(c.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-midnight-900 transition-colors text-left"
                                    >
                                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedExisting.has(c.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-midnight-700'}">
                                            ${selectedExisting.has(c.id) && html`<${Icon} name="check" size=${10} className="text-white" />`}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">${c.first_name} ${c.last_name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-gray-500 font-mono">${c.phone_number}</p>
                                                ${getNetworkBadge(c.network)}
                                            </div>
                                        </div>
                                    </button>
                                `)}
                            </div>
                            <div className="p-4 border-t border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-950">
                                <${Button} 
                                    onClick=${handleBulkAddExisting} 
                                    disabled=${selectedExisting.size === 0 || isBulkAdding}
                                    variant="primary" 
                                    className="w-full rounded-2xl shadow-glow py-3"
                                >
                                    ${isBulkAdding ? 'Adding...' : 'Add Selected Contacts'}
                                </${Button}>
                            </div>
                        </div>

                        <div className="flex flex-col border border-gray-200 dark:border-midnight-800 rounded-3xl overflow-hidden bg-white dark:bg-midnight-950">
                            <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-900/20">
                                <h3 className="font-bold flex items-center gap-2">
                                    <${Icon} name="copy" size=${16} className="text-primary-500" />
                                    Import from another Segment
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Click a segment to merge its contacts into this one.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3" style=${{ minHeight: '300px' }}>
                                ${allSegments.length === 0 ? html`
                                    <p className="text-center text-sm text-gray-500 py-10">No other segments available.</p>
                                ` : allSegments.map(s => html`
                                    <button
                                        key=${s.id}
                                        onClick=${() => handleSelectSegmentContacts(s)}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-midnight-800 hover:border-primary-500 hover:bg-primary-50/20 dark:hover:bg-primary-900/10 transition-all text-left"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">${s.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">${s.contact_count} contacts</p>
                                        </div>
                                        <${Icon} name="download" size=${16} className="text-primary-500" />
                                    </button>
                                `)}
                            </div>
                        </div>
                    </div>
                `}
            </div>

            <${ConfirmModal}
                isOpen=${confirmAction.open}
                onClose=${() => setConfirmAction({ open: false, type: '', data: null })}
                onConfirm=${confirmAction.type === 'delete' ? handleDeleteSegment : confirmImport}
                loading=${isDeleting || isBulkAdding}
                title=${confirmAction.title}
                message=${confirmAction.message}
                confirmText=${confirmAction.type === 'delete' ? 'Delete' : 'Import'}
                variant=${confirmAction.type === 'delete' ? 'danger' : 'info'}
            />
        </div>
    `;
};

export const ContactsPage = () => {
    const { showToast } = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [openSegment, setOpenSegment] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroup, setNewGroup] = useState(() => {
        const saved = sessionStorage.getItem('contacts_main_newGroup');
        return saved ? JSON.parse(saved) : { name: '', description: '' };
    });

    useEffect(() => {
        sessionStorage.setItem('contacts_main_newGroup', JSON.stringify(newGroup));
    }, [newGroup]);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/groups');
            setGroups(res.data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
            showToast('Failed to load segments', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const res = await apiClient.post('/groups', newGroup);
            showToast('Segment created!', 'success');
            setShowCreateModal(false);
            setNewGroup({ name: '', description: '' });
            sessionStorage.removeItem('contacts_main_newGroup');
            fetchGroups();
            setOpenSegment(res.data);
        } catch (error) {
            showToast('Failed to create segment', 'error');
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (openSegment) {
        return html`
            <div className="fade-in">
                <${SegmentDetailView}
                    segment=${openSegment}
                    onBack=${() => setOpenSegment(null)}
                    onSegmentUpdated=${() => fetchGroups()}
                />
            </div>
        `;
    }

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md group">
                    <${Icon} name="search" size=${20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search your segments..."
                        value=${searchQuery}
                        onChange=${(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-medium transition-all shadow-sm"
                    />
                    ${searchQuery && html`
                        <button onClick=${() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <${Icon} name="x" size=${16} />
                        </button>
                    `}
                </div>
                
                <${Button} 
                    variant="primary" 
                    onClick=${() => setShowCreateModal(true)} 
                    className="rounded-2xl px-3 sm:px-6 py-2 sm:py-3.5 shadow-glow"
                >
                    <${Icon} name="plus" size=${16} className="mr-1.5 sm:mr-2" />
                    <span className="text-[10px] sm:text-sm font-bold">New Segment</span>
                </${Button}>
            </div>

            ${loading ? html`
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    ${[1, 2, 3, 4, 5, 6].map(i => html`
                        <div key=${i} className="h-48 bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800 rounded-[2.5rem] animate-pulse" />
                    `)}
                </div>
            ` : filteredGroups.length === 0 ? html`
                <${Card} className="py-24 px-10 text-center bg-white dark:bg-midnight-950/50 border-gray-100 dark:border-midnight-800">
                    <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-300 dark:text-primary-800">
                        <${Icon} name="layers" size=${40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                        ${searchQuery ? "No segments found matching your search" : "Your audience is empty"}
                    </h3>
                    <p className="text-gray-500 dark:text-midnight-500 text-sm max-w-sm mx-auto mb-8 font-medium italic">
                        ${searchQuery 
                            ? "Try checking your spelling or search for another keyword." 
                            : "Segments are groups of contacts. Create your first one to start messaging!"
                        }
                    </p>
                    ${!searchQuery && html`
                        <${Button} variant="outline" onClick=${() => setShowCreateModal(true)} className="rounded-2xl px-8">
                            Create First Segment
                        </${Button}>
                    `}
                </${Card}>
            ` : html`
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    ${filteredGroups.map(group => html`
                        <${Card} 
                            key=${group.id} 
                            onClick=${() => setOpenSegment(group)}
                            className="p-6 cursor-pointer group hover:border-primary-500/50 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[180px]"
                        >
                            <div className="absolute -right-6 -bottom-6 text-primary-500/5 group-hover:text-primary-500/10 transition-colors pointer-events-none">
                                <${Icon} name="tag" size=${120} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-primary-500/10 dark:bg-primary-500/5 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400">
                                        <${Icon} name="tag" size=${24} />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-midnight-900 rounded-full border border-gray-100 dark:border-midnight-800">
                                        <${Icon} name="users" size=${12} className="text-gray-400" />
                                        <span className="text-[11px] font-black text-gray-600 dark:text-midnight-400">${group.contact_count}</span>
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                    ${group.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-midnight-500 font-medium line-clamp-2 mt-1 min-h-[2.5rem]">
                                    ${group.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="relative z-10 mt-6 pt-4 border-t border-gray-50 dark:border-midnight-900 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span>Manage Members</span>
                                <${Icon} name="chevron-right" size=${14} className="group-hover:translate-x-1 transition-transform text-primary-500" />
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}

            <${Modal} isOpen=${showCreateModal} onClose=${() => setShowCreateModal(false)} title="Create New Segment">
                <form onSubmit=${handleCreateGroup} className="space-y-5 pt-2">
                    <p className="text-sm text-gray-500 dark:text-midnight-500 font-medium mb-4">
                        Segments help you organize your contacts for targeted messaging.
                    </p>
                    <${Input}
                        label="Segment Name"
                        placeholder="e.g. VIP Customers, Marketing List"
                        value=${newGroup.name}
                        onChange=${(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        required
                    />
                    <${Input}
                        label="Description (Optional)"
                        placeholder="e.g. Customers who joined via the summer sale"
                        value=${newGroup.description}
                        onChange=${(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                    <div className="flex gap-4 pt-4">
                        <${Button} type="button" variant="outline" className="flex-1 rounded-2xl py-3.5" onClick=${() => setShowCreateModal(false)}>
                            Cancel
                        </${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1 rounded-2xl py-3.5 shadow-glow">
                            Create Segment
                        </${Button}>
                    </div>
                </form>
            </${Modal}>


        </div>
    `;
};
