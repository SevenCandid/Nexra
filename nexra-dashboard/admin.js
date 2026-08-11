const { createRoot } = window.ReactDOM;

import { html } from './src/utils/htm.js';
import { AuthProvider, ToastProvider } from './src/context/index.js';
import { AdminApp } from './src/components/layout/AdminApp.js';

// Hide splash screen when app is ready
const hideSplashScreen = () => {
    document.body.classList.add('app-ready');
};

// Initialize App
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(html`
    <${ToastProvider}>
        <${AuthProvider}>
            <${AdminApp} />
        </${AuthProvider}>
    </${ToastProvider}>
`);

// Hide splash screen after brief delay to ensure styles are loaded
setTimeout(hideSplashScreen, 1500);
