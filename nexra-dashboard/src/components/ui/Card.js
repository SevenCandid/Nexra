import { html, useState, useEffect, useRef, useMemo } from '../../utils/htm.js';

export const Card = ({ children, className = '', ...props }) => {
    return html`<div className="premium-card rounded-2xl ${className}" ...${props}>${children}</div>`;
};