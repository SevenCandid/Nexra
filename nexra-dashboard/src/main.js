import { html } from './utils/htm.js';
import { AuthProvider } from './context/AuthContext.js';
import { ToastProvider, useToast } from './context/ToastContext.js';
import { App } from './pages/App.js';

const { createRoot } = window.ReactDOM;

const hideSplashScreen = () => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        document.body.classList.add('app-ready');
        setTimeout(() => splash.remove(), 500); 
    }
};

const root = createRoot(document.getElementById('root'));
root.render(html`
    <${AuthProvider}>
        <${ToastProvider}>
            <${App} />
        </${ToastProvider}>
    </${AuthProvider}>
`);

// Give the splash screen animation roughly 1s to play out before the app removes it.
setTimeout(() => {
    hideSplashScreen();
}, 1000);
