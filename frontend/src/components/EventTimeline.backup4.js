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
  // 將事件配對成異常-恢復組
  const pairEvents = (eventList) => {
    const pairs = [];
    let i = 0;

    while (i < eventList.length) {
      const event = eventList[i];

      if (event.type === 'recovery') {
        // 恢復事件在前，找下一個異常事件
        const nextEvent = i + 1 < eventList.length ? eventList[i + 1] : null;
        if (nextEvent && nextEvent.type === 'outage') {
          // 這是一對完整的事件（恢復在前，異常在後表示時間倒序）
          pairs.push({ outage: nextEvent, recovery: event });
          i += 2;
        } else {
          // 單獨的恢復事件
          pairs.push({ outage: null, recovery: event });
          i += 1;
        }
      } else if (event.type === 'outage') {
        // 異常事件，檢查是否有對應的恢復
        const nextEvent = i + 1 < eventList.length ? eventList[i + 1] : null;
        if (nextEvent && nextEvent.type === 'recovery') {
          pairs.push({ outage: event, recovery: nextEvent });
          i += 2;
        } else {
          // 進行中的異常
          pairs.push({ outage: event, recovery: null });
          i += 1;
        }
      } else {
        i += 1;
      }
    }

    return pairs;
  };

  const getEventIcon = (status) => {
    if (status === 'recovered') {
      return <CheckCircle sx={{ color: 'white' }} />;
    } else if (status === 'ongoing') {
      return <Warning sx={{ color: 'white' }} />;
    } else {
      return <Error sx={{ color: 'white' }} />;
    }
  };

  const getEventColor = (status) => {
    if (status === 'recovered') {
      return '#22c55e'; // 綠色
    } else if (status === 'ongoing') {
      return '#f59e0b'; // 橙色
    } else {
      return '#ef4444'; // 紅色
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
    const now = new Date();
    const daysDiff = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));

    let dateString;
    if (daysDiff === 0) {
      dateString = '今天';
    } else if (daysDiff === 1) {
      dateString = '昨天';
    } else if (daysDiff < 7) {
      const weekDay = ['日', '一', '二', '三', '四', '五', '六'][eventDate.getDay()];
      dateString = format(eventDate, 'MM/dd') + ` (週${weekDay})`;
    } else {
      dateString = format(eventDate, 'MM/dd');
    }

    const timeString = format(eventDate, 'HH:mm:ss');

    return { dateString, timeString };
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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
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
        
        <Box className="space-y-1">
          {pairEvents(events.slice(0, 20)).slice(0, 10).map((pair, index, array) => {
            const isLast = index === array.length - 1;
            const status = pair.recovery ? 'recovered' : 'ongoing';

            // 計算持續時間
            const calculateDuration = () => {
              if (pair.outage && pair.recovery) {
                const start = new Date(pair.outage.time);
                const end = new Date(pair.recovery.time);
                const diffMs = end - start;
                const diffMins = Math.floor(diffMs / 60000);

                if (diffMins < 1) return '< 1分';
                if (diffMins < 60) return `${diffMins}分`;

                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                return mins > 0 ? `${hours}小時${mins}分` : `${hours}小時`;
              }
              // 進行中的異常，計算從開始到現在的時間
              if (pair.outage) {
                const start = new Date(pair.outage.time);
                const now = new Date();
                const diffMs = now - start;
                const diffMins = Math.floor(diffMs / 60000);

                if (diffMins < 1) return '< 1分';
                if (diffMins < 60) return `${diffMins}分`;

                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                return mins > 0 ? `${hours}小時${mins}分` : `${hours}小時`;
              }
              return '';
            };

            const outageTime = pair.outage ? formatEventTime(pair.outage.time) : null;
            const recoveryTime = pair.recovery ? formatEventTime(pair.recovery.time) : null;


            // 格式化簡短時間
            const formatShortTime = (date) => {
              return format(new Date(date), 'MM/dd HH:mm');
            };

            // 決定顯示的錯誤原因
            const getReason = () => {
              if (pair.outage) {
                // 檢查描述中是否包含關鍵字相關資訊
                const desc = pair.outage.description || '';
                if (desc.includes('關鍵字') || desc.includes('keyword')) {
                  return '關鍵字不匹配';
                }

                if (pair.outage.statusCode === 0) return '連線逾時';
                if (pair.outage.statusCode >= 500) return `伺服器錯誤 (${pair.outage.statusCode})`;
                if (pair.outage.statusCode >= 400) return `HTTP ${pair.outage.statusCode}`;

                // 狀態碼正常但仍異常的情況（可能是關鍵字不匹配）
                if (pair.outage.statusCode >= 200 && pair.outage.statusCode < 300) {
                  return '關鍵字不匹配';
                }

                return `HTTP ${pair.outage.statusCode}`;
              }
              return '未知';
            };

            return (
              <Box key={`pair-${index}`} display="flex" gap={2}>
                {/* 時間線的點和線 - 使用 div 避免 MUI 樣式 */}
                <div
                  style={{
                    width: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    paddingTop: '12px'  // 垂直置中對齊
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: getEventColor(status),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ fontSize: '14px' }}>
                      {getEventIcon(status)}
                    </div>
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        width: '1px',
                        flex: 1,
                        backgroundColor: '#e0e0e0',
                        marginTop: '4px',
                        minHeight: '28px'
                      }}
                    />
                  )}
                </div>

                {/* 事件內容 - 區間顯示 */}
                <Box className="flex-1 mb-1">
                  <Paper elevation={0} sx={{ bgcolor: '#f9f9f9', borderRadius: 1, px: 2, py: 1.5 }}>
                    {pair.outage && (
                      <Box display="flex" alignItems="baseline" gap={1.5}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '13px',
                            color: '#333',
                            fontWeight: 500,
                            minWidth: 'fit-content'
                          }}
                        >
                          {formatShortTime(pair.outage.time)}
                        </Typography>

                        {pair.recovery && (
                          <>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '13px',
                                color: '#333'
                              }}
                            >
                              ~
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '13px',
                                color: '#333',
                                fontWeight: 500,
                                minWidth: 'fit-content'
                              }}
                            >
                              {formatShortTime(pair.recovery.time)}
                            </Typography>
                          </>
                        )}

                        {/* 只顯示一個標籤：已恢復顯示持續時間，進行中顯示狀態和時間 */}
                        {status === 'recovered' ? (
                          <Chip
                            label={calculateDuration()}
                            size="small"
                            color="success"
                            sx={{
                              fontSize: '12px',
                              height: '22px',
                              fontWeight: 500
                            }}
                          />
                        ) : (
                          <Chip
                            label={`進行中 (${calculateDuration()})`}
                            size="small"
                            color="warning"
                            sx={{
                              fontSize: '12px',
                              height: '22px',
                              fontWeight: 500
                            }}
                          />
                        )}

                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '12px',
                            color: '#666',
                            ml: 'auto',
                            fontWeight: 400
                          }}
                        >
                          {getReason()}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              </Box>
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