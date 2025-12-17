#!/usr/bin/env node

/**
 * Скрипт для проверки конфигурации перед запуском
 * Проверяет наличие необходимых переменных окружения и файлов
 */

const fs = require('fs');
const path = require('path');

// Загрузка переменных окружения из .env файлов
function loadEnvFiles() {
  const envFiles = ['.env.local', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...values] = line.split('=');
          if (key && values.length > 0) {
            const value = values.join('=').trim();
            // Не перезаписываем существующие переменные окружения
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  }
}

loadEnvFiles();

const REQUIRED_FILES = [
  'data/state.json',
  'data/topics_easy.json',
  'data/topics_hard.json'
];

const REQUIRED_ENV_VARS = [
  'ADMIN_ALLOWLIST'
];

const WARNINGS = [];
const ERRORS = [];

console.log('🔍 Checking environment configuration...\n');

// Проверка переменных окружения
console.log('Environment Variables:');
REQUIRED_ENV_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    ERRORS.push(`Missing required environment variable: ${varName}`);
    console.log(`  ❌ ${varName}: NOT SET`);
  } else {
    console.log(`  ✓ ${varName}: ${value.length > 50 ? value.substring(0, 47) + '...' : value}`);
  }
});

// Проверка NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`  ℹ NODE_ENV: ${nodeEnv}`);
if (nodeEnv === 'production') {
  console.log('  ⚡ Running in PRODUCTION mode');
} else {
  WARNINGS.push('Running in development mode. Set NODE_ENV=production for production.');
}

// Проверка файлов
console.log('\nRequired Files:');
REQUIRED_FILES.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    ERRORS.push(`Missing required file: ${filePath}`);
    console.log(`  ❌ ${filePath}: NOT FOUND`);
  } else {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`  ✓ ${filePath}: ${size} KB`);
  }
});

// Проверка прав доступа на запись в data/
console.log('\nPermissions:');
const dataDir = path.join(process.cwd(), 'data');
try {
  fs.accessSync(dataDir, fs.constants.W_OK);
  console.log('  ✓ data/ directory is writable');
} catch (error) {
  ERRORS.push('data/ directory is not writable');
  console.log('  ❌ data/ directory is NOT writable');
}

// Проверка портов
const port = process.env.PORT || 3000;
console.log('\nNetwork:');
console.log(`  ℹ Application will listen on port: ${port}`);

// Вывод предупреждений
if (WARNINGS.length > 0) {
  console.log('\n⚠ Warnings:');
  WARNINGS.forEach(warning => console.log(`  - ${warning}`));
}

// Вывод ошибок
if (ERRORS.length > 0) {
  console.log('\n❌ Errors:');
  ERRORS.forEach(error => console.log(`  - ${error}`));
  console.log('\n💡 Please fix the errors above before starting the application.');
  process.exit(1);
} else {
  console.log('\n✨ All checks passed! Application is ready to start.');
  process.exit(0);
}
