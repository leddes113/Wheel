import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Health check endpoint для мониторинга состояния приложения
 * GET /api/health
 */
export async function GET() {
  try {
    const dataPath = join(process.cwd(), 'data');
    
    // Проверяем доступность критических файлов
    const checks = {
      stateFile: existsSync(join(dataPath, 'state.json')),
      topicsEasy: existsSync(join(dataPath, 'topics_easy.json')),
      topicsHard: existsSync(join(dataPath, 'topics_hard.json')),
    };

    const allHealthy = Object.values(checks).every(check => check === true);

    if (!allHealthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          checks,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '0.1.0',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
