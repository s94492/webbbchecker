import React, { Fragment } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

  const getStatusIcon = (status) => {
    if (status === 'recovered') {
      return <CheckCircle sx={{ color: '#22c55e', fontSize: 18 }} />;
    } else if (status === 'ongoing') {
      return <Warning sx={{ color: '#f59e0b', fontSize: 18 }} />;
    } else {
      return <Error sx={{ color: '#ef4444', fontSize: 18 }} />;
    }
  };

  // 格式化簡短時間
  const formatShortTime = (date) => {
    return format(new Date(date), 'yyyy-MM-dd HH:mm');
  };

  // 計算持續時間
  const calculateDuration = (pair) => {
    if (pair.outage && pair.recovery) {
      const start = new Date(pair.outage.time);
      const end = new Date(pair.recovery.time);
      const diffMs = end - start;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return '< 1分鐘';
      if (diffMins < 60) return `${diffMins}分鐘`;

      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}小時${mins}分鐘` : `${hours}小時`;
    }
    // 進行中的異常，計算從開始到現在的時間
    if (pair.outage) {
      const start = new Date(pair.outage.time);
      const now = new Date();
      const diffMs = now - start;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return '< 1分鐘';
      if (diffMins < 60) return `${diffMins}分鐘`;

      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}小時${mins}分鐘` : `${hours}小時`;
    }
    return '';
  };

  // 決定顯示的錯誤原因
  const getReason = (pair) => {
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

  const pairedEvents = pairEvents(events.slice(0, 20)).slice(0, 10);

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

        <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 600, width: '10%', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  狀態
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: '20%', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  開始時間
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: '20%', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  結束時間
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '15%', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  持續時間
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: '35%', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  原因
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pairedEvents.map((pair, index) => {
                const status = pair.recovery ? 'recovered' : 'ongoing';

                return (
                  <TableRow
                    key={`pair-${index}`}
                    sx={{
                      '&:hover': { bgcolor: '#f9fafb' },
                      '& .MuiTableCell-root': {
                        borderBottom: '1px solid #f3f4f6',
                        py: 1.5
                      }
                    }}
                  >
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        {getStatusIcon(status)}
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600, color: status === 'recovered' ? '#22c55e' : '#f59e0b' }}>
                          {status === 'recovered' ? '已恢復' : '進行中'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
                        {pair.outage ? formatShortTime(pair.outage.time) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
                        {pair.recovery ? formatShortTime(pair.recovery.time) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: status === 'recovered' ? '#059669' : '#d97706'
                      }}>
                        {calculateDuration(pair)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                        {getReason(pair)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

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