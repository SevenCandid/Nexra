// ============================================================================
// NEXRA Waitlist Landing Page - JavaScript
// ============================================================================

// Configuration
// Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7032ZcU09vxIPUmmq1tvXXATs9MP_TThiA0wHjbbF7DJQCP6HVSfZHI04hfnwrmkiLQ/exec';

// Paystack Configuration
// TODO: Replace with your Paystack Public Key
const PAYSTACK_PUBLIC_KEY = 'pk_live_f2bc33d7eb129d525b3786314c8054415a262ad7';

let waitlistCount = 500; // Initial count

// ============================================================================
// Particle Animation
// ============================================================================

function createParticles() {
    const container = document.getElementById('particles');
    const particleCount = window.innerWidth < 768 ? 30 : 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';

        // Random colors
        const colors = ['rgba(139, 92, 246, 0.5)', 'rgba(6, 182, 212, 0.5)', 'rgba(236, 72, 153, 0.5)'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        container.appendChild(particle);
    }
}

// ============================================================================
// Waitlist Counter Animation
// ============================================================================

function animateCounter() {
    const counter = document.getElementById('waitlist-count');
    const target = waitlistCount;
    const duration = 2000;
    const start = target - 50;
    const increment = (target - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        counter.textContent = Math.floor(current) + '+';
    }, 16);
}

// ============================================================================
// Toast Notifications
// ============================================================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success'
        ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
        : '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slide-in 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================================
// Confetti Effect
// ============================================================================

function createConfetti() {
    const colors = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 3000);
    }
}

// ============================================================================
// Form Handling
// ============================================================================

async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value : '';

    const nameInput = form.querySelector('input[name="full_name"]');
    const name = nameInput ? nameInput.value : null;

    const companyInput = form.querySelector('input[name="company_name"]');
    const company = companyInput ? companyInput.value : null;

    const button = form.querySelector('button[type="submit"]');

    // Validation
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Loading state
    button.classList.add('loading');
    button.disabled = true;

    // Check if Paystack is loaded
    if (typeof PaystackPop === 'undefined') {
        showToast('Payment system is currently unavailable. Please refresh and try again.', 'error');
        button.classList.remove('loading');
        button.disabled = false;
        return;
    }

    // Initialize Paystack Payment
    let handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: 5000, // 50 GHS in pesewas
        currency: 'GHS',
        ref: 'NEXRA_WAITLIST_' + Math.floor((Math.random() * 1000000000) + 1),
        callback: function (response) {
            // Payment successful, proceed to save waitlist entry
            (async () => {
                try {
                    // Send to Google Apps Script
                    // We use mode: 'no-cors' to avoid browser CORS preflight blocks for POST
                    await fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: {
                            'Content-Type': 'text/plain;charset=utf-8',
                        },
                        body: JSON.stringify({
                            action: 'add',
                            email,
                            name,
                            company,
                            paystack_ref: response.reference
                        })
                    });

                    // Success
                    showToast('🎉 Payment successful! You\'re on the list.', 'success');
                    createConfetti();
                    form.reset();

                    // Update counter
                    waitlistCount++;
                    document.querySelectorAll('#waitlist-count').forEach(el => {
                        el.textContent = waitlistCount + '+';
                    });
                } catch (error) {
                    console.error('Error saving to waitlist:', error);
                    showToast('Payment succeeded, but we had trouble saving your details. Please contact support.', 'error');
                } finally {
                    button.classList.remove('loading');
                    button.disabled = false;
                }
            })();
        },
        onClose: function () {
            showToast('Payment cancelled.', 'error');
            button.classList.remove('loading');
            button.disabled = false;
        }
    });

    // Open Paystack popup
    handler.openIframe();
}

// ============================================================================
// Donation Logic
// ============================================================================

function openDonateModal() {
    document.getElementById('donate-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDonateModal() {
    document.getElementById('donate-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function handleDonate(amount) {
    // If it's a fixed amount button, we still need their email
    openDonateModal();
    if (amount) {
        document.getElementById('donate-amount').value = amount;
    }
}

async function submitDonation() {
    const amountInput = document.getElementById('donate-amount');
    const emailInput = document.getElementById('donate-email');
    const amount = parseFloat(amountInput.value);
    const email = emailInput.value;
    const submitBtn = event.target; // Get the button from the event

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Check if Paystack is loaded
    if (typeof PaystackPop === 'undefined') {
        showToast('Payment system is temporarily unavailable. Please refresh.', 'error');
        return;
    }

    // Initialize Paystack Payment
    let handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: Math.round(amount * 100), // Ensure it's an integer in pesewas
        currency: 'GHS',
        ref: 'NEXRA_DONATE_' + Math.floor((Math.random() * 1000000000) + 1),
        callback: function (response) {
            (async () => {
                try {
                    // Record donation in Google Sheets
                    await fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: {
                            'Content-Type': 'text/plain;charset=utf-8',
                        },
                        body: JSON.stringify({
                            action: 'add',
                            email: email,
                            name: 'DONATION',
                            company: amount + ' GHS',
                            paystack_ref: response.reference
                        })
                    });

                    showToast('🎉 Thank you so much for your support!', 'success');
                    createConfetti();
                    closeDonateModal();
                } catch (error) {
                    console.error('Error recording donation:', error);
                    showToast('Payment successful! Thank you for your support.', 'success');
                    closeDonateModal();
                }
            })();
        },
        onClose: function () {
            showToast('Donation cancelled.', 'error');
        }
    });

    handler.openIframe();
}

