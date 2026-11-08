import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { loadConfig } from './config';
import { DataProvider } from './DataContext';
import App from './App';
import './styles.css';

loadConfig().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode><BrowserRouter><DataProvider><App /></DataProvider></BrowserRouter></StrictMode>,
  ),
);
