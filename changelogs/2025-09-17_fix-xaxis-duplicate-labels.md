# 修復圖表 X 軸時間標籤重複問題

## 發布日期
2025-09-17 11:31

## 版本
v1.0.13-patch

## 修復內容

### 問題描述
- X 軸出現多個相同的時間標籤（如多個 13:30, 16:30, 20:00）
- 時間標籤分佈極不均勻（前半段密集，後半段稀疏）
- 02:00 到 05:00 之間完全沒有標籤

### 根本原因
原邏輯將多個資料點都歸類到相同的整點/半點，導致：
1. 同一個整點時間出現多次
2. 某些小時完全沒有資料點，造成空白區域

### 解決方案

#### 智能選擇最接近整點的資料點
新增 `findHourlyPoints()` 函數：
1. 遍歷所有資料點
2. 找出每個小時中最接近整點的資料點
3. 只為這些選中的資料點顯示時間標籤
4. 確保每個小時最多只有一個標籤

```javascript
const findHourlyPoints = () => {
  const hourlyIndices = new Map();
  metrics.forEach((metric, index) => {
    const hour = date.getHours();
    const minuteDiff = Math.abs(minutes - 0);

    // 保留最接近整點的資料點
    if (!hourlyIndices.has(hour) ||
        minuteDiff < hourlyIndices.get(hour).diff) {
      hourlyIndices.set(hour, { index, diff: minuteDiff });
    }
  });
  return new Set(Array.from(hourlyIndices.values()).map(v => v.index));
};
```

## 技術細節

### 修改檔案
- `frontend/src/pages/WebsiteDetail.js`
  - 第 226-242 行：新增 findHourlyPoints() 函數
  - 第 253-260 行：只為選中的資料點顯示整點標籤

### 改進效果
- **之前**：多個 13:30, 16:30, 20:00 等重複標籤
- **之後**：每個小時只顯示一個整點標籤（如 13:00, 14:00, 15:00）

## 測試結果
- ✅ 消除重複的時間標籤
- ✅ 每個小時最多顯示一個整點
- ✅ 標籤分佈更均勻
- ✅ 圖表可讀性大幅提升

## 影響範圍
- 24 小時監控圖表
- 改善時間軸呈現
- 提升專業度