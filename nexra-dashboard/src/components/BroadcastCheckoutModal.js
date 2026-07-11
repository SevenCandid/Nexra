import { html, useState, useEffect } from '../utils/htm.js';
import { Icon } from './ui/Icon.js';
import { Button } from './ui/Button.js';
import apiClient from '../api/client.js';

export const BroadcastCheckoutModal = ({ isOpen, onClose, campaign, onConfirm }) => {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && campaign) {
            fetchBalance();
        }
    }, [isOpen, campaign]);

    const fetchBalance = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/billing/balance');
            setBalance(response.data);
        } catch (err) {
            console.error('Failed to fetch balance for checkout:', err);
            setError('Could not verify wallet balance. Please check connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !campaign) return null;

    // 1. Calculate Campaign SMS volume
    const totalRecipients = campaign.total_recipients || 0;
    const templateLen = (campaign.template || '').length;
    let smsParts = 1;
    if (templateLen > 160) {
        smsParts = Math.ceil(templateLen / 153);
    } else if (templateLen === 0) {
        smsParts = 0;
    }
    const totalSmsNeeded = totalRecipients * smsParts;

    const renderContent = () => {
        if (loading) {
            return html`
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    <p className="text-xs font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest">Checking wallet balance...</p>
                </div>
            `;
        }

        if (error) {
            return html`
                <div className="py-6 space-y-4 text-center">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
                        <${Icon} name="alert-triangle" size=${24} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-midnight-200">${error}</p>
                    <${Button} size="sm" onClick=${fetchBalance} className="mx-auto">
                        Retry Check
                    </${Button}>
                </div>
            `;
        }

        if (!balance) return null;

        const isPayg = balance.is_payg;
        const paygRate = balance.payg_rate || 0.08;

        // -- CASE 1: Pay As You Go Org --
        if (isPayg) {
            const paygCredits = balance.payg_credits || 0;
            const requiredGhs = totalSmsNeeded * paygRate;
            const hasSufficient = paygCredits >= requiredGhs;
            
            // Maximum recipients we can cover
            const maxCoveredRecipients = smsParts > 0 ? Math.floor(paygCredits / (smsParts * paygRate)) : 0;
            const finalCovered = Math.min(totalRecipients, maxCoveredRecipients);

            if (hasSufficient) {
                return html`
                    <div className="space-y-6">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                            <${Icon} name="check-circle" className="text-emerald-500 mt-0.5" size=${18} />
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Balance Check Passed</h4>
                                <p className="text-xs text-gray-500 dark:text-midnight-400 mt-1">
                                    Your wallet has sufficient credits to complete this broadcast.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-midnight-950 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 space-y-3">
                            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <span>Item</span>
                                <span>Details</span>
                            </div>
                            <div className="border-t border-gray-200/50 dark:border-midnight-800/50 pt-2 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Recipients</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">${totalRecipients}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">SMS Parts Per Recipient</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">${smsParts}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total SMS Units</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">${totalSmsNeeded}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-dashed border-gray-200 dark:border-midnight-800">
                                    <span className="text-gray-500">Estimated Cost (${paygRate.toFixed(4)}/SMS)</span>
                                    <span className="font-black text-primary-600 dark:text-primary-400">${requiredGhs.toFixed(2)} GHS</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Available PAYG Balance</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">${paygCredits.toFixed(2)} GHS</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <${Button} variant="secondary" className="flex-1 rounded-2xl py-3.5" onClick=${onClose}>
                                Cancel
                            </${Button}>
                            <${Button} variant="primary" className="flex-1 rounded-2xl py-3.5 font-bold shadow-glow" onClick=${() => onConfirm(true)}>
                                Broadcast Now
                            </${Button}>
                        </div>
                    </div>
                `;
            } else {
                return html`
                    <div className="space-y-6">
                        <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
                            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                                <${Icon} name="alert-triangle" size=${20} />
                                <h4 className="font-bold text-sm">Insufficient PAYG Balance</h4>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-midnight-400 leading-relaxed">
                                This broadcast requires <strong>${requiredGhs.toFixed(2)} GHS</strong> to complete, but your wallet only has <strong>${paygCredits.toFixed(2)} GHS</strong>.
                            </p>
                            <p className="text-xs text-gray-600 dark:text-midnight-400 leading-relaxed font-semibold">
                                Option: You can send to the first ${finalCovered} recipients now. The remaining ${totalRecipients - finalCovered} messages will fail, and you can retry them from the dashboard once you top up.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3.5">
                            <${Button} 
                                variant="primary" 
                                className="w-full rounded-2xl py-3.5 font-bold" 
                                disabled=${finalCovered === 0}
                                onClick=${() => onConfirm(true)}
                            >
                                Send Covered (${finalCovered} Recipients)
                            </${Button}>
                            <${Button} 
                                variant="secondary" 
                                className="w-full rounded-2xl py-3.5 font-bold border-primary-500/20 text-primary-600 dark:text-primary-400"
                                onClick=${() => window.location.hash = '#/pricing'}
                            >
                                <${Icon} name="credit-card" size=${16} className="inline mr-2" />
                                Top Up Wallet (Go to Wallet)
                            </${Button}>
                            <button 
                                onClick=${onClose} 
                                className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center py-2"
                            >
                                Cancel & Go Back
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // -- CASE 2: Active Plan Org (Starter/Pro) --
        const subSms = balance.subscription_sms || 0;
        const subCredits = balance.subscription_credits || 0;
        const paygCredits = balance.payg_credits || 0;
        
        // Subscription covers the entire broadcast
        if (subSms >= totalSmsNeeded) {
            return html`
                <div className="space-y-6">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                        <${Icon} name="check-circle" className="text-emerald-500 mt-0.5" size=${18} />
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Subscription Cover Valid</h4>
                            <p className="text-xs text-gray-500 dark:text-midnight-400 mt-1">
                                This broadcast will be fully covered by your plan's active monthly credits.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-midnight-950 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total SMS Required</span>
                            <span className="font-semibold text-gray-900 dark:text-white">${totalSmsNeeded} Units</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Available Plan Credits</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">${subSms} SMS (${subCredits.toFixed(2)} GHS)</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <${Button} variant="secondary" className="flex-1 rounded-2xl py-3.5" onClick=${onClose}>
                            Cancel
                        </${Button}>
                        <${Button} variant="primary" className="flex-1 rounded-2xl py-3.5 font-bold shadow-glow" onClick=${() => onConfirm(false)}>
                            Broadcast Now
                        </${Button}>
                    </div>
                </div>
            `;
        }

        // Subscription cannot cover everything. We need to dip into PAYG.
        const uncoveredSms = totalSmsNeeded - subSms;
        const requiredPaygGhs = uncoveredSms * paygRate;
        const hasEnoughPayg = paygCredits >= requiredPaygGhs;

        if (hasEnoughPayg) {
            return html`
                <div className="space-y-6">
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2.5 text-amber-500">
                            <${Icon} name="info" size=${20} />
                            <h4 className="font-bold text-sm">Subscription Limit Exceeded</h4>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-midnight-400 leading-relaxed">
                            Your monthly subscription credits cover **${subSms}** SMS. The remaining **${uncoveredSms}** SMS will require **${requiredPaygGhs.toFixed(2)} GHS** from your Pay As You Go wallet.
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-midnight-950 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total SMS Required</span>
                            <span className="font-semibold text-gray-900 dark:text-white">${totalSmsNeeded} Units</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>Plan Credits Cover</span>
                            <span>-${subSms} SMS</span>
                        </div>
                        <div className="flex justify-between font-semibold text-amber-600 dark:text-amber-500">
                            <span>PAYG Fallback Required</span>
                            <span>${uncoveredSms} SMS (${requiredPaygGhs.toFixed(2)} GHS)</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-dashed border-gray-200 dark:border-midnight-800">
                            <span className="text-gray-500">Your PAYG Balance</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">${paygCredits.toFixed(2)} GHS</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        <${Button} 
                            variant="primary" 
                            className="w-full rounded-2xl py-3.5 font-bold shadow-glow" 
                            onClick=${() => onConfirm(true)}
                        >
                            Use PAYG Fallback (Send Entire Campaign)
                        </${Button}>
                        <${Button} 
                            variant="secondary" 
                            className="w-full rounded-2xl py-3.5 font-bold text-gray-700 dark:text-midnight-200" 
                            onClick=${() => onConfirm(false)}
                        >
                            Only Use Subscription (Send First ${subSms} SMS, rest fails)
                        </${Button}>
                        <button 
                            onClick=${onClose} 
                            className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center py-2"
                        >
                            Cancel & Go Back
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Insufficient subscription AND insufficient PAYG to cover the rest!
            const maxPaygSms = paygRate > 0 ? Math.floor(paygCredits / paygRate) : 0;
            const totalSendable = subSms + maxPaygSms;
            
            return html`
                <div className="space-y-6">
                    <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                            <${Icon} name="alert-triangle" size=${20} />
                            <h4 className="font-bold text-sm">Insufficient Wallet Credits</h4>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-midnight-400 leading-relaxed">
                            This campaign requires **${totalSmsNeeded}** SMS. Your subscription credits cover **${subSms}** SMS, and your PAYG balance only covers **${maxPaygSms}** SMS. You are short of **${totalSmsNeeded - totalSendable}** SMS.
                        </p>
                        <p className="text-xs text-gray-600 dark:text-midnight-400 leading-relaxed font-semibold">
                            Option: You can broadcast what is covered (${totalSendable} SMS) now. The rest will fail and can be retried once you top up.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        <${Button} 
                            variant="primary" 
                            className="w-full rounded-2xl py-3.5 font-bold" 
                            disabled=${totalSendable === 0}
                            onClick=${() => onConfirm(true)}
                        >
                            Send Covered (${totalSendable} SMS)
                        </${Button}>
                        <${Button} 
                            variant="secondary" 
                            className="w-full rounded-2xl py-3.5 font-bold border-primary-500/20 text-primary-600 dark:text-primary-400"
                            onClick=${() => window.location.hash = '#/pricing'}
                        >
                            <${Icon} name="credit-card" size=${16} className="inline mr-2" />
                            Top Up Wallet (Go to Wallet)
                        </${Button} >
                        <button 
                            onClick=${onClose} 
                            className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center py-2"
                        >
                            Cancel & Go Back
                        </button>
                    </div>
                </div>
            `;
        }
    };

    return html`
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-midnight-900 w-full max-w-md rounded-[2.5rem] shadow-premium border border-gray-100 dark:border-midnight-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-none">Broadcast Checkout</h2>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-2">Pre-flight Cost Check</p>
                        </div>
                        <button onClick=${onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-full transition-colors text-gray-400">
                            <${Icon} name="x" size=${24} />
                        </button>
                    </div>

                    ${renderContent()}
                </div>
            </div>
        </div>
    `;
};
