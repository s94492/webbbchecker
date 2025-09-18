# 修復 PDF 報表 X 軸顯示錯誤日期問題

## 發布日期
2025-09-17 11:43

## 版本
v1.0.15-patch

## 修復內容

### 問題描述
- 選擇「最近 30 天」生成 PDF 時，X 軸顯示 8/13 等過期日期
- 當前日期是 9/17，30 天前應該是 8/18
- 原因：X 軸標籤使用固定計算而非實際資料時間

### 根本原因
原代碼邏輯：
```javascript
// 錯誤：從當前時間往回推算
const timeOffset = (totalHours / timeSteps) * (timeSteps - i);
const timeLabel = new Date(currentTime.getTime() - (timeOffset * 60 * 60 * 1000));
```

這種方式會根據 timeSteps 平均分割時間範圍，但沒有考慮實際資料的時間點。

### 解決方案

#### 使用實際資料的時間
修改 `backend/src/routes/websiteReports.js`：
1. 優先使用 `metrics` 陣列中的實際時間
2. 根據資料點數量和顯示需求選擇合適的標籤
3. 只在沒有資料時才使用回推邏輯

```javascript
// 新邏輯：使用實際資料時間
if (metrics.length > 0) {
  const dataIndex = Math.min(i * labelInterval, metrics.length - 1);
  const metric = metrics[dataIndex];
  const timeLabel = new Date(metric.time);
  // 使用實際時間生成標籤
}
```

## 技術細節

### 修改檔案
- `backend/src/routes/websiteReports.js`
  - 第 743-793 行：重寫 X 軸時間標籤生成邏輯
  - 新增實際資料時間的使用
  - 保留無資料時的回退邏輯

### 改進效果
- **之前**：30 天報表顯示 8/13（錯誤）
- **之後**：30 天報表顯示正確的日期範圍（8/18 ~ 9/17）

## 測試結果
- ✅ PDF X 軸顯示正確的日期
- ✅ 與實際監控資料時間一致
- ✅ 各種時間範圍都正確顯示
- ✅ 無資料時仍能正常生成

## 影響範圍
- 所有 PDF 報表的時間軸顯示
- 提升報表準確性
- 修正資料與標籤不一致的問題