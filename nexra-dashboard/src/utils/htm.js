// Expose global React utilities and htm
export const { useState, useEffect, createContext, useContext, useRef, useMemo, useCallback } = window.React;
export const html = window.htm.bind(window.React.createElement);
