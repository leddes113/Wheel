#!/usr/bin/env node

/**
 * Скрипт для инициализации данных при первом запуске
 * Создаёт пустой state.json если его нет
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Начальное состояние
const INITIAL_STATE = {
  users: [],
  assignments: [],
  usedTopics: {
    easy: [],
    hard: []
  },
  submissions: []
};

function initializeData() {
  console.log('🔧 Initializing data...');

  // Создаём директорию data если её нет
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('✓ Created data directory');
  }

  // Создаём state.json если его нет
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify(INITIAL_STATE, null, 2),
      'utf-8'
    );
    console.log('✓ Created state.json with initial data');
  } else {
    console.log('✓ state.json already exists');
  }

  // Проверяем наличие файлов с темами
  const topicsEasy = path.join(DATA_DIR, 'topics_easy.json');
  const topicsHard = path.join(DATA_DIR, 'topics_hard.json');

  if (!fs.existsSync(topicsEasy)) {
    console.warn('⚠ Warning: topics_easy.json not found');
  } else {
    console.log('✓ topics_easy.json exists');
  }

  if (!fs.existsSync(topicsHard)) {
    console.warn('⚠ Warning: topics_hard.json not found');
  } else {
    console.log('✓ topics_hard.json exists');
  }

  console.log('\n✨ Data initialization complete!');
}

// Запускаем инициализацию
try {
  initializeData();
  process.exit(0);
} catch (error) {
  console.error('❌ Error during initialization:', error);
  process.exit(1);
}






