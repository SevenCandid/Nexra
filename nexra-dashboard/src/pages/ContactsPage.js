import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Modal } from '../components/ui/Modal.js';

const GroupsSidebar = ({ selectedGroupId, onOpenSegment, onRefresh }) => {
    const { showToast } = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: '', description: '' });

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
            fetchGroups();
            if (onRefresh) onRefresh();
            onOpenSegment(res.data);
        } catch (error) {
            showToast('Failed to create segment', 'error');
        }
    };

    const handleDeleteGroup = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure? Contacts will not be deleted.')) return;
        try {
            await apiClient.delete(`/groups/${id}`);
            showToast('Segment deleted', 'success');
            if (selectedGroupId === id) onOpenSegment(null);
            fetchGroups();
            if (onRefresh) onRefresh();
        } catch (error) {
            showToast('Failed to delete segment', 'error');
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
                            <span onClick=${(e) => handleDeleteGroup(e, group.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
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
        </div>
    `;
};

const SegmentDetailView = ({ segment, onBack, onSegmentUpdated }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('members');
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Add Manually State
    const [newContact, setNewContact] = useState({ first_name: '', last_name: '', phone_number: '' });
    const [isSavingManual, setIsSavingManual] = useState(false);

    // Upload CSV State
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // From Existing State
    const [allContacts, setAllContacts] = useState([]);
    const [allSegments, setAllSegments] = useState([]);
    const [searchExisting, setSearchExisting] = useState('');
    const [selectedExisting, setSelectedExisting] = useState(new Set());
    const [isBulkAdding, setIsBulkAdding] = useState(false);

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
            await apiClient.post(`/groups/${segment.id}/contacts/${createdContact.id}`);
            showToast('Contact created and added to segment!', 'success');
            setNewContact({ first_name: '', last_name: '', phone_number: '' });
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (err) {
            showToast('Failed to add contact', 'error');
        } finally {
            setIsSavingManual(false);
        }
    };

    const handleDeleteSegment = async () => {
        if (!confirm('Are you sure you want to delete this segment? Contacts inside will not be deleted.')) return;
        try {
            await apiClient.delete(`/groups/${segment.id}`);
            showToast('Segment deleted', 'success');
            onSegmentUpdated();
            onBack();
        } catch (err) {
            showToast('Failed to delete segment', 'error');
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('group_id', segment.id);
        try {
            const response = await apiClient.post('/contacts/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { created, group_added, skipped } = response.data;
            showToast(`Upload complete! ${group_added} added to segment (${created} new, ${skipped} skipped).`, 'success');
            setUploadFile(null);
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (error) {
            showToast('Upload failed', 'error');
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

    const handleSelectSegmentContacts = async (sourceSegment) => {
        if (!confirm(`Add all ${sourceSegment.contact_count} contacts from "${sourceSegment.name}"?`)) return;
        try {
            const res = await apiClient.get(`/groups/${sourceSegment.id}/contacts`);
            const ids = res.data.map(c => c.id);
            if (ids.length === 0) return showToast('That segment is empty.', 'info');
            
            await apiClient.post(`/groups/${segment.id}/contacts/bulk`, {
                contact_ids: ids
            });
            showToast(`Added contacts from ${sourceSegment.name}`, 'success');
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (err) {
            showToast('Failed to add from segment', 'error');
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
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="tag" size=${20} className="text-primary-500" />
                        ${segment.name}
                    </h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-1">
                        ${members.length} member${members.length !== 1 ? 's' : ''} ${segment.description ? '· ' + segment.description : ''}
                    </p>
                </div>
                <button 
                    onClick=${handleDeleteSegment}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors self-start lg:self-center"
                    title="Delete Segment"
                >
                    <${Icon} name="trash-2" size=${20} />
                </button>
            </div>


            <div className="flex bg-gray-100 dark:bg-midnight-900 p-1 rounded-2xl w-full max-w-2xl mx-auto shadow-inner overflow-x-auto">
                <button 
                    onClick=${() => setActiveTab('members')}
                    className="flex-1 min-w-[100px] py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'members' ? 'bg-white dark:bg-midnight-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                >
                    Members
                </button>
                <div className="w-px bg-gray-300 dark:bg-midnight-800 my-2 mx-1 hidden sm:block"></div>
                ${['existing', 'manual', 'upload'].map(tab => html`
                    <button 
                        key=${tab}
                        onClick=${() => setActiveTab(tab)}
                        className="flex-1 min-w-[100px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-primary-600 text-white shadow-glow' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-midnight-800/50 hover:text-gray-700 dark:hover:text-gray-300'}"
                    >
                        <${Icon} name="plus" size=${12} className=${activeTab === tab ? 'text-white' : ''} />
                        ${tab === 'existing' ? 'Existing' : tab === 'manual' ? 'Manual' : 'Upload'}
                    </button>
                `)}
            </div>

            <div className="flex-1 min-h-[400px]">
                ${activeTab === 'members' && html`
                    <div className="flex flex-wrap gap-2 mb-5">
                        <button 
                            onClick=${() => setActiveTab('upload')} 
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-glow hover:bg-primary-500 transition-colors"
                        >
                            <${Icon} name="upload-cloud" size=${15} /> Upload CSV
                        </button>
                        <button 
                            onClick=${() => setActiveTab('manual')} 
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-midnight-800 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-midnight-700 transition-colors"
                        >
                            <${Icon} name="user-plus" size=${15} /> Add Manually
                        </button>
                        <button 
                            onClick=${() => setActiveTab('existing')} 
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-midnight-800 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-midnight-700 transition-colors"
                        >
                            <${Icon} name="users" size=${15} /> From Existing
                        </button>
                    </div>

                    ${loading ? html`
                        <div className="flex justify-center py-12"><${Icon} name="loader-2" size=${32} className="animate-spin text-primary-500" /></div>
                    ` : members.length === 0 ? html`
                        <div className="text-center py-16 bg-gray-50 dark:bg-midnight-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-midnight-800">
                            <${Icon} name="users" size=${48} className="mx-auto mb-4 text-gray-300 dark:text-midnight-600" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Segment is empty</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Use the buttons above to start adding contacts to this segment.</p>
                        </div>
                    ` : html`
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${members.map(member => html`
                                <${Card} key=${member.id} className="p-4 flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-midnight-900 flex items-center justify-center font-black text-gray-600 dark:text-gray-300">
                                            ${member.first_name?.[0] || member.phone_number?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white leading-tight">
                                                ${member.first_name} ${member.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500">${member.phone_number}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick=${() => handleRemoveMember(member.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove from segment"
                                    >
                                        <${Icon} name="user-minus" size=${16} />
                                    </button>
                                </${Card}>
                            `)}
                        </div>
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
                    <div className="max-w-md mx-auto fade-in">
                        <${Card} className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-4">
                                <${Icon} name="upload-cloud" size=${28} className="text-primary-600" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Upload CSV</h3>
                            <p className="text-sm text-gray-500 mb-6">File must contain headers: <code className="bg-gray-100 dark:bg-midnight-900 px-1 py-0.5 rounded">first_name, last_name, phone_number</code></p>
                            
                            <input
                                type="file"
                                accept=".csv"
                                onChange=${(e) => setUploadFile(e.target.files[0])}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 mb-6 mx-auto cursor-pointer"
                            />
                            
                            <${Button} onClick=${handleUpload} disabled=${!uploadFile || isUploading} variant="primary" className="w-full rounded-2xl shadow-glow py-3">
                                ${isUploading ? 'Uploading & Processing...' : 'Upload and Add to Segment'}
                            </${Button}>
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
                                            <p className="text-xs text-gray-500">${c.phone_number}</p>
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
    const [newGroup, setNewGroup] = useState({ name: '', description: '' });

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
                    className="rounded-2xl px-6 py-3.5 shadow-glow font-black uppercase tracking-widest text-xs"
                >
                    <${Icon} name="plus" size=${18} className="mr-2" />
                    New Segment
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
