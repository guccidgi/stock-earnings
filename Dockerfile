# 使用官方 Node.js 鏡像作為基礎鏡像
FROM node:20-alpine AS base

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package.json package-lock.json ./

# 安裝依賴
RUN npm ci --legacy-peer-deps

# 複製源代碼
COPY . .

# 構建應用 (跳過 ESLint 檢查)
RUN NEXT_DISABLE_ESLINT=1 npm run build

# 生產環境
FROM node:20-alpine AS production
WORKDIR /app

# 設置環境變數
ENV NODE_ENV=production

# 複製依賴和構建文件
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/next.config.js ./next.config.js

# 暴露端口
EXPOSE 3000

# 啟動應用
CMD ["npm", "run", "start"]
