import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import WebsiteDetail from './pages/WebsiteDetail';
import AddWebsite from './pages/AddWebsite';
import Settings from './pages/Settings';

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <Navbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: '70px', // 左側邊欄寬度
          pl: 0, // 左邊與導航列保留小間距
          pr: 3,
          py: 3,
          width: 'calc(100vw - 70px)' // 確保寬度不會超出
        }}
      >
        <Box sx={{ maxWidth: 'none' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:id" element={<WebsiteDetail />} />
            <Route path="/websites/add" element={<AddWebsite />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default App;