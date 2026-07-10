import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';

const PAYSTACK_PUBLIC_KEY = 'pk_live_f2bc33d7eb129d525b3786314c8054415a262ad7';

const PricingComparison = ({ userPlan, onBuyPlan, onTopup }) => {
    const [expandedPlan, setExpandedPlan] = useState(null);

    const plans = [
        {
            slug: 'payg',
            name: 'Pay As You Go',
            subtitle: 'No commitment',
            price: 'Custom',
            unit: '',
            rate: '0.0800',
            features: [
                'Instant Activation',
                'Standard Delivery Speed',
                'Basic Analytics Dashboard',
                'Community Support'
            ]
        },
        {
            slug: 'starter',
            name: 'Starter',
            subtitle: 'For growing businesses',
            price: '25.00',
            unit: '500 Messages',
            rate: '0.0700',
            features: [
                'Priority Delivery Speed',
                'Advanced Campaign Reports',
                'Contact Groups & Segments',
                'Email Support'
            ]
        },
        {
            slug: 'pro',
            name: 'Pro',
            subtitle: 'Maximum performance',
            price: '50.00',
            unit: '1,250 Messages',
            rate: '0.0600',
            features: [
                'Ultra-Fast Delivery (High TPS)',
                'Dedicated Account Manager',
                'Custom API Integrations',
                '24/7 Phone & Priority Support'
            ]
        }
    ];

    return html`
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${plans.map(plan => html`
                <${Card} key=${plan.slug} className="p-6 flex flex-col transition-all duration-300 ${userPlan === plan.slug ? 'ring-2 ring-primary-500 bg-primary-50/5' : 'hover:shadow-md'}">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tighter">${plan.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">${plan.subtitle}</p>
                        </div>
                        ${userPlan === plan.slug && html`<${Badge} variant="success" className="text-[10px] px-2 py-0.5">Active</${Badge}>`}
                    </div>

                    <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-gray-900 dark:text-white">${plan.price === 'Custom' ? plan.price : `GH₵ ${plan.price}`}</span>
                            <span className="text-gray-500 text-sm font-medium">${plan.unit}</span>
                        </div>
                        <p className="text-[10px] text-primary-600 font-bold mt-1 uppercase tracking-tighter">Rate: ${plan.rate} GHS / SMS</p>
                    </div>

                    <button 
                        onClick=${() => setExpandedPlan(expandedPlan === plan.slug ? null : plan.slug)}
                        className="flex items-center justify-between w-full py-2 px-4 rounded-lg bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 transition-colors"
                    >
                        <span>${expandedPlan === plan.slug ? 'Hide Features' : 'View More Features'}</span>
                        <${Icon} name=${expandedPlan === plan.slug ? 'chevron-up' : 'chevron-down'} size=${14} />
                    </button>

                    <div className="overflow-hidden transition-all duration-300" style=${{ maxHeight: expandedPlan === plan.slug ? '400px' : '0', opacity: expandedPlan === plan.slug ? '1' : '0' }}>
                        <ul className="pt-6 space-y-3">
                            ${plan.features.map(feature => html`
                                <li key=${feature} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <${Icon} name="check-circle" size=${14} className="text-emerald-500 flex-shrink-0" />
                                    <span>${feature}</span>
                                </li>
                            `)}
                        </ul>
                    </div>

                    <div className="mt-auto pt-8">
                        ${plan.slug === 'payg' ? html`
                            <${Button} variant="outline" className="w-full font-bold uppercase tracking-tight text-xs py-3" onClick=${onTopup}>
                                <${Icon} name="plus" size=${14} />
                                Top Up Balance
                            </${Button}>
                        ` : html`
                            <${Button} 
                                variant=${userPlan === plan.slug ? 'outline' : 'primary'} 
                                className="w-full font-bold uppercase tracking-tight text-xs py-3" 
                                disabled=${userPlan === plan.slug}
                                onClick=${() => onBuyPlan(plan.slug)}
                            >
                                ${userPlan === plan.slug ? 'Active Plan' : 'Choose Plan'}
                            </${Button}>
                        `}
                    </div>
                </${Card}>
            `)}
        </div>
    `;
};

