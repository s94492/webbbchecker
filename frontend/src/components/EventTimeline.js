import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  AccessTime
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const EventTimeline = ({ events, loading = false }) => {
  const getEventIcon = (type, severity) => {
    if (type === 'recovery') {
      return <CheckCircle sx={{ color: 'white' }} />;
    } else if (severity === 'error') {
      return <Error sx={{ color: 'white' }} />;
    } else {
      return <Warning sx={{ color: 'white' }} />;
    }
  };

  const getEventColor = (type, severity) => {
    if (type === 'recovery') {
      return 'success.main';
    } else if (severity === 'error') {
      return 'error.main';
    } else {
      return 'warning.main';
    }
  };

  const getSeverityChip = (severity, type) => {
    const config = {
      error: { label: '嚴重', color: 'error' },
      warning: { label: '警告', color: 'warning' },
      info: { label: '正常', color: 'success' }
    };
    
    if (type === 'recovery') {
      return <Chip label="恢復" color="success" size="small" />;
    }
    
    const chipConfig = config[severity] || { label: '未知', color: 'default' };
    return <Chip label={chipConfig.label} color={chipConfig.color} size="small" />;
  };

  const formatEventTime = (time) => {
    const eventDate = new Date(time);
    const timeString = format(eventDate, 'HH:mm:ss');
    const relativeTime = formatDistanceToNow(eventDate, { 
      addSuffix: true, 
      locale: zhTW 
    });
    
    return { timeString, relativeTime };
  };

  if (loading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <AccessTime className="text-orange-600" />
            <Typography variant="h6" className="font-inter font-semibold text-neutral-800">
              異常事件時間線
            </Typography>
          </Box>
          <Box textAlign="center" py={4}>
            <Typography variant="body2" className="text-neutral-500">
              載入中...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <AccessTime className="text-orange-600" />
            <Typography variant="h6" className="font-inter font-semibold text-neutral-800">
              異常事件時間線
            </Typography>
          </Box>
          <Alert severity="info" className="rounded-lg">
            在選定的時間範圍內沒有檢測到狀態變化事件
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm">
      <CardContent>
        <Box display="flex" alignItems="center" justify="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <AccessTime className="text-orange-600" />
            <Typography variant="h6" className="font-inter font-semibold text-neutral-800">
              異常事件時間線
            </Typography>
          </Box>
          <Chip 
            label={`${events.length} 個事件`} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        </Box>
        
        <Box className="space-y-4">
          {events.slice(0, 10).map((event, index) => {
            const { timeString, relativeTime } = formatEventTime(event.time);
            const isLast = index === events.length - 1;
            
            return (
              <Box key={event.id} display="flex" gap={3} className="relative">
                {/* 時間線的點和線 */}
                <Box className="flex flex-col items-center" sx={{ minWidth: 48 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: getEventColor(event.type, event.severity),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 1
                    }}
                  >
                    {getEventIcon(event.type, event.severity)}
                  </Box>
                  {!isLast && (
                    <Box
                      sx={{
                        width: 2,
                        height: 80,
                        bgcolor: 'divider',
                        mt: 1
                      }}
                    />
                  )}
                </Box>
                
                {/* 事件內容 */}
                <Box className="flex-1 pb-4">
                  <Paper className="p-4 bg-gray-50 rounded-lg" elevation={1}>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Typography variant="subtitle2" className="font-inter font-semibold text-neutral-800">
                        {event.title}
                      </Typography>
                      {getSeverityChip(event.severity, event.type)}
                    </Box>
                    
                    <Typography variant="body2" className="text-neutral-600 mb-2">
                      {event.description}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={3} className="text-sm text-neutral-500">
                      <Box display="flex" alignItems="center" gap={1}>
                        <AccessTime fontSize="small" />
                        <span>{timeString}</span>
                      </Box>
                      <span>•</span>
                      <span>{relativeTime}</span>
                      {event.statusCode && (
                        <>
                          <span>•</span>
                          <span>狀態碼: {event.statusCode}</span>
                        </>
                      )}
                      {event.responseTime && (
                        <>
                          <span>•</span>
                          <span>回應時間: {event.responseTime}ms</span>
                        </>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Box>
            );
          })}
        </Box>
        
        {events.length > 10 && (
          <Box textAlign="center" mt={2}>
            <Typography variant="caption" className="text-neutral-500">
              顯示最近 {events.slice(0, 10).length} 個事件
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EventTimeline;