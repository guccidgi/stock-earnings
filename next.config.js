/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15 默認已經啟用 App Router
  experimental: {
    // 沒有需要额外的實驗屬性
  },
  // 確保靜態資源可以正確訪問
  images: {
    domains: [],
  },
  // 簡化 webpack 配置，使用 Next.js 內建的 CSS 處理
  webpack: (config) => {
    return config;
  },
  // 不再需要特別處理 styled-jsx
  // 移除不必要的編譯器配置

};

module.exports = nextConfig;