export const PricingPage = () => {
    const { user, fetchUser } = useAuth();
    const { showToast } = useToast();
    const [pricing, setPricing] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [topupAmount, setTopupAmount] = useState('100');
    const [isProcessing, setIsProcessing] = useState(false);
    const [txnStatus, setTxnStatus] = useState(null); // 'pending', 'success', 'failed'
    const [confirmPurchase, setConfirmPurchase] = useState({ open: false, slug: null });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [pricingRes, ledgerRes, balanceRes] = await Promise.all([
                apiClient.get('/billing/pricing'),
                apiClient.get('/billing/ledger'),
                apiClient.get('/billing/balance')
            ]);
            setPricing(pricingRes.data);
            setLedger(ledgerRes.data);
            setBalance(balanceRes.data);
        } catch (error) {
            console.error('Failed to fetch pricing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyPlan = (planSlug) => {
        setConfirmPurchase({ open: true, slug: planSlug });
    };

    const confirmUpgrade = async () => {
        const planSlug = confirmPurchase.slug;
        setIsProcessing(true);
        try {
            const response = await apiClient.post(`/billing/buy-plan?plan_slug=${planSlug}`);
            showToast(response.data.message, 'success');
            setConfirmPurchase({ open: false, slug: null });
            await Promise.all([fetchData(), fetchUser()]);
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to purchase plan', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const verifyPayment = async (reference) => {
        setTxnStatus('verifying');
        try {
            const verifyRes = await apiClient.get(`/payments/verify/${reference}`);
            if (verifyRes.data.status === 'SUCCESS' || verifyRes.data.status === 'ALREADY_COMPLETED') {
                setTxnStatus('success');
                showToast('Wallet topped up successfully!', 'success');
                setTimeout(() => {
                    setShowTopupModal(false);
                    resetTopupState();
                    fetchData();
                }, 2000);
            } else {
                setTxnStatus('failed');
                showToast(verifyRes.data.message || 'Verification failed', 'error');
            }
        } catch (error) {
            console.error('Verification error:', error);
            setTxnStatus('failed');
            showToast('Verification failed. Please contact support.', 'error');
        }
    };

    const handleTopup = async (e) => {
        e.preventDefault();
        
        if (!user?.email) {
            showToast('User email not found. Please log in again.', 'error');
            return;
        }

        const amount = parseFloat(topupAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        if (typeof PaystackPop === 'undefined') {
            showToast('Payment system is temporarily unavailable. Please refresh.', 'error');
            return;
        }

        setIsProcessing(true);
        const reference = `NEX-PAY-${Math.floor((Math.random() * 1000000000) + 1)}`;

        try {
            await apiClient.post('/payments/register-intent', {
                amount: amount,
                reference: reference
            });

            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: Math.round(amount * 100),
                currency: 'GHS',
                ref: reference,
                metadata: {
                    organization_id: user.organization_id,
                    user_id: user.id,
                    custom_fields: [
                        { display_name: "Service", variable_name: "service", value: "Wallet Top-up" }
                    ]
                },
                callback: function(response) {
                    verifyPayment(response.reference);
                },
                onClose: () => {
                    setIsProcessing(false);
                    showToast('Payment cancelled', 'info');
                }
            });

            handler.openIframe();
        } catch (error) {
            console.error('Topup initiation failed:', error);
            showToast('Failed to initiate payment', 'error');
            setIsProcessing(false);
        }
    };

    const resetTopupState = () => {
        setTxnStatus(null);
        setIsProcessing(false);
    };

    if (loading) {
        return html`
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        `;
    }

    return html`
        <div className="space-y-6 fade-in">
            <${Card} className="p-6 bg-gradient-to-br from-midnight-900 to-midnight-950 text-white border-none shadow-2xl relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <p className="text-midnight-400 text-xs font-bold uppercase tracking-widest mb-1">Total Available Balance</p>
                        <h2 className="text-5xl font-black tracking-tight">${balance?.balance?.toFixed(2) || '0.00'} <span className="text-2xl font-medium text-midnight-500">${balance?.currency || 'GHS'}</span></h2>
                    </div>
                    <div className="flex flex-col gap-2">
                        <${Button} variant="primary" size="lg" className="shadow-lg shadow-primary-600/20 px-8" onClick=${() => setShowTopupModal(true)}>
                            <${Icon} name="plus-circle" size=${20} />
                            Top Up Wallet
                        </${Button}>
                        <p className="text-[10px] text-midnight-400 text-center uppercase tracking-tighter font-bold">Instant Momo & Card Processing</p>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    <div>
                        <p className="text-midnight-400 text-[10px] font-bold uppercase mb-1">Subscription Credits</p>
                        <p className="font-bold text-xl text-emerald-400">${balance?.subscription_sms ?? Math.floor((balance?.subscription_credits || 0) / 0.07)} <span className="text-sm font-medium text-midnight-500">SMS</span></p>
                        <p className="text-[10px] text-midnight-600 mt-0.5">GH₵ ${balance?.subscription_credits?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                        <p className="text-midnight-400 text-[10px] font-bold uppercase mb-1">PAYG Credits</p>
                        <p className="font-bold text-xl text-amber-400">${balance?.payg_sms ?? Math.floor((balance?.payg_credits || 0) / 0.08)} <span className="text-sm font-medium text-midnight-500">SMS</span></p>
                        <p className="text-[10px] text-midnight-600 mt-0.5">GH₵ ${balance?.payg_credits?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="md:col-span-2 md:text-right flex flex-col md:items-end justify-center">
                         <div className="inline-flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                             <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                                Plan: ${user?.plan_name || (user?.plan_slug ? 'Pay As You Go' : 'No Active Plan')}
                             </span>
                         </div>
                    </div>
                </div>
            </${Card}>

            <${PricingComparison} 
                userPlan=${user?.plan_slug} 
                onBuyPlan=${handleBuyPlan}
                onTopup=${() => setShowTopupModal(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <${Card} className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50 dark:bg-midnight-900/80">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Plan SMS Rates</h3>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-midnight-900/50 text-gray-600 dark:text-midnight-400 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left">Plan</th>
                                <th className="px-4 py-3 text-right">Cost per SMS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            ${pricing.map((rate, idx) => html`
                                <tr key=${idx} className="hover:bg-gray-50 dark:hover:bg-midnight-900/50">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">${rate.name}</td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-midnight-400">
                                        ${rate.sms_rate.toFixed(4)} GHS
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </${Card}>

                <${Card} className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50 dark:bg-midnight-900/80">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        ${ledger.length === 0 ? html`
                            <div className="p-8 text-center text-gray-500">
                                <${Icon} name="clock" size=${32} className="mx-auto mb-2 text-gray-300" />
                                <p>No transaction history</p>
                            </div>
                        ` : html`
                            <div className="divide-y divide-gray-100">
                                ${ledger.map((entry) => html`
                                    <div key=${entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-midnight-900/50 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">${entry.description}</p>
                                            <p className="text-xs text-gray-500 dark:text-midnight-400">${new Date(entry.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className=${`text-sm font-bold ${entry.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-emerald-400'}`}>
                                            ${entry.type === 'debit' ? '-' : '+'}${entry.amount.toFixed(2)}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        `}
                    </div>
                </${Card}>
            </div>

            <${Modal} isOpen=${showTopupModal} onClose=${() => !isProcessing && setShowTopupModal(false)} title="Top Up Wallet">
                ${txnStatus === 'verifying' || txnStatus === 'success' || txnStatus === 'failed' ? html`
                    <div className="py-8 text-center space-y-4">
                        ${txnStatus === 'verifying' ? html`
                            <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Verifying Payment</h4>
                                <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Please wait while we confirm your transaction...</p>
                            </div>
                        ` : txnStatus === 'success' ? html`
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                <${Icon} name="check" size=${32} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Top-up Successful!</h4>
                        ` : html`
                            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto text-rose-600">
                                <${Icon} name="x" size=${32} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Transaction Failed</h4>
                            <${Button} variant="outline" size="sm" onClick=${resetTopupState}>Try Again</${Button}>
                        `}
                    </div>
                ` : html`
                    <form onSubmit=${handleTopup} className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-midnight-400">Choose an amount to add to your wallet. You can pay via Mobile Money or Card.</p>
                        
                        <div className="grid grid-cols-3 gap-2">
                            ${['100', '200', '300', '400', '500', '1000'].map(amt => html`
                                <button 
                                    type="button" 
                                    key=${amt}
                                    onClick=${() => setTopupAmount(amt)}
                                    className=${`py-2 px-3 border rounded-xl text-sm font-medium transition-all ${topupAmount === amt ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 hover:border-primary-400 dark:bg-midnight-900 dark:text-midnight-300 dark:border-midnight-800'}`}
                                >
                                    ${amt} GHS
                                </button>
                            `)}
                        </div>
 
                        <${Input} 
                            label="Custom Amount (GHS)" 
                            type="number" 
                            min="1" 
                            value=${topupAmount} 
                            onChange=${(e) => setTopupAmount(e.target.value)} 
                        />
 
                        <div className="pt-4 flex gap-2">
                            <${Button} type="button" variant="outline" className="flex-1" onClick=${() => setShowTopupModal(false)}>Cancel</${Button}>
                            <${Button} type="submit" className="flex-1" disabled=${isProcessing}>
                                ${isProcessing ? html`<span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processing...</span>` : 'Pay Now'}
                            </${Button}>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-2 grayscale opacity-50">
                            <img src="https://checkout.paystack.com/static/media/paystack-badge.e8f73111.png" alt="Paystack" className="h-4" />
                        </div>
                    </form>
                `}
            </${Modal}>

            <${ConfirmModal}
                isOpen=${confirmPurchase.open}
                onClose=${() => setConfirmPurchase({ open: false, slug: null })}
                onConfirm=${confirmUpgrade}
                loading=${isProcessing}
                title="Upgrade Plan?"
                message=${`Are you sure you want to upgrade to the ${confirmPurchase.slug} plan? The monthly cost will be deducted from your wallet balance.`}
                confirmText="Confirm Upgrade"
                variant="info"
            />
        </div>
    `;
};
