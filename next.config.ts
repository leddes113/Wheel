import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Включаем standalone режим для Docker deployment
  output: 'standalone',
  
  // Отключаем телеметрию Next.js
  productionBrowserSourceMaps: false,
  
  // Настройки для production
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
