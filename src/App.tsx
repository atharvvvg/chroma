/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  Bolt, 
  Share2, 
  CheckCircle2, 
  ArrowRight, 
  BadgeCheck, 
  EyeOff,
  Info,
  History
} from 'lucide-react';

// --- Types ---

type GamePhase = 'START' | 'REVEAL' | 'PLAY' | 'RESULT' | 'HISTORY';

interface Color {
  h: number;
  s: number;
  l: number;
}

interface Attempt {
  color: Color;
  score: number;
  date: string;
}

// --- Utils ---

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  };
};

const calculateScore = (target: Color, guess: Color) => {
  const tRgb = hslToRgb(target.h, target.s, target.l);
  const gRgb = hslToRgb(guess.h, guess.s, guess.l);
  
  const distance = Math.sqrt(
    Math.pow(tRgb.r - gRgb.r, 2) +
    Math.pow(tRgb.g - gRgb.g, 2) +
    Math.pow(tRgb.b - gRgb.b, 2)
  );
  
  const maxDistance = Math.sqrt(Math.pow(255, 2) * 3);
  const score = Math.max(0, 100 - (distance / maxDistance) * 100);
  return parseFloat(score.toFixed(1));
};

const getDeltaE = (score: number) => {
  return ((100 - score) * 0.15).toFixed(3);
};

const getRank = (score: number) => {
  if (score >= 98) return 'Achromat+';
  if (score >= 95) return 'Achromat';
  if (score >= 90) return 'Chromist';
  if (score >= 80) return 'Observer';
  return 'Novice';
};

const getDailyColor = (): Color => {
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  
  // Simple deterministic random
  const pseudoRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  return {
    h: Math.floor(pseudoRandom(seed) * 360),
    s: 40 + Math.floor(pseudoRandom(seed + 1) * 40), // 40-80%
    l: 30 + Math.floor(pseudoRandom(seed + 2) * 40), // 30-70%
  };
};

const getRandomColor = (): Color => {
  return {
    h: Math.floor(Math.random() * 360),
    s: 40 + Math.floor(Math.random() * 40), // 40-80%
    l: 30 + Math.floor(Math.random() * 40), // 30-70%
  };
};

// --- Components ---

const Header = ({ streak, onHistory, colorBlindMode, onToggleColorBlind, onShowHelp }: { streak: number; onHistory: () => void; colorBlindMode: boolean; onToggleColorBlind: () => void; onShowHelp: () => void }) => (
  <nav className="bg-background/60 backdrop-blur-xl sticky top-0 z-50 shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
    <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
      <div className="text-2xl font-black tracking-[-2%] text-primary font-headline cursor-pointer" onClick={() => window.location.reload()}>
        Chroma
      </div>
      <div className="flex items-center gap-8">
        <button 
          onClick={onToggleColorBlind}
          className={`font-label text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${colorBlindMode ? 'bg-primary text-on-primary-fixed border-primary' : 'text-on-surface-variant border-outline-variant/30 hover:border-primary'}`}
        >
          {colorBlindMode ? 'Deuteranopia Active' : 'Standard Vision'}
        </button>
        <div className="flex items-center gap-2 cursor-pointer group" onClick={onHistory}>
          <History className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-primary font-label tracking-[5%] text-sm font-bold">Streak: {streak}</span>
        </div>
        <button 
          onClick={() => onShowHelp()}
          className="text-on-surface-variant hover:text-primary transition-all duration-300 active:scale-95"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  </nav>
);

