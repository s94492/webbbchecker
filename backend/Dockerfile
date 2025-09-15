FROM node:20-slim

# 安裝中文字體支援
RUN apt-get update && apt-get install -y \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-mono \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

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
EXPOSE 3001

# 啟動應用
CMD ["npm", "start"]