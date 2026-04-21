import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';

export const PricingPage = () => {
    const { showToast } = useToast();
    const [pricing, setPricing] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [topupAmount, setTopupAmount] = useState('10.00');
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

    const handleTopup = async (e) => {
        e.preventDefault();
        if (!momoPhone || momoPhone.length < 10) {
            showToast('Please enter a valid phone number', 'error');
            return;
        }

        setIsProcessing(true);
        setTxnStatus('preparing');
        try {
            const response = await apiClient.post('/payments/momo-push', {
                amount: parseFloat(topupAmount),
                phone_number: momoPhone,
                network: momoNetwork
            });
            
            setPaymentRef(response.data.reference);
            setTxnStatus('pending');
            startPolling(response.data.reference);
            showToast('Payment request sent!', 'info');
        } catch (error) {
            showToast('Failed to initiate payment', 'error');
            setTxnStatus(null);
            setIsProcessing(false);
        }
    };

    const startPolling = (ref) => {
        const interval = setInterval(async () => {
            try {
                const res = await apiClient.get(`/payments/status/${ref}`);
                if (res.data.status === 'SUCCESS') {
                    clearInterval(interval);
                    setTxnStatus('success');
                    showToast('Payment Successful!', 'success');
                    setTimeout(() => {
                        setShowTopupModal(false);
                        resetTopupState();
                        fetchData();
                    }, 2000);
                } else if (res.data.status === 'FAILED') {
                    clearInterval(interval);
                    setTxnStatus('failed');
                    showToast('Payment Failed', 'error');
                    setIsProcessing(false);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);

        // Cleanup after 2 minutes
        setTimeout(() => {
            clearInterval(interval);
            if (txnStatus === 'pending') {
                setTxnStatus('timeout');
                setIsProcessing(false);
            }
        }, 120000);
    };

    const resetTopupState = () => {
        setTxnStatus(null);
        setPaymentRef(null);
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
                ${txnStatus === 'pending' || txnStatus === 'success' || txnStatus === 'failed' ? html`
                    <div className="py-8 text-center space-y-4">
                        ${txnStatus === 'pending' ? html`
                            <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Waiting for Approval</h4>
                                <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Check your phone for the prompt (Simulation Mode).</p>
                            </div>
                            <div className="space-y-3">
                                <div className="bg-gray-50 dark:bg-midnight-900/50 p-3 rounded-xl inline-block mx-auto border border-gray-100 dark:border-midnight-800">
                                    <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Ref: ${paymentRef}</p>
                                </div>
                                <div className="pt-2">
                                    <a href="simulate_momo.html" target="_blank" className="text-xs text-primary-600 hover:underline font-bold flex items-center justify-center gap-1">
                                        <${Icon} name="external-link" size=${12} />
                                        Open Simulation Tool to Approve
                                    </a>
                                </div>
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
                        <p className="text-sm text-gray-600 dark:text-midnight-400">Choose an amount and enter your mobile money details.</p>
                        
                        <div className="grid grid-cols-3 gap-2">
                            ${['10', '20', '50', '100', '200', '500'].map(amt => html`
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Network</label>
                                <select 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm"
                                    value=${momoNetwork}
                                    onChange=${(e) => setMomoNetwork(e.target.value)}
                                >
                                    <option value="MTN">MTN Ghana</option>
                                    <option value="TELECEL">Telecel (Vodafone)</option>
                                    <option value="AIRTELTIGO">AirtelTigo</option>
                                </select>
                            </div>
                            <${Input} 
                                label="Mobile Number" 
                                placeholder="024XXXXXXX"
                                value=${momoPhone}
                                onChange=${(e) => setMomoPhone(e.target.value)}
                            />
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
                                ${isProcessing ? 'Initiating...' : 'Send Payment Request'}
                            </${Button}>
                        </div>
                    </form>
                `}
            </${Modal}>
        </div>
    `;
};
