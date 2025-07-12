import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { PasswordReset } from './components/Auth/PasswordReset';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<PasswordReset/>} />
        <Route path="/*" element={<App/>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);