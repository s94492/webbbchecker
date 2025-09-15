import React from 'react';
import { Drawer, IconButton, Box, List, ListItem, ListItemIcon, Divider, Tooltip } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { Monitor, Dashboard, List as ListIcon, Add, BarChart, Settings } from '@mui/icons-material';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: '儀表板', icon: <Dashboard /> },
    { path: '/websites/add', label: '新增網站', icon: <Add /> },
    { path: '/settings', label: '設定', icon: <Settings /> },
  ];

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: 70,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 70,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb'
        }
      }}
    >
      {/* 頂部品牌區域 */}
      <Box sx={{ p: 1, borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
        <Tooltip title="Website Monitor" placement="right">
          <IconButton 
            component={Link}
            to="/dashboard"
            sx={{ 
              color: '#2563eb',
              '&:hover': {
                backgroundColor: '#eff6ff'
              }
            }}
          >
            <Monitor sx={{ fontSize: '2rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 導航選單 */}
      <Box sx={{ flex: 1, py: 1 }}>
        <List sx={{ px: 0.5 }}>
          {navItems.map((item) => (
            <Tooltip key={item.path} title={item.label} placement="right">
              <ListItem
                component={Link}
                to={item.path}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  backgroundColor: (location.pathname === item.path || (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'))) ? '#eff6ff' : 'transparent',
                  color: (location.pathname === item.path || (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'))) ? '#2563eb' : '#6b7280',
                  textDecoration: 'none',
                  justifyContent: 'center',
                  p: 1,
                  minHeight: 48,
                  '&:hover': {
                    backgroundColor: (location.pathname === item.path || (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'))) ? '#eff6ff' : '#f8fafc'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <ListItemIcon
                  sx={{
                    color: (location.pathname === item.path || (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'))) ? '#2563eb' : '#6b7280',
                    minWidth: 'auto',
                    justifyContent: 'center'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              </ListItem>
            </Tooltip>
          ))}
        </List>
      </Box>

      <Divider />

      {/* 底部 Grafana 連結 */}
      <Box sx={{ p: 1 }}>
        <Tooltip title="Grafana 儀表板" placement="right">
          <IconButton
            href="/grafana"
            target="_blank"
            sx={{ 
              width: '100%',
              borderRadius: 2,
              border: '1px solid #d1d5db',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: '#d1d5db'
              }
            }}
          >
            <BarChart />
          </IconButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
};

export default Navbar;