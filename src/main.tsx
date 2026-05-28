import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/practice" element={<App mode="practice" />} />
        <Route path="/editor" element={<App mode="editor" />} />
        <Route path="*" element={<Navigate to="/practice" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
