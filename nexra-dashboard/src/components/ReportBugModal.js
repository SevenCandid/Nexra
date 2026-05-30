import { html, useState } from '../utils/htm.js';
import { Icon } from './ui/Icon.js';
import apiClient from '../api/client.js';

export const ReportBugModal = ({ isOpen, onClose }) => {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) return;

        setStatus('loading');
        try {
            await apiClient.post('/bugs/', {
                subject: subject.trim(),
                description: description.trim()
            });
            setStatus('success');
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (error) {
            console.error('Failed to report bug:', error);
            setStatus('error');
            setErrorMsg(error.response?.data?.detail || 'Failed to submit bug report. Please try again.');
        }
    };

    const handleClose = () => {
        setSubject('');
        setDescription('');
        setStatus('idle');
        setErrorMsg('');
        onClose();
    };

    return html`
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick=${handleClose}></div>
            
            <div className="relative bg-white dark:bg-midnight-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-pop-in border border-gray-100 dark:border-midnight-800">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-midnight-800">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
                            <${Icon} name="alert-triangle" size=${18} />
                        </div>
                        <h2 className="text-lg font-bold">Report an Issue</h2>
                    </div>
                    <button onClick=${handleClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-midnight-800 transition-colors">
                        <${Icon} name="x" size=${20} />
                    </button>
                </div>

                <div className="p-4">
                    ${status === 'success' ? html`
                        <div className="py-8 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mb-4">
                                <${Icon} name="check" size=${24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Report Submitted!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Thank you for helping us improve NEXRA. Our team will look into this right away.</p>
                        </div>
                    ` : html`
                        <form onSubmit=${handleSubmit} className="space-y-4">
                            ${status === 'error' && html`
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm flex gap-2 items-start">
                                    <${Icon} name="alert-circle" size=${16} className="mt-0.5 shrink-0" />
                                    <span>${errorMsg}</span>
                                </div>
                            `}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Subject</label>
                                <input
                                    type="text"
                                    value=${subject}
                                    onChange=${(e) => setSubject(e.target.value)}
                                    placeholder="Brief summary of the problem"
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all"
                                    required
                                    disabled=${status === 'loading'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    value=${description}
                                    onChange=${(e) => setDescription(e.target.value)}
                                    placeholder="Please describe what you were trying to do, what happened, and any error messages you saw..."
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all min-h-[120px] resize-none"
                                    required
                                    disabled=${status === 'loading'}
                                ></textarea>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled=${status === 'loading'}
                                    className="w-full py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    ${status === 'loading' ? html`
                                        <${Icon} name="loader-2" size=${16} className="animate-spin" />
                                        <span>Submitting...</span>
                                    ` : html`
                                        <${Icon} name="send" size=${16} />
                                        <span>Submit Report</span>
                                    `}
                                </button>
                            </div>
                        </form>
                    `}
                </div>
            </div>
        </div>
    `;
};
