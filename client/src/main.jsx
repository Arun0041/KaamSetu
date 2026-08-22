/**
 * Application entry point.
 * Mounts the React root and renders the App component.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
