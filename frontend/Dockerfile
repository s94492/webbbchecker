FROM node:20-slim

# 設定工作目錄
WORKDIR /app

# 使用官方 npm registry
RUN npm config set registry https://registry.npmjs.org

# 複製套件定義檔案
COPY package*.json ./

# 安裝依賴套件
RUN npm install --no-optional --no-audit --no-fund

# 複製應用程式碼
COPY . .

# 開放埠號
EXPOSE 3000

# 設定環境變數讓React dev server監聽所有介面
ENV HOST=0.0.0.0

# 啟動應用
CMD ["npm", "start"]