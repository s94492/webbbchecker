import React, { Fragment } from 'react';
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
          {events.length > 10 && (
            <Chip
              label={`顯示最新 10 筆，共 ${events.length} 個事件`}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        
        <Box className="space-y-2">
          {events.slice(0, 10).map((event, index, array) => {
            const { timeString, relativeTime } = formatEventTime(event.time);
            const isLast = index === array.length - 1;

            return (
              <Fragment key={event.id}>
                <Box display="flex" gap={2}>
                  {/* 時間線的點和線 - 固定寬度對齊 */}
                <Box
                  className="flex-shrink-0"
                  sx={{
                    width: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: getEventColor(event.type, event.severity),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 1,
                      flexShrink: 0,
                      '& svg': { fontSize: '16px' }
                    }}
                  >
                    {getEventIcon(event.type, event.severity)}
                  </Box>
                  {!isLast && (
                    <Box
                      sx={{
                        width: 2,
                        flex: 1,
                        bgcolor: 'divider',
                        mt: 0.5,
                        minHeight: 35
                      }}
                    />
                  )}
                </Box>

                {/* 事件內容 - 更緊湊 */}
                <Box className="flex-1 mb-1">
                  <Paper className="p-1.5 bg-gray-50 rounded" elevation={0}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Typography variant="body2" className="font-semibold text-neutral-800" sx={{ fontSize: '14px' }}>
                        {event.title}
                      </Typography>
                      {getSeverityChip(event.severity, event.type)}
                    </Box>

                    <Typography variant="body2" className="text-neutral-600 line-clamp-1" sx={{ fontSize: '13px' }}>
                      {event.description}
                    </Typography>

                    <Box display="flex" alignItems="center" gap={2} className="text-neutral-500 mt-0.5" sx={{ fontSize: '12px' }}>
                      <span>{timeString}</span>
                      <span>•</span>
                      <span>{relativeTime}</span>
                      {event.statusCode && (
                        <>
                          <span>•</span>
                          <span>HTTP {event.statusCode}</span>
                        </>
                      )}
                      {event.responseTime && (
                        <>
                          <span>•</span>
                          <span>{event.responseTime}ms</span>
                        </>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Box>
              {!isLast && (
                <Box
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    mx: 2,
                    my: 0.5
                  }}
                />
              )}
            </Fragment>
            );
          })}
        </Box>
        
        {events.length > 10 && (
          <Box textAlign="center" mt={2}>
            <Typography variant="caption" className="text-neutral-500">
              顯示最近 10 個事件
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EventTimeline;