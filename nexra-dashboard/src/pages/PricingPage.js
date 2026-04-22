import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';

const PAYSTACK_PUBLIC_KEY = 'pk_live_f2bc33d7eb129d525b3786314c8054415a262ad7';

export const PricingPage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [pricing, setPricing] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [topupAmount, setTopupAmount] = useState('100');
    const [momoPhone, setMomoPhone] = useState('');
    const [momoNetwork, setMomoNetwork] = useState('MTN');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentRef, setPaymentRef] = useState(null);
    const [txnStatus, setTxnStatus] = useState(null); // 'pending', 'success', 'failed'

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

    const verifyPayment = async (reference) => {
        setTxnStatus('verifying');
        try {
            // 3. Verify on backend
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

        // Check if Paystack is loaded
        if (typeof PaystackPop === 'undefined') {
            showToast('Payment system is temporarily unavailable. Please refresh.', 'error');
            return;
        }

        setIsProcessing(true);
        const reference = `NEX-PAY-${Math.floor((Math.random() * 1000000000) + 1)}`;

        try {
            // 1. Register Intent with Backend
            await apiClient.post('/payments/register-intent', {
                amount: amount,
                reference: reference
            });

            // 2. Open Paystack
            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: Math.round(amount * 100), // convert to pesewas
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
            <${Card} className="p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white border-none">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-primary-100 mb-1">Current Balance</p>
                        <h2 className="text-4xl font-bold">${balance?.balance?.toFixed(2) || '0.00'} <span className="text-2xl font-normal">${balance?.currency || 'GHS'}</span></h2>
                    </div>
                    <div className="text-right">
                        <${Button} variant="secondary" size="sm" onClick=${() => setShowTopupModal(true)}>
                            Top Up Wallet
                        </${Button}>
                    </div>
                </div>
                <div className="mt-6 flex gap-8">
                    <div>
                        <p className="text-primary-200 text-sm">Subscription Credits</p>
                        <p className="font-semibold text-lg">${balance?.subscription_credits?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                        <p className="text-primary-200 text-sm">Pay-As-You-Go Credits</p>
                        <p className="font-semibold text-lg">${balance?.payg_credits?.toFixed(2) || '0.00'}</p>
                    </div>
                </div>
            </${Card}>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <${Card} className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50 dark:bg-midnight-900/80">
                        <h3 className="font-semibold text-gray-900 dark:text-white">SMS Rates</h3>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-midnight-900/50 text-gray-600 dark:text-midnight-400 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left">Network</th>
                                <th className="px-4 py-3 text-right">Cost per SMS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            ${pricing.map((rate, idx) => html`
                                <tr key=${idx} className="hover:bg-gray-50 dark:hover:bg-midnight-900/50">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">${rate.network_name}</td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-midnight-400">
                                        ${rate.cost_per_sms.toFixed(4)} ${rate.currency}
                                    </td>
                                </tr>
                            `)}
                            ${pricing.length === 0 && html`
                                <tr>
                                    <td colSpan="2" className="px-4 py-6 text-center text-gray-500">
                                        No pricing data available
                                    </td>
                                </tr>
                            `}
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
        </div>
    `;
};
