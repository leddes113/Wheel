"use client";

import { useEffect, useRef, useState } from "react";

interface TopicWheelProps {
  onComplete: () => void;
  duration?: number; // длительность анимации в мс (по умолчанию 1500)
  finalTopic?: string; // финальная тема, которая будет показана после остановки
}

// Фейковые темы для визуального эффекта прокрутки
const PLACEHOLDER_TOPICS = [
  "Создание системы управления задачами",
  "Разработка платформы для онлайн-обучения",
  "Построение инструмента для аналитики данных",
  "Реализация системы бронирования",
  "Создание приложения для фитнес-трекинга",
  "Разработка платформы для управления проектами",
  "Построение CRM-системы",
  "Создание инструмента для командной работы",
  "Разработка системы управления складом",
  "Построение платформы для электронной коммерции",
  "Создание системы мониторинга",
  "Разработка инструмента для автоматизации",
  "Построение платформы для обратной связи",
  "Создание системы управления контентом",
  "Разработка инструмента для планирования",
];

export default function TopicWheel({ 
  onComplete, 
  duration = 1500, 
  finalTopic
}: TopicWheelProps) {
  const [offset, setOffset] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [showFinalTopic, setShowFinalTopic] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing функция для более плавного и драматичного замедления
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      // Начинаем быстро, затем замедляемся
      const itemHeight = 80;
      const cycles = 6;
      const itemsPerCycle = PLACEHOLDER_TOPICS.length; // 15
      
      // Останавливаемся на позиции, где находится реальная тема (после 6 полных циклов)
      // Позиция = количество элементов до неё * высота элемента + половина высоты для центрирования
      const stopIndex = itemsPerCycle * cycles; // 90
      const finalOffset = stopIndex * itemHeight + itemHeight / 2;
      
      const currentOffset = easeOutCubic * finalOffset;

      setOffset(currentOffset);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Анимация завершена
        setIsSpinning(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [duration, finalTopic]);

  // Показываем финальную тему после остановки колеса
  useEffect(() => {
    if (!isSpinning && finalTopic) {
      // Небольшая задержка перед показом финальной темы
      const showTimeout = setTimeout(() => {
        setShowFinalTopic(true);
      }, 100);

      return () => {
        clearTimeout(showTimeout);
      };
    }
  }, [isSpinning, finalTopic]);

  // Извлекаем только название темы (первая строка до \n\n)
  const getTopicTitle = (topic: string) => {
    const firstParagraph = topic.split('\n\n')[0];
    return firstParagraph || topic;
  };

  // Создаем расширенный список тем для прокрутки
  // Если есть финальная тема, вставляем её на позицию, где остановится анимация (после 6 циклов)
  const itemsPerCycle = PLACEHOLDER_TOPICS.length; // 15
  const cycles = 6;
  const stopPosition = itemsPerCycle * cycles; // 90 - позиция остановки
  
  // Создаём список: 6 полных циклов + финальная тема + ещё плейсхолдеры для плавности
  const topicsWithFinal = finalTopic 
    ? [
        ...Array(cycles).fill(PLACEHOLDER_TOPICS).flat(), // 6 полных циклов
        getTopicTitle(finalTopic),                        // Реальная тема на месте остановки
        ...PLACEHOLDER_TOPICS,                             // Ещё один цикл для визуала
      ]
    : Array(10).fill(PLACEHOLDER_TOPICS).flat();

  return (
    <div className="wheel-container">
      <div className="wheel-overlay-top"></div>
      <div className="wheel-viewport">
        {isSpinning ? (
          <div
            ref={wheelRef}
            className="wheel-content"
            style={{
              transform: `translateY(-${offset}px)`,
            }}
          >
            {topicsWithFinal.map((topic, index) => (
              <div key={index} className="wheel-item">
                {topic}
              </div>
            ))}
          </div>
        ) : (
          <div className="wheel-final-result">
            {showFinalTopic && finalTopic && (
              <>
                <div className="wheel-final-topic">
                  {getTopicTitle(finalTopic)}
                </div>
                <button 
                  className="wheel-accept-button"
                  onClick={onComplete}
                >
                  Закрепить тему
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="wheel-overlay-bottom"></div>
      {isSpinning && <div className="wheel-selector"></div>}
    </div>
  );
}