// ============================================================================
// Scroll Reveal Animation
// ============================================================================

function revealOnScroll() {
    const reveals = document.querySelectorAll('.scroll-reveal');

    reveals.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;

        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('revealed');
        }
    });
}

// ============================================================================
// Smooth Scroll for Anchor Links
// ============================================================================

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Create particles
    createParticles();

    // Animate counter
    animateCounter();

    // Setup form handlers
    const mainForm = document.getElementById('waitlist-form');
    if (mainForm) mainForm.addEventListener('submit', handleSubmit);

    const footerForm = document.getElementById('waitlist-form-footer');
    if (footerForm) footerForm.addEventListener('submit', handleSubmit);

    // Setup scroll reveal
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check

    // Setup smooth scroll
    setupSmoothScroll();

    // ============================================================================
    // Conversion Tracking & Interactive Features
    // ============================================================================

    // 1. ROI Calculator (GHS)
    const volumeSlider = document.getElementById('roi-volume');
    const volumeDisplay = document.getElementById('volume-display');
    const savingsDisplay = document.getElementById('savings-display');

    if (volumeSlider && volumeDisplay && savingsDisplay) {
        const updateROI = () => {
            const volume = parseInt(volumeSlider.value);
            const formatter = new Intl.NumberFormat('en-GH', {
                style: 'currency',
                currency: 'GHS',
                maximumFractionDigits: 0
            });

            volumeDisplay.textContent = new Intl.NumberFormat('en-GH').format(volume);

            // Logic Adjusted for GHS:
            // Industry Avg Cost: GH₵ 0.12 per msg
            // NEXRA Avg Cost: GH₵ 0.06 per msg
            // Savings = volume * (0.12 - 0.06) * 12 months * 1.5 (waitlist bonus)
            const annualSavings = volume * 0.06 * 12 * 1.5;
            savingsDisplay.textContent = formatter.format(Math.round(annualSavings));
        };

        volumeSlider.addEventListener('input', updateROI);
        updateROI(); // Initial calc
    }

    // 2. FAQ Accordion (Fix)
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const button = item.querySelector('button');
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isActive = item.classList.contains('active');

                    // Close all other items
                    faqItems.forEach(otherItem => otherItem.classList.remove('active'));

                    // Toggle current item
                    if (!isActive) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }

    // 3. Live Activity Feed
    const liveFeedToast = document.getElementById('live-feed-toast');
    const liveFeedText = document.getElementById('live-feed-text');
    const liveFeedTime = document.getElementById('live-feed-time');

    if (liveFeedToast && liveFeedText && liveFeedTime) {
        const locations = ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Koforidua', 'Ho', 'Sunyani', 'Tema', 'Obuasi'];
        const types = ['marketing agency', 'startup founder', 'developer', 'business owner', 'growth lead'];

        const showNextEvent = () => {
            const location = locations[Math.floor(Math.random() * locations.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const timeAgo = Math.floor(Math.random() * 5) + 1;

            liveFeedText.innerHTML = `<span class="text-purple-600 font-black">A ${type}</span> from ${location} just joined!`;
            liveFeedTime.textContent = `${timeAgo}m ago`;

            liveFeedToast.classList.add('show');
            setTimeout(() => liveFeedToast.classList.remove('show'), 6000);
        };

        setTimeout(() => {
            showNextEvent();
            setInterval(showNextEvent, 25000);
        }, 5000);
    }

    // 4. Testimonial Slider
    const track = document.querySelector('.testimonial-track');
    const slides = document.querySelectorAll('.testimonial-slide');
    if (track && slides.length > 0) {
        let currentSlide = 0;
        const totalSlides = slides.length;

        const rotateSlides = () => {
            currentSlide = (currentSlide + 1) % totalSlides;
            track.style.transform = `translateX(-${(currentSlide * 100) / totalSlides}%)`;
        };

        // Fix track width based on slide count
        track.style.width = `${totalSlides * 100}%`;
        slides.forEach(slide => {
            slide.style.width = `${100 / totalSlides}%`;
        });

        setInterval(rotateSlides, 5000);
    }

    // Add scroll-reveal class to sections
    document.querySelectorAll('section').forEach((section, index) => {
        if (index > 0 && section.id !== 'cta-section') { // Skip hero and cta sections
            section.classList.add('scroll-reveal');
        }
    });
    // Initialize Expansion Roadmap
    initExpansionRoadmap();
});

// ============================================================================
// Fetch Real Waitlist Count (Optional)
// ============================================================================

