import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ========================= DATA =========================
const THEMES = {
  fruits:  { name: 'Фрукты',   emojis: ['🍎','🍌','🍒','🍇','🍓','🍑','🍍','🥝'] },
  animals: { name: 'Животные', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼'] },
  food:    { name: 'Еда',      emojis: ['🍕','🍔','🌮','🍣','🍩','🍪','🍰','🧁'] }
};

const DIFFICULTIES = {
  easy:   { name: 'Лёгкая', pairs: 4,  cols: 4, rows: 2, three: 5,  two: 7  },
  medium: { name: 'Средняя', pairs: 6, cols: 4, rows: 3, three: 8,  two: 11 },
  hard:   { name: 'Сложная', pairs: 8, cols: 4, rows: 4, three: 11, two: 15 }
};

const PALETTE = [
  { hex: '#0f0524', name: 'Фон (глубокий)', color: '#fff' },
  { hex: '#1a0b3d', name: 'Фон (средний)',  color: '#fff' },
  { hex: '#2d1b69', name: 'Фон (светлый)',  color: '#fff' },
  { hex: '#ffd700', name: 'Акцент (золото)', color: '#0f0524' },
  { hex: '#b794f6', name: 'Рамки/подсветка', color: '#0f0524' },
  { hex: '#9f7aea', name: 'Лавандовый',     color: '#0f0524' },
  { hex: '#6b46c1', name: 'Рубашка карт',   color: '#fff' },
  { hex: '#48bb78', name: 'Найденная пара', color: '#0f0524' },
  { hex: '#e9d8fd', name: 'Вторичный текст', color: '#0f0524' },
  { hex: '#ffffff', name: 'Текст',          color: '#0f0524' }
];

const STORAGE_KEY = 'memori-stars-v1';

type Difficulty = 'easy' | 'medium' | 'hard';
type Theme = 'fruits' | 'animals' | 'food';
type Screen = 'menu' | 'game' | 'win' | 'records' | 'about';

interface Card {
  id: number;
  emoji: string;
  matched: boolean;
}

interface GameState {
  cards: Card[];
  first: number | null;
  second: number | null;
  lock: boolean;
  moves: number;
  found: number;
  seconds: number;
}

interface StarRecord {
  stars: number;
  moves: number;
}

// ========================= UTILITIES =========================
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function loadStars(): Record<string, StarRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStar(theme: string, diff: string, stars: number, moves: number): boolean {
  const data = loadStars();
  const key = `${theme}:${diff}`;
  const prev = data[key];
  if (!prev || stars > prev.stars || (stars === prev.stars && moves < prev.moves)) {
    data[key] = { stars, moves };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  }
  return false;
}

function calcStars(diffKey: Difficulty, moves: number): number {
  const d = DIFFICULTIES[diffKey];
  if (moves <= d.three) return 3;
  if (moves <= d.two) return 2;
  return 1;
}

function StarDisplay({ count, size = 'text-[clamp(2.6rem,10vw,4rem)]', gap = 'gap-[10px]', animated = false }: { count: number; size?: string; gap?: string; animated?: boolean }) {
  return (
    <span className={`inline-flex items-center ${gap} ${size}`}>
      {[...Array(3)].map((_, i) => (
        <span
          key={i}
          className={i < count ? (animated ? 'animate-star-appear inline-block' : '') : 'opacity-30 grayscale'}
          style={animated && i < count ? { animationDelay: `${i * 0.2}s` } : {}}
        >
          ⭐
        </span>
      ))}
    </span>
  );
}

function hexA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// ========================= BACKGROUND COMPONENT =========================
function AnimatedBackground() {
  const elements = useMemo(() => {
    const colors = ['#9f7aea', '#b794f6', '#ed64a6', '#4299e1', '#4fd1c5', '#ffd700', '#d6bcfa'];
    const balls: Array<{ size: number; left: number; top: number; bg: string; dur: number; delay: number }> = [];
    const stars: Array<{ size: number; left: number; top: number; bg: string; glow: boolean; dur: number; delay: number }> = [];

    const ballCount = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < ballCount; i++) {
      const size = 20 + Math.random() * 60;
      const alpha = 0.1 + Math.random() * 0.15;
      const c = colors[Math.floor(Math.random() * colors.length)];
      balls.push({
        size,
        left: Math.random() * 96,
        top: Math.random() * 96,
        bg: `radial-gradient(circle at 35% 35%, ${hexA(c, alpha)}, ${hexA(c, alpha * 0.4)})`,
        dur: 25 + Math.random() * 20,
        delay: Math.random() * 25
      });
    }

    const starCount = 40 + Math.floor(Math.random() * 21);
    for (let i = 0; i < starCount; i++) {
      const size = 1 + Math.random() * 2;
      stars.push({
        size,
        left: Math.random() * 100,
        top: Math.random() * 100,
        bg: Math.random() < 0.5 ? '#ffffff' : '#fef3c7',
        glow: Math.random() < 0.3,
        dur: 2 + Math.random() * 4,
        delay: Math.random() * 4
      });
    }

    return { balls, stars };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {elements.balls.map((ball, i) => (
        <div
          key={`ball-${i}`}
          className="absolute rounded-full animate-drift"
          style={{
            width: ball.size,
            height: ball.size,
            left: `${ball.left}vw`,
            top: `${ball.top}vh`,
            background: ball.bg,
            animationDuration: `${ball.dur.toFixed(1)}s`,
            animationDelay: `-${ball.delay.toFixed(1)}s`,
          }}
        />
      ))}
      {elements.stars.map((star, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full animate-twinkle"
          style={{
            width: star.size,
            height: star.size,
            left: `${star.left}vw`,
            top: `${star.top}vh`,
            background: star.bg,
            boxShadow: star.glow ? '0 0 6px 1px rgba(255,255,255,0.6)' : 'none',
            animationDuration: `${star.dur.toFixed(2)}s`,
            animationDelay: `-${star.delay.toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}

// ========================= CARD COMPONENT =========================
function CardComponent({ card, flipped, onClick }: { card: Card; flipped: boolean; onClick: () => void }) {
  return (
    <div
      className="aspect-square cursor-pointer perspective-700"
      onClick={onClick}
    >
      <div
        className={`relative w-full h-full preserve-3d transition-transform duration-250 ease-in-out ${flipped || card.matched ? 'rotate-y-180' : ''}`}
      >
        {/* Back */}
        <div className="absolute inset-0 backface-hidden rounded-[14px] bg-gradient-to-br from-violet to-violet-deep border border-violet-light/50 flex items-center justify-center shadow-[0_6px_16px_rgba(15,5,36,0.55),0_0_14px_rgba(159,122,234,0.3)]">
          <span className="text-[2.5rem] text-gold font-bold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">?</span>
        </div>
        {/* Front */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 rounded-[14px] bg-[rgba(26,11,61,0.9)] border flex items-center justify-center text-[clamp(1.6rem,7vw,2.4rem)] ${
            card.matched
              ? 'border-green animate-pulse-green shadow-[0_0_14px_rgba(72,187,120,0.55)]'
              : 'border-violet-light'
          }`}
        >
          {card.emoji}
        </div>
      </div>
    </div>
  );
}

// ========================= MAIN APP =========================
export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [theme, setTheme] = useState<Theme>('fruits');
  const [game, setGame] = useState<GameState | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [winData, setWinData] = useState<{ stars: number; moves: number; time: number; best: StarRecord | null } | null>(null);
  const [records, setRecords] = useState<Record<string, StarRecord>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (screen === 'game' && game) {
      timerRef.current = setInterval(() => {
        setGame(prev => prev ? { ...prev, seconds: prev.seconds + 1 } : null);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, game?.cards.length]);

  // Check for win
  useEffect(() => {
    if (game && screen === 'game') {
      const d = DIFFICULTIES[difficulty];
      if (game.found === d.pairs) {
        setTimeout(() => {
          if (timerRef.current) clearInterval(timerRef.current);
          const stars = calcStars(difficulty, game.moves);
          saveStar(theme, difficulty, stars, game.moves);
          const data = loadStars();
          const best = data[`${theme}:${difficulty}`];
          setWinData({ stars, moves: game.moves, time: game.seconds, best });
          setScreen('win');
        }, 600);
      }
    }
  }, [game?.found, difficulty, theme, screen]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const d = DIFFICULTIES[difficulty];
    const emojis = shuffle(THEMES[theme].emojis).slice(0, d.pairs);
    const deck = shuffle([...emojis, ...emojis]);

    setGame({
      cards: deck.map((emoji, id) => ({ id, emoji, matched: false })),
      first: null,
      second: null,
      lock: false,
      moves: 0,
      found: 0,
      seconds: 0,
    });
    setFlippedCards(new Set());
    setScreen('game');
  }, [difficulty, theme]);

  const handleCardClick = useCallback((idx: number) => {
    if (!game || game.lock) return;
    const card = game.cards[idx];
    if (card.matched || game.first === idx || game.second === idx) return;

    const newFlipped = new Set(flippedCards);
    newFlipped.add(idx);
    setFlippedCards(newFlipped);

    if (game.first === null) {
      setGame(prev => prev ? { ...prev, first: idx } : null);
      return;
    }

    // Second card
    const newMoves = game.moves + 1;
    setGame(prev => prev ? { ...prev, second: idx, moves: newMoves } : null);

    const firstCard = game.cards[game.first];
    const secondCard = game.cards[idx];

    if (firstCard.emoji === secondCard.emoji) {
      // Match!
      setGame(prev => {
        if (!prev) return null;
        const newCards = prev.cards.map(c =>
          c.id === game.first || c.id === idx ? { ...c, matched: true } : c
        );
        return {
          ...prev,
          cards: newCards,
          first: null,
          second: null,
          found: prev.found + 1,
        };
      });
    } else {
      // No match - flip back after delay
      setGame(prev => prev ? { ...prev, lock: true } : null);
      setTimeout(() => {
        setFlippedCards(prev => {
          const next = new Set(prev);
          next.delete(game.first!);
          next.delete(idx);
          return next;
        });
        setGame(prev => prev ? { ...prev, first: null, second: null, lock: false } : null);
      }, 1000);
    }
  }, [game, flippedCards]);

  const backToMenu = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGame(null);
    setFlippedCards(new Set());
    setScreen('menu');
  }, []);

  const openRecords = useCallback(() => {
    setRecords(loadStars());
    setScreen('records');
  }, []);

  // ========================= RENDER =========================
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-1 via-bg-2 to-bg-3 text-white overflow-x-hidden relative font-sans">
      <AnimatedBackground />

      {/* MENU SCREEN */}
      {screen === 'menu' && (
        <div className="relative z-1 min-h-screen flex flex-col items-center justify-start px-3 sm:px-4 py-4 sm:py-6 safe-area-top">
          <div className="w-full max-w-[640px] bg-[rgba(26,11,61,0.55)] border border-violet-light/35 rounded-2xl p-4 sm:p-7 shadow-[0_12px_40px_rgba(15,5,36,0.6),0_0_24px_rgba(159,122,234,0.15)] backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1.5">
              {/* Левая карточка — розовая рубашка с вопросом */}
              <div
                className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-pink-300/60 flex items-center justify-center text-xl sm:text-2xl text-white font-bold shadow-[0_6px_16px_rgba(236,72,153,0.4)] animate-sway-left origin-bottom"
              >
                ?
              </div>
              {/* Заголовок */}
              <h1 className="text-[clamp(1.75rem,6vw,3rem)] text-gold tracking-wide font-bold">
                Мемори
              </h1>
              {/* Правая карточка — мятная лицевая со звездой */}
              <div
                className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg bg-gradient-to-br from-emerald-300 to-teal-500 border-2 border-emerald-200/60 flex items-center justify-center text-xl sm:text-2xl text-white shadow-[0_6px_16px_rgba(52,211,153,0.4)] animate-sway-right origin-bottom"
              >
                ★
              </div>
            </div>
            <p className="text-center text-text-soft mb-4 sm:mb-6 text-sm sm:text-base">Найди пару — классическая игра на память</p>

            <h2 className="text-violet-light text-sm sm:text-[1.05rem] mt-4 sm:mt-5 mb-2 sm:mb-2.5 uppercase tracking-[1.5px] font-bold">Сложность</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-sm:grid-cols-1">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map(key => (
                <button
                  key={key}
                  className={`rounded-xl p-2.5 sm:p-3.5 text-center cursor-pointer transition-all duration-200 border-2 ${
                    difficulty === key
                      ? 'border-gold bg-gold/10 text-white shadow-[0_0_16px_rgba(255,215,0,0.25)]'
                      : 'border-violet-light/30 bg-bg-3/50 text-text-soft hover:border-violet hover:-translate-y-0.5'
                  }`}
                  onClick={() => setDifficulty(key)}
                >
                  <div className="flex items-end justify-center gap-1 h-10 mb-1">
                    {key === 'easy' && (
                      <div className="w-2 h-4 rounded-full bg-green-400"></div>
                    )}
                    {key === 'medium' && (
                      <>
                        <div className="w-2 h-4 rounded-full bg-yellow-400"></div>
                        <div className="w-2 h-7 rounded-full bg-yellow-400"></div>
                      </>
                    )}
                    {key === 'hard' && (
                      <>
                        <div className="w-2 h-4 rounded-full bg-red-500"></div>
                        <div className="w-2 h-6 rounded-full bg-red-500"></div>
                        <div className="w-2 h-9 rounded-full bg-red-500"></div>
                      </>
                    )}
                  </div>
                  <span>{DIFFICULTIES[key].name}</span>
                  <small className="block text-text-soft/65 mt-0.5">
                    {DIFFICULTIES[key].pairs * 2} карточек · {DIFFICULTIES[key].cols}×{DIFFICULTIES[key].rows}
                  </small>
                </button>
              ))}
            </div>

            <h2 className="text-violet-light text-sm sm:text-[1.05rem] mt-4 sm:mt-5 mb-2 sm:mb-2.5 uppercase tracking-[1.5px] font-bold">Тема карточек</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-sm:grid-cols-1">
              {(Object.keys(THEMES) as Theme[]).map(key => (
                <button
                  key={key}
                  className={`rounded-xl p-2.5 sm:p-3.5 text-center cursor-pointer transition-all duration-200 border-2 ${
                    theme === key
                      ? 'border-gold bg-gold/10 text-white shadow-[0_0_16px_rgba(255,215,0,0.25)]'
                      : 'border-violet-light/30 bg-bg-3/50 text-text-soft hover:border-violet hover:-translate-y-0.5'
                  }`}
                  onClick={() => setTheme(key)}
                >
                  <span className="block text-xl sm:text-[1.6rem] mb-1">
                    {key === 'fruits' ? '🍎' : key === 'animals' ? '🐶' : '🍕'}
                  </span>
                  <span className="text-sm sm:text-base">{THEMES[key].name}</span>
                </button>
              ))}
            </div>

            <div className="text-center mt-4 sm:mt-6">
              <button
                className="inline-block border-none cursor-pointer font-semibold rounded-xl py-3 sm:py-3.5 px-6 sm:px-10 text-base sm:text-[1.15rem] text-bg-1 bg-gradient-to-br from-gold to-[#ffbf00] shadow-[0_6px_18px_rgba(255,215,0,0.25)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-108 active:translate-y-0 w-full sm:w-auto"
                onClick={startGame}
              >
                ▶ Начать игру
              </button>
            </div>

            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center mt-4 sm:mt-5">
              <button
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-violet-light text-violet-light bg-transparent cursor-pointer font-semibold text-sm sm:text-base transition-all hover:bg-violet-light/12"
                onClick={() => setScreen('about')}
              >
                О проекте
              </button>
              <button
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-violet-light text-violet-light bg-transparent cursor-pointer font-semibold text-sm sm:text-base transition-all hover:bg-violet-light/12"
                onClick={openRecords}
              >
                Рекорды
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME SCREEN */}
      {screen === 'game' && game && (
        <div className="relative z-1 min-h-screen flex flex-col items-center justify-start px-2 sm:px-4 py-3 sm:py-6 safe-area-top">
          <div className="w-full max-w-[640px] bg-[rgba(26,11,61,0.55)] border border-violet-light/35 rounded-2xl p-3 sm:p-7 shadow-[0_12px_40px_rgba(15,5,36,0.6),0_0_24px_rgba(159,122,234,0.15)] backdrop-blur-sm">
            <div className="flex justify-between items-center gap-2 flex-wrap mb-3 sm:mb-4">
              <div className="flex gap-1.5 sm:gap-2.5 flex-wrap">
                <div className="bg-bg-3/60 border border-violet-light/35 rounded-lg sm:rounded-xl px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-text-soft whitespace-nowrap">
                  Ходы: <b className="text-gold tabular-nums">{game.moves}</b>
                </div>
                <div className="bg-bg-3/60 border border-violet-light/35 rounded-lg sm:rounded-xl px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-text-soft whitespace-nowrap">
                  Пары: <b className="text-gold tabular-nums">{game.found}/{DIFFICULTIES[difficulty].pairs}</b>
                </div>
                <div className="bg-bg-3/60 border border-violet-light/35 rounded-lg sm:rounded-xl px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-text-soft whitespace-nowrap">
                  ⏱ <b className="text-gold tabular-nums">{fmtTime(game.seconds)}</b>
                </div>
              </div>
              <button
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-violet-light text-violet-light bg-transparent cursor-pointer font-semibold text-xs sm:text-sm transition-all hover:bg-violet-light/12"
                onClick={backToMenu}
              >
                ← В меню
              </button>
            </div>

            <div
              className="grid gap-2 sm:gap-3 justify-center"
              style={{ gridTemplateColumns: `repeat(${DIFFICULTIES[difficulty].cols}, minmax(56px, 96px))` }}
            >
              {game.cards.map((card, idx) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  flipped={flippedCards.has(idx)}
                  onClick={() => handleCardClick(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WIN SCREEN */}
      {screen === 'win' && winData && (
        <div className="relative z-1 min-h-screen flex flex-col items-center justify-start px-3 sm:px-4 py-4 sm:py-6 safe-area-top">
          <div className="w-full max-w-[640px] bg-[rgba(26,11,61,0.55)] border border-violet-light/35 rounded-2xl p-4 sm:p-7 shadow-[0_12px_40px_rgba(15,5,36,0.6),0_0_24px_rgba(159,122,234,0.15)] backdrop-blur-sm">
            <h2 className="text-center text-gold text-xl sm:text-[1.8rem] mb-1 font-bold">🎉 Победа!</h2>
            <p className="text-center text-text-soft mb-3 sm:mb-3.5 text-sm sm:text-base">Все пары найдены</p>
            <div className="text-center my-2 sm:my-2.5">
              <StarDisplay count={winData.stars} animated={true} size="text-[clamp(2rem,8vw,4rem)]" />
            </div>
            <div className="flex gap-1.5 sm:gap-2.5 flex-wrap justify-center items-center mt-3 sm:mt-3.5">
              <div className="bg-bg-3/60 border border-violet-light/35 rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-text-soft">
                Время: <b className="text-gold">{fmtTime(winData.time)}</b>
              </div>
              <div className="bg-bg-3/60 border border-violet-light/35 rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-text-soft">
                Ходы: <b className="text-gold">{winData.moves}</b>
              </div>
              {winData.best && (
                <div className="bg-bg-3/60 border border-violet-light/35 rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-text-soft inline-flex items-center gap-1">
                  Рекорд: <b className="text-gold inline-flex items-center gap-1">{winData.best.moves} ходов (<StarDisplay count={winData.best.stars} size="text-sm sm:text-base" gap="gap-0.5" />)</b>
                </div>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center mt-4 sm:mt-5">
              <button
                className="inline-block border-none cursor-pointer font-semibold rounded-xl py-2.5 sm:py-3 px-4 sm:px-6 text-sm sm:text-base text-white bg-gradient-to-br from-gold to-[#ffbf00] shadow-[0_6px_18px_rgba(255,215,0,0.25)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-108 active:translate-y-0"
                onClick={startGame}
              >
                🔄 Играть снова
              </button>
              <button
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-violet-light text-violet-light bg-transparent cursor-pointer font-semibold text-sm sm:text-base transition-all hover:bg-violet-light/12"
                onClick={backToMenu}
              >
                В меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORDS SCREEN */}
      {screen === 'records' && (
        <div className="relative z-1 min-h-screen flex flex-col items-center justify-start px-3 sm:px-4 py-4 sm:py-6 safe-area-top">
          <div className="w-full max-w-[640px] bg-[rgba(26,11,61,0.55)] border border-violet-light/35 rounded-2xl p-4 sm:p-7 shadow-[0_12px_40px_rgba(15,5,36,0.6),0_0_24px_rgba(159,122,234,0.15)] backdrop-blur-sm">
            <h1 className="text-center text-gold text-xl sm:text-[1.8rem] mb-1 font-bold">🏆 Рекорды</h1>
            <p className="text-center text-text-soft mb-4 sm:mb-6 text-sm sm:text-base">Лучшие результаты по каждой теме и сложности</p>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse mt-1.5 text-sm sm:text-[0.95rem] min-w-[400px]">
              <thead>
                <tr>
                  <th className="py-2.5 px-2 text-left text-violet-light uppercase text-[0.78rem] tracking-wide border-b border-violet-light/25">Тема</th>
                  <th className="py-2.5 px-2 text-left text-violet-light uppercase text-[0.78rem] tracking-wide border-b border-violet-light/25">Сложность</th>
                  <th className="py-2.5 px-2 text-left text-violet-light uppercase text-[0.78rem] tracking-wide border-b border-violet-light/25">Звёзды</th>
                  <th className="py-2.5 px-2 text-left text-violet-light uppercase text-[0.78rem] tracking-wide border-b border-violet-light/25">Лучшие ходы</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(THEMES) as Theme[]).map(tKey =>
                  (Object.keys(DIFFICULTIES) as Difficulty[]).map(dKey => {
                    const rec = records[`${tKey}:${dKey}`];
                    return (
                      <tr key={`${tKey}-${dKey}`}>
                        <td className="py-2.5 px-2 border-b border-violet-light/25">{THEMES[tKey].name}</td>
                        <td className="py-2.5 px-2 border-b border-violet-light/25">{DIFFICULTIES[dKey].name}</td>
                        {rec ? (
                          <>
                            <td className="py-2.5 px-2 border-b border-violet-light/25"><StarDisplay count={rec.stars} size="text-base" gap="gap-0.5" /></td>
                            <td className="py-2.5 px-2 border-b border-violet-light/25">{rec.moves}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-2 border-b border-violet-light/25 text-text-soft/45">—</td>
                            <td className="py-2.5 px-2 border-b border-violet-light/25 text-text-soft/45">—</td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center mt-4 sm:mt-5">
              <button
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-violet-light text-violet-light bg-transparent cursor-pointer font-semibold text-sm sm:text-base transition-all hover:bg-violet-light/12"
                onClick={backToMenu}
              >
                ← Назад
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT SCREEN */}
      {screen === 'about' && (
        <div className="relative z-1 min-h-screen flex flex-col items-center justify-start px-3 sm:px-4 py-4 sm:py-6 safe-area-top">
          <div className="w-full max-w-[640px] bg-[rgba(26,11,61,0.55)] border border-violet-light/35 rounded-2xl p-4 sm:p-7 shadow-[0_12px_40px_rgba(15,5,36,0.6),0_0_24px_rgba(159,122,234,0.15)] backdrop-blur-sm">
            <h1 className="text-center text-gold text-xl sm:text-[1.8rem] mb-1 font-bold">ℹ️ О проекте</h1>

            <h2 className="text-violet-light text-sm sm:text-[1.05rem] mt-4 sm:mt-5 mb-2 sm:mb-2.5 uppercase tracking-[1.5px] font-bold">Что это за игра</h2>
            <p className="text-text-soft leading-[1.65] mb-2 sm:mb-2.5 text-sm sm:text-base">
              «Мемори» — классическая одиночная игра на память. На поле лежат карточки рубашкой
              вверх. Ваша задача — найти все одинаковые пары за минимальное количество ходов.
            </p>

            <h2 className="text-violet-light text-sm sm:text-[1.05rem] mt-4 sm:mt-5 mb-2 sm:mb-2.5 uppercase tracking-[1.5px] font-bold">Как играть</h2>
            <ul className="text-text-soft leading-[1.65] mb-2 sm:mb-2.5 pl-5 list-disc space-y-2 text-sm sm:text-base">
              <li>Кликните на первую карточку — она перевернётся и покажет эмодзи.</li>
              <li>Кликните на вторую карточку.</li>
              <li>Если эмодзи совпали — обе карточки остаются открытыми и подсвечиваются зелёным.</li>
              <li>Если не совпали — карточки перевернутся обратно через одну секунду.</li>
              <li>Игра заканчивается, когда найдены все пары.</li>
            </ul>
            <p className="text-text-soft leading-[1.65] mb-2 sm:mb-2.5 text-sm sm:text-base">
              Переворот карточек реализован через CSS 3D-трансформацию (<code className="text-violet-light">transform: rotateY(180deg)</code>) с быстрым переходом 0.25 секунды — карточки переворачиваются мгновенно и отзывчиво.
            </p>

            <h2 className="text-violet-light text-sm sm:text-[1.05rem] mt-4 sm:mt-5 mb-2 sm:mb-2.5 uppercase tracking-[1.5px] font-bold">Система звёзд</h2>
            <ul className="text-text-soft leading-[1.65] mb-2 sm:mb-2.5 pl-5 list-disc space-y-2 text-sm sm:text-base">
              <li><b className="text-white">Лёгкая:</b> ★★★ — за 5 или меньше ходов, ★★ — за 7 или меньше, ★ — за прохождение.</li>
              <li><b className="text-white">Средняя:</b> ★★★ — за 8 или меньше ходов, ★★ — за 11 или меньше, ★ — за прохождение.</li>
              <li><b className="text-white">Сложная:</b> ★★★ — за 11 или меньше ходов, ★★ — за 15 или меньше, ★ — за прохождение.</li>
            </ul>
            <p className="text-text-soft leading-[1.65] mb-2 sm:mb-2.5 text-sm sm:text-base">
              Звёзды сохраняются отдельно для каждой комбинации темы и сложности в LocalStorage, чтобы вы могли отслеживать прогресс и улучшать результат.
            </p>

            <h2 className="text-violet-light text-sm sm:text-[1.05rem] mt-4 sm:mt-5 mb-2 sm:mb-2.5 uppercase tracking-[1.5px] font-bold">Палитра цветов</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 sm:gap-2.5 my-2">
              {PALETTE.map((p, i) => (
                <div
                  key={i}
                  className="rounded-lg sm:rounded-xl p-2.5 sm:p-3.5 text-xs font-semibold border border-white/15 min-h-[56px] sm:min-h-[64px] flex flex-col gap-1 sm:gap-1.5 justify-end"
                  style={{ background: p.hex, color: p.color }}
                >
                  <span className="font-normal opacity-85 text-[0.7rem] sm:text-[0.75rem]">{p.name}</span>
                  <span>{p.hex}</span>
                </div>
              ))}
            </div>

            <h2 className="text-violet-light text-sm sm:text-[1.05rem] mt-4 sm:mt-5 mb-2 sm:mb-2.5 uppercase tracking-[1.5px] font-bold">Анимированный фон</h2>
            <p className="text-text-soft leading-[1.65] mb-2 sm:mb-2.5 text-sm sm:text-base">
              Фон живой, но ненавязчивый: <b className="text-white">10–15 полупрозрачных разноцветных шаров</b> (20–80&nbsp;px) медленно дрейфуют по экрану по CSS-анимациям длительностью 25–45 секунд с плавным ходом ease-in-out — только перемещение, никаких пульсаций и изменений масштаба. Дополнительно <b className="text-white">40–60 мелких мерцающих звёздочек</b> (1–3&nbsp;px) плавно меняют прозрачность от 0.2 до 0.9 с случайным циклом 2–6 секунд, некоторые — со слабым свечением.
            </p>

            <h2 className="text-violet-light text-sm sm:text-[1.05rem] mt-4 sm:mt-5 mb-2 sm:mb-2.5 uppercase tracking-[1.5px] font-bold">Технический стек</h2>
            <ul className="text-text-soft leading-[1.65] mb-2 sm:mb-2.5 pl-5 list-disc space-y-2 text-sm sm:text-base">
              <li><b className="text-white">HTML5</b> — разметка</li>
              <li><b className="text-white">CSS3</b> — стили, градиенты, @keyframes-анимации, 3D-перевороты</li>
              <li><b className="text-white">JavaScript (ES6)</b> — игровая логика, без фреймворков</li>
              <li><b className="text-white">LocalStorage</b> — хранение рекордов и звёзд</li>
              <li><b className="text-white">Vercel</b> — хостинг</li>
            </ul>

            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center mt-4 sm:mt-5">
              <button
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-violet-light text-violet-light bg-transparent cursor-pointer font-semibold text-sm sm:text-base transition-all hover:bg-violet-light/12"
                onClick={backToMenu}
              >
                ← Назад
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Button */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-violet to-violet-deep border-2 border-violet-light/50 flex items-center justify-center text-xl sm:text-2xl shadow-[0_6px_20px_rgba(159,122,234,0.5)] transition-all duration-200 hover:scale-110 hover:shadow-[0_8px_25px_rgba(159,122,234,0.7)] cursor-pointer safe-area-bottom"
        title="Обратная связь"
      >
        💬
      </button>

      {/* Feedback Modal */}
      {showFeedback && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowFeedback(false)}
        >
          <div
            className="relative w-full max-w-[800px] h-[90vh] sm:h-[80vh] bg-[rgba(26,11,61,0.95)] border border-violet-light/35 rounded-xl sm:rounded-2xl shadow-[0_12px_40px_rgba(15,5,36,0.8)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowFeedback(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-bg-3/80 border border-violet-light/50 flex items-center justify-center text-base sm:text-xl text-white hover:bg-violet-deep/50 transition-all cursor-pointer"
              title="Закрыть"
            >
              ✕
            </button>

            {/* Google Form iframe */}
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSduc3G-UjspHif9hdcEGWcDlZkAeY38iFa46MnLDYOE_xLYBw/viewform?embedded=true"
              className="w-full h-full border-0"
              title="Обратная связь"
            >
              Загрузка...
            </iframe>
          </div>
        </div>
      )}
    </div>
  );
}
