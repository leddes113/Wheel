// GET /api/test-deepseek - Диагностика DeepSeek API

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
  const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const USE_DEEPSEEK = process.env.USE_DEEPSEEK === "true";
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    config: {
      USE_DEEPSEEK,
      DEEPSEEK_MODEL,
      hasApiKey: !!DEEPSEEK_API_KEY,
      apiKeyPrefix: DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.substring(0, 10) + "..." : "NOT SET",
    },
    test: null as any,
  };

  // Если USE_DEEPSEEK не включён
  if (!USE_DEEPSEEK) {
    return NextResponse.json({
      ...diagnostics,
      message: "DeepSeek отключён (USE_DEEPSEEK=false). Используется mock режим.",
    });
  }

  // Если нет API ключа
  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json({
      ...diagnostics,
      error: "DEEPSEEK_API_KEY не установлен в .env.local",
    }, { status: 400 });
  }

  // Тест запроса к DeepSeek API
  try {
    console.log("🧪 Testing DeepSeek API...");
    
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: "Ты помощник." },
          { role: "user", content: "Ответь одним словом: тест." },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    });

    diagnostics.test = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    };

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ DeepSeek API error:", errorText);
      
      return NextResponse.json({
        ...diagnostics,
        error: "DeepSeek API вернул ошибку",
        details: errorText,
      }, { status: response.status });
    }

    const data = await response.json();
    console.log("✅ DeepSeek API test successful");

    return NextResponse.json({
      ...diagnostics,
      test: {
        ...diagnostics.test,
        response: data,
        message: data.choices?.[0]?.message?.content || "N/A",
      },
      success: true,
      message: "DeepSeek API работает корректно!",
    });

  } catch (error: any) {
    console.error("❌ DeepSeek test error:", error);
    
    return NextResponse.json({
      ...diagnostics,
      error: "Ошибка при тестировании DeepSeek API",
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