const Footer = () => (
  <footer className="bg-background w-full py-12 border-t border-outline-variant/15 mt-auto">
    <div className="flex flex-col md:flex-row justify-between items-center px-8 gap-4 max-w-7xl mx-auto">
      <div className="font-label text-[10px] uppercase tracking-widest text-outline-variant">
        ©  ⁶🤷‍♂️⁷
      </div>
      <div className="flex gap-8">
        {['Privacy', 'Terms', 'Twitter', 'Instagram'].map((link) => (
          <a key={link} href="https://www.youtube.com/watch?v=Ca6bBmrrk3o" target="_blank" rel="noopener noreferrer" className="font-label text-[10px] uppercase tracking-widest text-outline-variant hover:text-primary transition-colors">
            {link}
          </a>
        ))}
      </div>
    </div>
  </footer>
);

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [targetColor, setTargetColor] = useState<Color>(getDailyColor());
  const [userColor, setUserColor] = useState<Color>({ h: 180, s: 50, l: 50 });
  const [countdown, setCountdown] = useState(5);
  const [streak, setStreak] = useState<number>(() => {
    return parseInt(localStorage.getItem('chroma_streak') ?? '0', 10);
  });
  const [history, setHistory] = useState<Attempt[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('chroma_history') ?? '[]');
    } catch {
      return [];
    }
  });
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [bestScore, setBestScore] = useState(0);
  const [currentAttempts, setCurrentAttempts] = useState<Attempt[]>([]);
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  useEffect(() => {
    if (phase === 'REVEAL' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'REVEAL' && countdown === 0) {
      setPhase('PLAY');
    }
  }, [phase, countdown]);

  const handleStart = () => {
    setIsPracticeMode(false);
    setTargetColor(getDailyColor());
    setCountdown(5);
    setPhase('REVEAL');
    setAttemptsLeft(3);
    setBestScore(0);
    setCurrentAttempts([]);
  };

  const handlePracticeStart = () => {
    setIsPracticeMode(true);
    setTargetColor(getRandomColor());
    setCountdown(5);
    setPhase('REVEAL');
    setAttemptsLeft(3);
    setBestScore(0);
    setCurrentAttempts([]);
  };

  const handleSubmit = () => {
    const score = calculateScore(targetColor, userColor);
    const attempt: Attempt = {
      color: userColor,
      score,
      date: new Date().toISOString().split('T')[0]
    };
    
    const newAttempts = [attempt, ...currentAttempts];
    setCurrentAttempts(newAttempts);
    
    if (score > bestScore) {
      setBestScore(score);
    }

    if (attemptsLeft > 1 && score < 99.9) {
      setAttemptsLeft(attemptsLeft - 1);
      // Stay in PLAY phase but maybe show a toast or feedback
    } else {
      setAttemptsLeft(0);
      
      if (!isPracticeMode) {
        const newHistory = [attempt, ...history];
        setHistory(newHistory);
        localStorage.setItem('chroma_history', JSON.stringify(newHistory));

        const today = new Date().toISOString().split('T')[0];
        const lastPlayed = localStorage.getItem('chroma_last_played');

        if (lastPlayed !== today) {
          let newStreak = streak;
          if (score > 90) {
            newStreak = streak + 1;
          } else {
            newStreak = 0;
          }
          setStreak(newStreak);
          localStorage.setItem('chroma_streak', newStreak.toString());
          localStorage.setItem('chroma_last_played', today);
        }
      }

      setPhase('RESULT');
    }
  };

  const handleShare = () => {
    const text = `Chroma: The Optical Laboratory\nScore: ${bestScore}%\nAttempts: ${3 - attemptsLeft}\n${window.location.href}`;
    navigator.clipboard.writeText(text);
    alert('Result copied to clipboard!');
  };

  const handleExportSvg = () => {
    if (history.length === 0) return;
    const latestScore = history[0].score;
    const deltaE = getDeltaE(latestScore);
    const rank = getRank(latestScore);
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0a" />
          <stop offset="100%" stop-color="#141414" />
        </linearGradient>
        <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(0, 237, 180, 0.15)" />
          <stop offset="100%" stop-color="rgba(0, 237, 180, 0)" />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill="url(#bg)" rx="24" />
      <circle cx="800" cy="0" r="300" fill="url(#glow)" filter="blur(50px)" />
      
      <g transform="translate(60, 60)">
        <text x="0" y="20" fill="#00EDB4" font-family="monospace" font-size="12" letter-spacing="4" text-transform="uppercase">PERFORMANCE VERIFIED</text>
        <text x="0" y="70" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="48">THE OPTICAL</text>
        <text x="0" y="120" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="48">SUPERIORITY</text>
        
        <g transform="translate(0, 180)">
          <text x="0" y="0" fill="#a3a3a3" font-family="monospace" font-size="12" letter-spacing="1" text-transform="uppercase">DELTA-E</text>
          <text x="0" y="30" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="24">${deltaE}</text>
          
          <text x="150" y="0" fill="#a3a3a3" font-family="monospace" font-size="12" letter-spacing="1" text-transform="uppercase">RANK</text>
          <text x="150" y="30" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="24">${rank}</text>
          
          <text x="300" y="0" fill="#a3a3a3" font-family="monospace" font-size="12" letter-spacing="1" text-transform="uppercase">DATE</text>
          <text x="300" y="30" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="24">${date}</text>
        </g>
        
        <text x="0" y="280" fill="#525252" font-family="sans-serif" font-weight="bold" font-size="24" letter-spacing="-1">Chroma</text>
      </g>
      
      <g transform="translate(550, 100)">
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0, 237, 180, 0.2)" stroke-width="4" />
        <circle cx="100" cy="100" r="60" fill="rgba(0, 237, 180, 0.1)" />
        <path d="M70 100 L90 120 L130 80" stroke="#00EDB4" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>
    </svg>`;

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chroma-certificate-${date.replace(/ /g, '-')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const targetHex = useMemo(() => hslToHex(targetColor.h, targetColor.s, targetColor.l), [targetColor]);
  const userHex = useMemo(() => hslToHex(userColor.h, userColor.s, userColor.l), [userColor]);
  const userRgb = useMemo(() => hslToRgb(userColor.h, userColor.s, userColor.l), [userColor]);
  const score = useMemo(() => calculateScore(targetColor, userColor), [targetColor, userColor]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        streak={streak} 
        onHistory={() => setPhase('HISTORY')} 
        colorBlindMode={colorBlindMode} 
        onToggleColorBlind={() => setColorBlindMode(!colorBlindMode)} 
        onShowHelp={() => setShowHelp(true)}
      />
      
      <main 
        className={`flex-grow flex flex-col items-center justify-center relative overflow-hidden px-4 py-12 transition-all duration-500 ${colorBlindMode ? 'grayscale-[0.5] sepia-[0.2]' : ''}`}
      >
        <AnimatePresence>
          {showShareCard && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-2xl w-full relative"
              >
                <div className="glass-panel p-10 rounded-xl relative border border-white/5 overflow-hidden mb-6">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10"></div>
                  <div className="flex flex-col md:flex-row justify-between gap-12">
                    <div className="space-y-6">
                      <div>
                        <div className="font-label text-[10px] text-primary uppercase tracking-[0.2em] mb-2">Performance Verified</div>
                        <div className="font-headline font-black text-4xl leading-tight">THE OPTICAL<br/>SUPERIORITY</div>
                      </div>
                      <div className="flex gap-10">
                        <div>
                          <div className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Delta-E</div>
                          <div className="font-label font-bold text-xl">{history.length > 0 ? getDeltaE(history[0].score) : '0.000'}</div>
                        </div>
                        <div>
                          <div className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Rank</div>
                          <div className="font-label font-bold text-xl">{history.length > 0 ? getRank(history[0].score) : 'Novice'}</div>
                        </div>
                        <div>
                          <div className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Date</div>
                          <div className="font-label font-bold text-xl">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <div className="pt-4">
                        <div className="font-headline font-bold text-xl tracking-tight text-on-surface-variant">Chroma</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center justify-center">
                      <div className="relative w-40 h-40">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
                        <div className="absolute inset-4 rounded-full bg-primary-dim shadow-[0_0_40px_rgba(0,237,180,0.4)] flex items-center justify-center">
                          <BadgeCheck className="w-12 h-12 text-on-primary-fixed" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center px-2">
                  <button 
                    onClick={() => {
                      const text = `Chroma: The Optical Laboratory\nScore: ${history.length > 0 ? history[0].score : 0}%\nRank: ${history.length > 0 ? getRank(history[0].score) : 'Novice'}\n${window.location.href}`;
                      navigator.clipboard.writeText(text);
                      alert('Result copied to clipboard!');
                    }}
                    className="bg-white text-black font-label text-[10px] font-bold uppercase py-3 px-8 rounded-full hover:bg-primary transition-colors"
                  >
                    Copy Link
                  </button>
                  <button 
                    onClick={() => setShowShareCard(false)}
                    className="text-on-surface-variant hover:text-white font-label text-[10px] font-bold uppercase py-3 px-8 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showHelp && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-panel max-w-2xl w-full p-10 rounded-sm border border-white/10 relative"
              >
                <button 
                  onClick={() => setShowHelp(false)}
                  className="absolute top-6 right-6 text-on-surface-variant hover:text-primary"
                >
                  <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                <div className="space-y-8">
                  <header>
                    <h2 className="font-headline font-black text-4xl tracking-tight uppercase">Protocol Manual</h2>
                    <p className="font-label text-xs text-primary uppercase tracking-widest mt-2">Subject: Optical Calibration Procedures</p>
                  </header>
                  <div className="space-y-6 text-on-surface-variant font-body leading-relaxed">
                    <p>
                      <strong className="text-primary">01. Memorization:</strong> A target color is revealed for 5 seconds. Use this time to calibrate your ocular sensors.
                    </p>
                    <p>
                      <strong className="text-primary">02. Reconstruction:</strong> Use the Hue, Saturation, and Luminance controls to recreate the target color from memory.
                    </p>
                    <p>
                      <strong className="text-primary">03. Iteration:</strong> You have 3 attempts per day to achieve maximum chromatic alignment. Your best score is recorded.
                    </p>
                    <p>
                      <strong className="text-primary">04. Scoring:</strong> Accuracy is calculated based on sRGB distance. Scores above 90% contribute to your laboratory streak.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="w-full bg-primary text-on-primary-fixed py-4 rounded-sm font-label font-bold uppercase tracking-widest hover:bg-primary-dim transition-all"
                  >
                    Acknowledge Protocol
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {phase === 'START' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center space-y-8 max-w-xl"
            >
              <div className="space-y-4">
                <p className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant/60">Daily Calibration Protocol</p>
                <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter">Ready for today's scan?</h1>
                <p className="text-on-surface-variant font-body leading-relaxed">
                  You will be shown a target color for 5 seconds. Your objective is to recreate it from memory with absolute precision.
                </p>
              </div>
              <button 
                onClick={handleStart}
                className="bg-primary text-on-primary-fixed px-12 py-5 rounded-sm font-label font-bold uppercase tracking-widest hover:bg-primary-dim transition-all active:scale-95 shadow-[0_0_40px_rgba(170,255,220,0.2)]"
              >
                Initiate Sequence
              </button>
            </motion.div>
          )}

          {phase === 'REVEAL' && (
            <motion.div 
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center max-w-4xl w-full"
            >
              <div className="text-center mb-16 space-y-4">
                <p className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant/60">Optical Calibration Phase 01</p>
                <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter">Target Color: {targetHex}</h1>
              </div>

              <div className="relative">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20 }}
                  className="w-72 h-72 md:w-96 md:h-96 rounded-lg target-glow relative overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: targetHex }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-30"></div>
                  <div className="glass-panel px-6 py-3 rounded-full border border-white/5">
                    <span className="font-label text-white text-sm font-medium tracking-widest">
                      SRGB: {Object.values(hslToRgb(targetColor.h, targetColor.s, targetColor.l)).join(', ')}
                    </span>
                  </div>
                </motion.div>
                <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-primary/30 rounded-tl-lg"></div>
                <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-primary/30 rounded-br-lg"></div>
              </div>

              <div className="mt-20 flex flex-col items-center space-y-8">
                <div className="flex items-end gap-3">
                  <span className="font-headline text-8xl font-black text-primary leading-none">{countdown}</span>
                  <span className="font-label text-on-surface-variant text-lg pb-3 uppercase">Seconds Remaining</span>
                </div>
                <p className="text-on-surface-variant font-body text-center max-w-md">
                  Memorize the hue, saturation, and lightness value. The chromatic target will vanish shortly.
                </p>
              </div>
            </motion.div>
          )}

          {phase === 'PLAY' && (
            <motion.div 
              key="play"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-stretch"
            >
              <div className="lg:col-span-7 flex flex-col gap-8">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2 block">Current Calibration</span>
                    <h1 className="font-headline text-4xl font-bold tracking-tighter">The Workbench</h1>
                  </div>
                  <div className="text-right">
                    <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant block">Phase</span>
                    <span className="font-label text-primary text-sm font-bold uppercase">Chromatic Alignment</span>
                  </div>
                </div>

                <div className="relative aspect-square w-full rounded-sm overflow-hidden shadow-2xl bg-surface-container-high">
                  <div className="absolute inset-0 transition-colors duration-300" style={{ backgroundColor: userHex }}></div>
                  <div className="absolute top-6 left-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      <span className="font-label text-[10px] text-white/80">LIVE OUTPUT</span>
                    </div>
                  </div>
                  <div className="absolute bottom-6 right-6 font-label text-[10px] text-white/40 tracking-widest uppercase">
                    60fps Optical Scan
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-4 rounded-sm border border-white/5">
                    <span className="font-label text-[10px] text-on-surface-variant block mb-1 uppercase">Attempts</span>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div 
                            key={i} 
                            className={`w-2 h-2 rounded-full ${i <= (3 - attemptsLeft) ? 'bg-primary' : 'bg-surface-container-highest'}`}
                          />
                        ))}
                      </div>
                      <span className="font-label text-xs text-outline-variant uppercase">{attemptsLeft} Left</span>
                    </div>
                  </div>
                  <div className="glass-panel p-4 rounded-sm border border-white/5">
                    <span className="font-label text-[10px] text-on-surface-variant block mb-1 uppercase">Last Score</span>
                    <div className="flex items-center gap-3">
                      <span className="font-headline text-2xl font-bold text-primary">
                        {currentAttempts.length > 0 ? currentAttempts[0].score : '--'}
                      </span>
                      <span className="font-label text-[10px] text-outline-variant uppercase">% Match</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-10">
                <div className="glass-panel p-8 rounded-sm h-full flex flex-col justify-between border border-white/5">
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Hue Spectrum</label>
                        <span className="font-label text-sm text-primary font-bold">{userColor.h}°</span>
                      </div>
                      <div className="relative pt-2">
                        <div className="hue-slider-track absolute top-2 left-0 right-0 h-2 rounded-full opacity-80"></div>
                        <input 
                          type="range" min="0" max="360" value={userColor.h}
                          onChange={(e) => setUserColor({ ...userColor, h: parseInt(e.target.value) })}
                          className="relative w-full z-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Saturation Intensity</label>
                        <span className="font-label text-sm text-primary font-bold">{userColor.s}%</span>
                      </div>
                      <div className="relative pt-2">
                        <div className="sat-slider-track absolute top-2 left-0 right-0 h-2 rounded-full opacity-80" style={{ background: `linear-gradient(to right, #777, ${hslToHex(userColor.h, 100, 50)})` }}></div>
                        <input 
                          type="range" min="0" max="100" value={userColor.s}
                          onChange={(e) => setUserColor({ ...userColor, s: parseInt(e.target.value) })}
                          className="relative w-full z-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Luminance Value</label>
                        <span className="font-label text-sm text-primary font-bold">{userColor.l}%</span>
                      </div>
                      <div className="relative pt-2">
                        <div className="val-slider-track absolute top-2 left-0 right-0 h-2 rounded-full opacity-80"></div>
                        <input 
                          type="range" min="0" max="100" value={userColor.l}
                          onChange={(e) => setUserColor({ ...userColor, l: parseInt(e.target.value) })}
                          className="relative w-full z-10"
                        />
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest p-6 rounded-sm border border-outline-variant/10">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-label text-[10px] text-outline-variant uppercase">Instrument Data</span>
                        <Info className="w-3 h-3 text-outline-variant" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block font-label text-[9px] text-outline-variant mb-1 uppercase">Hex</span>
                          <span className="block font-label text-sm">{userHex}</span>
                        </div>
                        <div>
                          <span className="block font-label text-[9px] text-outline-variant mb-1 uppercase">Rgb</span>
                          <span className="block font-label text-sm">{userRgb.r}, {userRgb.g}, {userRgb.b}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-12">
                    <button 
                      onClick={handleSubmit}
                      className="w-full bg-gradient-to-br from-primary to-primary-dim text-on-primary-fixed py-6 px-8 rounded-sm font-label font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(0,253,193,0.2)] hover:shadow-[0_0_60px_rgba(0,253,193,0.4)] transition-all active:scale-[0.98]"
                    >
                      <span>{attemptsLeft > 1 ? 'Submit Attempt' : 'Finalize Submission'}</span>
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'RESULT' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl w-full flex flex-col items-center gap-16"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-surface-variant shadow-2xl relative overflow-hidden" style={{ backgroundColor: targetHex }}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Target Color</span>
                    <span className="font-label text-lg font-bold">{targetHex}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-6">
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-surface-variant shadow-2xl relative overflow-hidden" style={{ backgroundColor: userHex }}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Your Match</span>
                    <span className="font-label text-lg font-bold">{userHex}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center text-center -mt-8">
                {isPracticeMode && (
                  <div className="font-label text-xs uppercase tracking-widest text-primary mb-4 bg-primary/10 px-4 py-1 rounded-full border border-primary/20">
                    Practice Mode
                  </div>
                )}
                <div className="relative flex items-center justify-center mb-4">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle className="text-surface-container-highest" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="6"></circle>
                    <motion.circle 
                      initial={{ strokeDashoffset: 552.92 }}
                      animate={{ strokeDashoffset: 552.92 - (552.92 * score / 100) }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className="text-primary-dim" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeDasharray="552.92" strokeLinecap="round" strokeWidth="8"
                    ></motion.circle>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-6xl md:text-7xl font-black font-headline tracking-tighter">{bestScore}<span className="text-3xl">%</span></span>
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-headline font-bold mb-2 text-primary">
                  {bestScore > 95 ? 'Color Savant' : bestScore > 85 ? 'Achromat+' : bestScore > 70 ? 'Optical Apprentice' : 'Chromatic Novice'}
                </h1>
                <p className="text-on-surface-variant font-label tracking-wide max-w-sm">
                  {bestScore > 95 ? 'Near-perfect chromatic alignment. Your ocular precision is elite.' : 'Solid perception. Your calibration is within acceptable laboratory standards.'}
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 w-full max-w-md">
                {isPracticeMode ? (
                  <>
                    <button 
                      onClick={handlePracticeStart}
                      className="flex-1 bg-gradient-to-br from-primary to-primary-dim text-on-primary-fixed font-label font-bold py-4 rounded-sm hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 group"
                    >
                      <span>Play Again</span>
                      <Bolt className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    </button>
                    <button 
                      onClick={() => {
                        setIsPracticeMode(false);
                        setPhase('HISTORY');
                      }}
                      className="flex-1 glass-panel border border-outline-variant/15 text-on-surface font-label font-bold py-4 rounded-sm hover:bg-surface-variant/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      <span>Back to Journal</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setPhase('HISTORY')}
                      className="flex-1 bg-gradient-to-br from-primary to-primary-dim text-on-primary-fixed font-label font-bold py-4 rounded-sm hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 group"
                    >
                      <span>View Journal</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={handleShare}
                      className="flex-1 glass-panel border border-outline-variant/15 text-on-surface font-label font-bold py-4 rounded-sm hover:bg-surface-variant/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Result</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'HISTORY' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-7xl mx-auto w-full"
            >
              <header className="mb-16">
                <h1 className="font-headline font-black text-5xl md:text-7xl tracking-[-4%] mb-4 uppercase">Laboratory Journal</h1>
                <p className="font-label text-on-surface-variant tracking-widest text-xs uppercase opacity-70">Subject: Chroma-0824 | Performance Analytics</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                <div className="md:col-span-4 space-y-8">
                  <section className="bg-surface-container-low p-8 rounded shadow-lg border-l-2 border-primary">
                    <h2 className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-10">Diagnostic Metrics</h2>
                    <div className="space-y-12">
                      <div>
                        <div className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Current Streak</div>
                        <div className="font-headline font-black text-5xl text-primary leading-none">{streak}<span className="text-xl font-label tracking-tighter ml-1 uppercase">Days</span></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Best Accuracy</div>
                          <div className="font-label font-bold text-2xl">98.4%</div>
                        </div>
                        <div>
                          <div className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Tests Completed</div>
                          <div className="font-label font-bold text-2xl">142</div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="space-y-4">
                    <button 
                      onClick={handlePracticeStart}
                      className="w-full bg-gradient-to-br from-primary to-primary-dim py-4 rounded-sm flex items-center justify-center gap-2 group transition-all active:scale-[0.98]"
                    >
                      <Bolt className="w-4 h-4 text-on-primary-fixed" />
                      <span className="font-label font-bold text-on-primary-fixed uppercase tracking-wider text-sm">Initiate Practice Mode</span>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-12">
                  <section>
                    <div className="flex justify-between items-end mb-8">
                      <h2 className="font-headline font-bold text-2xl tracking-tight">Daily Calibration Log</h2>
                      <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-[0.1em]">Last 30 Cycles</span>
                    </div>
                    <div className="bg-surface-container-low p-6 rounded">
                      <div className="grid grid-cols-7 md:grid-cols-10 gap-3">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div 
                            key={i}
                            className="aspect-square rounded-sm border border-white/5"
                            style={{ backgroundColor: i < history.length ? hslToHex(history[i].color.h, history[i].color.s, history[i].color.l) : '#262626' }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="font-headline font-bold text-2xl tracking-tight mb-8">Latest Certificate</h2>
                    <div className="glass-panel p-10 rounded-xl relative border border-white/5 overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10"></div>
                      <div className="flex flex-col md:flex-row justify-between gap-12">
                        <div className="space-y-6">
                          <div>
                            <div className="font-label text-[10px] text-primary uppercase tracking-[0.2em] mb-2">Performance Verified</div>
                            <div className="font-headline font-black text-4xl leading-tight">THE OPTICAL<br/>SUPERIORITY</div>
                          </div>
                          <div className="flex gap-10">
                            <div>
                              <div className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Delta-E</div>
                              <div className="font-label font-bold text-xl">{history.length > 0 ? getDeltaE(history[0].score) : '0.000'}</div>
                            </div>
                            <div>
                              <div className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Rank</div>
                              <div className="font-label font-bold text-xl">{history.length > 0 ? getRank(history[0].score) : 'Novice'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 pt-4">
                            <button 
                              onClick={handleExportSvg}
                              className="bg-white text-black font-label text-[10px] font-bold uppercase py-2 px-6 rounded-full hover:bg-primary transition-colors"
                            >
                              Export SVG
                            </button>
                            <button 
                              onClick={() => setShowShareCard(true)}
                              className="text-on-surface-variant hover:text-on-surface flex items-center gap-2"
                            >
                              <Share2 className="w-3 h-3" />
                              <span className="font-label text-[10px] font-bold uppercase">Share results</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center justify-center">
                          <div className="relative w-40 h-40">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
                            <div className="absolute inset-4 rounded-full bg-primary-dim shadow-[0_0_40px_rgba(0,237,180,0.4)] flex items-center justify-center">
                              <BadgeCheck className="w-12 h-12 text-on-primary-fixed" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
