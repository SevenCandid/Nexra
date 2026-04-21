// Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7032ZcU09vxIPUmmq1tvXXATs9MP_TThiA0wHjbbF7DJQCP6HVSfZHI04hfnwrmkiLQ/exec';

let currentData = [];
let activeTab = 'waitlist';

document.addEventListener('DOMContentLoaded', () => {
    fetchWaitlist();
});

async function fetchWaitlist() {
    const tableBody = document.getElementById('waitlist-body');
    const waitlistCountEl = document.getElementById('waitlist-count');
    const donationCountEl = document.getElementById('donation-count');

    try {
        if (SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL') {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-red-400">Please set your Google Apps Script Web App URL in waitlist.js first.</td></tr>`;
            return;
        }

        const response = await fetch(`${SCRIPT_URL}?action=list`);

        if (!response.ok) {
            throw new Error('Failed to fetch waitlist');
        }

        currentData = await response.json();
        console.log('Fetched Data:', currentData); // Debug log

        // Update counts
        const waitlistCount = currentData.filter(e => e.name !== 'DONATION').length;
        const donationCount = currentData.filter(e => e.name === 'DONATION').length;
        
        if (waitlistCountEl) waitlistCountEl.textContent = waitlistCount;
        if (donationCountEl) donationCountEl.textContent = donationCount;

        renderTable();

    } catch (error) {
        console.error('Error:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-red-400">
                    Failed to load data. Ensure your SCRIPT_URL is correct and the script is deployed as "Anyone".
                </td>
            </tr>
        `;
    }
}

function switchTab(tab) {
    activeTab = tab;
    
    // Update UI
    const waitlistBtn = document.getElementById('tab-waitlist');
    const donationsBtn = document.getElementById('tab-donations');
    
    if (tab === 'waitlist') {
        waitlistBtn.className = 'px-6 py-3 rounded-xl text-sm font-bold transition-all bg-white text-slate-900 shadow-sm';
        donationsBtn.className = 'px-6 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:text-slate-900';
    } else {
        donationsBtn.className = 'px-6 py-3 rounded-xl text-sm font-bold transition-all bg-white text-slate-900 shadow-sm';
        waitlistBtn.className = 'px-6 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:text-slate-900';
    }
    
    renderTable();
}

function renderTable() {
    const tableBody = document.getElementById('waitlist-body');
    const showingText = document.getElementById('showing-text');
    tableBody.innerHTML = '';

    const filteredData = currentData.filter(entry => {
        if (activeTab === 'waitlist') return entry.name !== 'DONATION';
        return entry.name === 'DONATION';
    });

    if (filteredData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                    No ${activeTab} entries found yet.
                </td>
            </tr>
        `;
        if (showingText) showingText.textContent = `No ${activeTab} entries`;
        return;
    }

    if (showingText) showingText.textContent = `Showing ${filteredData.length} ${activeTab} entries`;

    filteredData.forEach(entry => {
        const date = new Date(entry.signup_date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const isDonation = entry.name === 'DONATION';
        const row = document.createElement('tr');
        row.className = `hover:bg-slate-100/50 transition-colors group ${isDonation ? 'bg-pink-50/10' : ''}`;

        row.innerHTML = `
            <td class="px-6 py-4 text-sm font-mono text-slate-500">#${entry.position}</td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br ${isDonation ? 'from-pink-500/20 to-purple-500/20 border-pink-200 text-pink-600' : 'from-purple-100 to-cyan-100 border-purple-200 text-purple-700'} border flex items-center justify-center text-xs font-bold">
                        ${isDonation ? '💖' : entry.email.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-slate-900 font-medium">${entry.email}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500">
                <div class="flex flex-col">
                    <span class="${isDonation ? 'text-pink-600 font-black' : 'text-slate-700 font-medium'}">${entry.name || '-'}</span>
                    <span class="text-xs ${isDonation ? 'text-purple-600 font-bold' : 'text-slate-500'}">${entry.company || ''}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">${date}</td>
            <td class="px-6 py-4 text-right">
                <span class="px-2 py-1 ${isDonation ? 'bg-pink-100 border-pink-200 text-pink-700' : 'bg-green-100 border-green-200 text-green-700'} border rounded-full text-xs font-medium">
                    ${isDonation ? 'Donated' : 'Joined'}
                </span>
            </td>
        `;

        tableBody.appendChild(row);
    });
}