async function fetchWaitlistCount() {
    // If the URL hasn't been set yet, just use the default count
    if (SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL') return;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=count`);
        if (response.ok) {
            const data = await response.json();
            waitlistCount = data.count;
            document.querySelectorAll('#waitlist-count').forEach(el => {
                el.textContent = waitlistCount + '+';
            });
        }
    } catch (error) {
        console.log('Using default waitlist count');
    }
}

// Fetch count on load
fetchWaitlistCount();

// ============================================================================
// Global Expansion Roadmap Animation
// ============================================================================

function initExpansionRoadmap() {
    const section = document.getElementById('expansion-roadmap');
    if (!section) return;

    const ghanaNode = section.querySelector('.node-ghana');
    const waNodes = section.querySelectorAll('.node-wa');
    const globalNodes = section.querySelectorAll('.node-global');
    const phaseCards = [
        document.getElementById('phase-1-card'),
        document.getElementById('phase-2-card'),
        document.getElementById('phase-3-card')
    ];

    let hasStarted = false;

    const startExpansionSequence = () => {
        if (hasStarted) return;
        hasStarted = true;

        // Phase 1: Ghana
        if (ghanaNode) ghanaNode.classList.add('active');
        if (phaseCards[0]) phaseCards[0].classList.add('active');

        // Phase 2: West Africa
        setTimeout(() => {
            waNodes.forEach(node => {
                node.classList.add('active');
                drawConnectingLine(ghanaNode, node);
            });
            // Keep card grayed out as requested, but we can still highlight text color if needed
            // if (phaseCards[1]) phaseCards[1].classList.add('active'); 
        }, 1200);

        // Phase 3: Global
        setTimeout(() => {
            globalNodes.forEach(node => {
                node.classList.add('active');
                drawConnectingLine(ghanaNode, node);
            });
            // Keep card grayed out as requested
            // if (phaseCards[2]) phaseCards[2].classList.add('active');
        }, 2500);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
                startExpansionSequence();
                observer.unobserve(section);
            }
        });
    }, { threshold: 0.1 });

    observer.observe(section);

    function drawConnectingLine(start, end) {
        const svg = document.getElementById('expansion-lines');
        if (!svg || !start || !end) return;

        const x1 = parseFloat(start.getAttribute('data-x'));
        const y1 = parseFloat(start.getAttribute('data-y'));
        const x2 = parseFloat(end.getAttribute('data-x'));
        const y2 = parseFloat(end.getAttribute('data-y'));

        if (isNaN(x1) || isNaN(x2)) return;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const sx = x1 * 10;
        const sy = y1 * 5;
        const ex = x2 * 10;
        const ey = y2 * 5;

        // Curved arc
        const dx = ex - sx;
        const dy = ey - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;

        const arc = `M${sx},${sy} A${dr},${dr} 0 0,0 ${ex},${ey}`;

        line.setAttribute('d', arc);
        line.setAttribute('class', 'expansion-line');
        svg.appendChild(line);

        // Slight delay to ensure SVG is in DOM before starting stroke-dash animation
        requestAnimationFrame(() => {
            setTimeout(() => line.classList.add('active'), 50);
        });
    }
}

// ============================================================================
// Enhanced Channel Section Functionality
// ============================================================================

// 1 & 2. Scroll-triggered fade-in animations with staggered delays
function initChannelAnimations() {
    const section = document.getElementById('channels-section');
    if (!section) return;

    const cards = section.querySelectorAll('.channel-card');
    const progressBar = document.getElementById('phase-progress-bar');

    let hasAnimated = false;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;

                // Trigger card animations with staggered delays
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('animate-in');
                    }, index * 200);
                });

                // Animate progress bar
                if (progressBar) {
                    setTimeout(() => {
                        progressBar.classList.add('active');
                    }, 400);
                }
            }
        });
    }, { threshold: 0.2 });

    observer.observe(section);
}

// 5. Live metrics counter for SMS card
function initLiveCounter() {
    const counter = document.getElementById('sms-counter');
    if (!counter) return;

    let count = 12847;

    // Increment counter realistically every few seconds
    setInterval(() => {
        const increment = Math.floor(Math.random() * 15) + 5; // Random 5-20
        count += increment;

        // Animate the number change
        counter.style.transform = 'scale(1.1)';
        counter.textContent = count.toLocaleString();

        setTimeout(() => {
            counter.style.transform = 'scale(1)';
        }, 200);
    }, 4000); // Update every 4 seconds
}

// 6. Expandable cards toggle function
function toggleCard(button) {
    const card = button.closest('.channel-card');
    if (!card) return;

    const isExpanded = card.classList.contains('expanded');

    // Close all other cards
    document.querySelectorAll('.channel-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
        }
    });

    // Toggle current card
    if (isExpanded) {
        card.classList.remove('expanded');
        button.querySelector('span').textContent = 'Learn More';
    } else {
        card.classList.add('expanded');
        button.querySelector('span').textContent = 'Show Less';
    }
}

// Make toggleCard globally available
window.toggleCard = toggleCard;

// Initialize all channel enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initChannelAnimations();
    initLiveCounter();
});

