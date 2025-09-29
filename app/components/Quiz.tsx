'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, RotateCcw, Sparkles, Copy, Loader2 } from 'lucide-react';
import MermaidDiagram from './Mermaid';

type QuizOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type QuizQuestion = {
  id: string;
  prompt: string;        // sentence with blank
  answer: string;        // correct word (nicely cased)
  source: string;        // original cleaned sentence (complete)
  options: QuizOption[];
};

type RNG = () => number;

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// Keep API usage aligned with page.tsx concept
const API_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')) ||
  '/api/process-content';

// ----------------------
// Seeded RNG utilities (for variety on Regenerate)
// ----------------------
const hashSeed = (s: string) => {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};

const mulberry32 = (a: number): RNG => {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createRng = (seed: string): RNG => mulberry32(hashSeed(seed));

const shuffleRng = <T,>(arr: T[], rng: RNG): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ----------------------
// Text cleanup utilities for question generation
// ----------------------
const stripMarkdown = (input: string) => {
  let text = input ?? '';
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`[^`]*`/g, ' ');
  text = text.replace(/!\[[^\]]*]\([^)]*\)/g, ' ');
  text = text.replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1');
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/[|]/g, ' ');
  text = text.replace(/^\s*(-{3,}|_{3,}|\*{3,})\s*$/gm, ' ');
  text = text.replace(/^\s*(graph\s+(TD|LR)|mermaid|flowchart)[^\n]*$/gim, ' ');
  text = text.replace(/\[[^\]\n]{10,}\]/g, ' ');
  text = text.replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ');
  text = text.replace(/[ ]{2,}/g, ' ');
  text = text.replace(/\s*\n\s*/g, ' ');
  return text.replace(/\s{2,}/g, ' ').trim();
};

const splitSentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

// Remove noisy prefixes like "Step 3:", "Diagram:", "Note:", etc.
const stripNoisyPrefixes = (s: string) =>
  s
    .replace(/^\s*step\s*\d+\s*[:.\-]\s*/i, '')
    .replace(/^\s*(diagram|note|example|tip|hint)\s*[:.\-]\s*/i, '');

const looksLikeCodeOrNoise = (s: string) => {
  if (!s) return true;
  if (s.length < 25 || s.length > 200) return true;
  if (/[{}<>~;`]/.test(s)) return true;
  if (/https?:\/\//i.test(s)) return true;
  if (/\b(graph\s+(TD|LR)|flowchart|mermaid)\b/i.test(s)) return true;
  if (/[\[\]|]{3,}/.test(s)) return true;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  return letters / s.length < 0.6;
};

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s\-']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const STOPWORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at',
  'this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there',
  'their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time',
  'no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than',
  'then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work',
  'first','well','way','even','new','want','because','any','these','give','day','most','us'
]);

const isCandidateWord = (w: string) =>
  w.length >= 5 && !STOPWORDS.has(w) && !/^\d+$/.test(w);

// Use RNG to vary which keyword we blank
const pickKeyword = (sentence: string, rng: RNG): string | null => {
  const words = tokenize(sentence);
  const unique = Array.from(new Set(words));
  const candidates = unique
    .filter(isCandidateWord)
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
  if (candidates.length === 0) return null;
  const topN = Math.min(6, candidates.length);
  const idx = Math.floor(rng() * topN);
  return candidates[idx] || null;
};

const makeVariant = (w: string, rng: RNG) => {
  if (w.length < 5) return w;
  const vowels = ['a','e','i','o','u'];
  const chars = w.split('');
  const idx = Math.max(1, Math.min(w.length - 2, Math.floor(rng() * (w.length - 2)) + 1));
  if (/[a-z]/i.test(chars[idx])) {
    const lower = chars[idx].toLowerCase();
    if (vowels.includes(lower)) {
      const vIdx = vowels.indexOf(lower);
      const next = vowels[(vIdx + 1 + Math.floor(rng() * 3)) % vowels.length];
      chars[idx] = /[A-Z]/.test(chars[idx]) ? next.toUpperCase() : next;
    } else {
      const base = lower.charCodeAt(0) - 97;
      const step = 1 + Math.floor(rng() * 2);
      const next = String.fromCharCode(((base + step) % 26) + 97);
      chars[idx] = /[A-Z]/.test(chars[idx]) ? next.toUpperCase() : next;
    }
  }
  return chars.join('');
};

const buildDistractors = (answer: string, pool: string[], count: number, rng: RNG) => {
  const set = new Set<string>();
  const base = answer.toLowerCase();

  for (const w of shuffleRng(pool, rng)) {
    const lw = w.toLowerCase();
    if (lw !== base && Math.abs(lw.length - base.length) <= 3 && !set.has(lw)) {
      set.add(lw);
      if (set.size >= count) break;
    }
  }

  while (set.size < count) set.add(makeVariant(base, rng));

  return Array.from(set);
};

// Ensure nice blank and punctuation; trim/normalize spacing
const toBlankedPrompt = (sentence: string, answer: string) => {
  const cleaned = stripNoisyPrefixes(sentence);
  const re = new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  let p = cleaned.replace(re, '____').trim();
  p = p.replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ');
  if (!/[.!?]$/.test(p)) p += '.';
  const MAX = 160;
  if (p.length > MAX) p = p.slice(0, MAX - 1).trimEnd() + '…';
  return p;
};

// Capitalize first character only; preserves contractions like "You're"
const niceLabel = (s: string) => s.trim().toLowerCase().replace(/^[a-z]/, c => c.toUpperCase());

const buildQuestions = (raw: string, maxQ: number, rng: RNG): QuizQuestion[] => {
  const cleaned = stripMarkdown(raw);
  const filtered = splitSentences(cleaned)
    .map(stripNoisyPrefixes)
    .filter(s => !looksLikeCodeOrNoise(s));
  if (!filtered.length) return [];

  const sentences = shuffleRng(filtered, rng);

  // Pool of candidate words across sentences
  const pool = sentences
    .flatMap(s => tokenize(s))
    .filter(isCandidateWord);

  const qs: QuizQuestion[] = [];

  for (const s of sentences) {
    if (qs.length >= maxQ) break;

    const keyword = pickKeyword(s, rng);
    if (!keyword) continue;

    const prompt = toBlankedPrompt(s, keyword);
    if (!prompt || prompt === s) continue;

    const distractors = buildDistractors(keyword, pool, 3, rng);
    const optionsRaw = shuffleRng([keyword, ...distractors], rng);

    const options: QuizOption[] = optionsRaw.map(text => ({
      id: uuid(),
      text: niceLabel(text),
      isCorrect: text.toLowerCase() === keyword.toLowerCase(),
    }));

    qs.push({
      id: uuid(),
      prompt,
      answer: niceLabel(keyword),
      source: s,
      options,
    });
  }

  return qs.slice(0, maxQ);
};

// ----------------------
// Logic-first rule hints to shape reasons and diagrams
// ----------------------
type LogicHint = {
  id: string;
  applies: (s: string) => boolean;
  correct: (q: QuizQuestion) => string;
  wrong: (q: QuizQuestion, sel: string) => string;
  diagram: (q: QuizQuestion, sel?: string) => string; // mermaid (no backticks)
};

const HINTS: LogicHint[] = [
  {
    id: 'unsupervised_patterns',
    applies: (s) => /unsupervised/i.test(s) && /(find|discover|identify)\b/i.test(s) && /(unlabelled|unlabeled|without labels)/i.test(s),
    correct: () => 'Unsupervised learning discovers structure (patterns/clusters) in unlabeled data.',
    wrong: (_q, sel) => `"${sel}" is not a latent structure; it does not represent the discovered pattern in unlabeled data.`,
    diagram: (_q, sel) =>
      [
        'flowchart TD',
        'U[Unlabeled data] -->|discover| P[Patterns/Clusters]',
        sel ? `S["Selected: ${sel.replace(/"/g, '\\"')}"] --> NO((Not a structure))` : '',
        'P --> OK((Correct objective))',
      ].filter(Boolean).join('\n'),
  },
  {
    id: 'features_predictions',
    applies: (s) => /\bfeatures?\b/i.test(s) && /(used for|to)\b/i.test(s),
    correct: () => 'Features are inputs the model uses to produce predictions.',
    wrong: (_q, sel) => `"${sel}" is not the model output produced from features.`,
    diagram: (_q, sel) =>
      [
        'flowchart TD',
        'F[Features (input)] --> M[Model]',
        'M --> Y[Predictions (output)]',
        sel ? `S["Selected: ${sel.replace(/"/g, '\\"')}"] --> NO((Not the output))` : '',
        'Y --> OK((Correct))',
      ].filter(Boolean).join('\n'),
  },
  {
    id: 'reinforcement_agent',
    applies: (s) => /reinforcement/i.test(s) || /training .* to (walk|move|act)/i.test(s),
    correct: () => 'Reinforcement learning optimizes an acting entity (agent) via rewards.',
    wrong: (_q, sel) => `"${sel}" is not the acting entity; RL needs an agent that takes actions.`,
    diagram: (_q, sel) =>
      [
        'flowchart LR',
        'A[Agent] -- action --> E[Environment]',
        'E -- reward --> A',
        sel ? `S["Selected: ${sel.replace(/"/g, '\\"')}"] --> NO((Not an agent))` : '',
        'A --> OK((Correct entity))',
      ].filter(Boolean).join('\n'),
  },
  {
    id: 'binary_search',
    applies: (s) => /\bbinary search\b/i.test(s) || /(midpoint|half|bisection|divide and conquer)/i.test(s),
    correct: () => 'Binary search repeatedly halves the search interval around the midpoint.',
    wrong: (_q, sel) => `"${sel}" does not express the halving/bisection step central to binary search.`,
    diagram: (_q, sel) =>
      [
        'flowchart TD',
        'S[Sorted array] --> M[Pick midpoint]',
        'M -->|compare| L{target < mid?}',
        'L -- yes --> Left[Keep left half]',
        'L -- no --> Right[Keep right half]',
        sel ? `S2["Selected: ${sel.replace(/"/g, '\\"')}"] --> NO((Not halving))` : '',
        'Left --> OK((Bisection logic))',
        'Right --> OK',
      ].join('\n'),
  },
  {
    id: 'supervised_labels',
    applies: (s) => /supervised/i.test(s),
    correct: () => 'Supervised learning maps inputs to labeled targets and minimizes error.',
    wrong: (_q, sel) => `"${sel}" does not align with label-target learning.`,
    diagram: (_q, sel) =>
      [
        'flowchart TD',
        'X[Inputs] --> M[Model]',
        'Y[Labels/Targets] --> L[Loss]',
        'M --> Yhat[Predictions]',
        'Yhat --> L',
        'L -->|minimize| M',
        sel ? `S["Selected: ${sel.replace(/"/g, '\\"')}"] --> NO((Not label-aligned))` : '',
        'Y --> OK((Label objective))',
      ].filter(Boolean).join('\n'),
  },
];

const getFirstHint = (s: string) => HINTS.find(h => h.applies(s));

// ----------------------
// Formatting enforcement
// ----------------------
const isGrammarish = (t: string) =>
  /\bgrammar|grammatical|word choice|phrase|fits the sentence|linguistic|syntax\b/i.test(t);

// Strip any markdown-like headings, emojis, bullets, emphasis; normalize to one short paragraph
const sanitizeToParagraph = (raw?: string) => {
  if (!raw) return '';
  let t = raw;

  // Remove code fences and inline code
  t = t.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/`[^`]*`/g, ' ');

  // Remove headings and list markers
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  t = t.replace(/^\s*[-*+]\s+/gm, '');
  t = t.replace(/^\s*\d+\.\s+/gm, '');

  // Remove emphasis markers
  t = t.replace(/(\*\*|__)(.*?)\1/g, '$2');
  t = t.replace(/(\*|_)(.*?)\1/g, '$2');

  // Remove leading/trailing dashes used as bullets
  t = t.replace(/(?:^|\n|\s)[–—-]\s+/g, ' ');

  // Remove emojis and stray symbols
  t = t.replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ');

  // Collapse whitespace
  t = t.replace(/\s+/g, ' ').trim();

  // Keep max 2 sentences, cap length
  const one = t.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  const capped = one.length > 360 ? one.slice(0, 360).trimEnd() + '…' : one;

  // Ensure final punctuation
  return /[.!?]$/.test(capped) ? capped : capped + '.';
};

// Build two explicit reasons and a diagram from the same reasons
const composeReasons = (q: QuizQuestion, selected?: string, aiText?: string) => {
  const hint = getFirstHint(q.source);
  let correctReason = hint ? hint.correct(q) : `The correct choice "${q.answer}" matches the underlying concept the sentence describes.`;
  const wrongReason = selected ? (hint ? hint.wrong(q, selected) : `"${selected}" does not align with the concept required by the sentence.`) : '';

  // If AI text exists and is not grammar-focused, we can incorporate it for correctness-only phrasing,
  // but we still keep the explicit wrong/correct separation.
  if (aiText && !isGrammarish(aiText)) {
    const clean = sanitizeToParagraph(aiText);
    // Try to split AI text into two parts with connectors; otherwise keep as correctReason.
    // We prefer keeping our deterministic reasons to guarantee coverage of both sides.
    if (!hint) correctReason = clean;
  }

  // Final single paragraph: when wrong, concatenate; when right, only correctReason.
  const buildParagraph = (isCorrect: boolean) => {
    if (isCorrect) return sanitizeToParagraph(correctReason);
    return sanitizeToParagraph(`${wrongReason} ${correctReason}`);
  };

  const buildDiagram = (isCorrect: boolean) => {
    if (hint) {
      return hint.diagram(q, selected);
    }
    // Generic logic-aligned diagram
    const sel = selected ? selected.replace(/"/g, '\\"') : '';
    return [
      'flowchart TD',
      `CTX["${q.prompt.replace('____', '(blank)').replace(/"/g, '\\"')}"] --> D{Fill choice}`,
      sel ? `D --> S["Selected: ${sel}"]` : 'D --> S["Selected"]',
      `D --> C["Correct: ${q.answer.replace(/"/g, '\\"')}"]`,
      isCorrect ? 'S --> OK((Correct))' : 'S --> NO((Mismatch))',
      'C --> WHY[Concept aligns with objective]',
    ].join('\n');
  };

  return { correctReason, wrongReason, buildParagraph, buildDiagram };
};

// ----------------------
// AI-backed explanations (same endpoint as page.tsx), paragraph only
// ----------------------
type ExplanationState = {
  status: 'idle' | 'loading' | 'done' | 'error';
  text?: string;
  chart?: string;
  error?: string;
};

async function getAIParagraph(q: QuizQuestion, selected: string | undefined) {
  const isCorrect = selected?.toLowerCase() === q.answer.toLowerCase();
  const hint = getFirstHint(q.source);

  const logicGuide = hint
    ? `Logic focus: ${hint.id}`
    : 'Logic focus: derive a causal/functional relation from the sentence (no grammar).';

  // Hard requirements to avoid markdown/emoji and forbid grammar talk
  const notes = [
    'You are generating a concise, logic-first explanation for a multiple-choice quiz.',
    'STRICT RULES:',
    '- Do NOT discuss grammar, wording, phrasing, or syntax.',
    '- Do NOT use headings, lists, bullets, emojis, or markdown emphasis in the paragraph.',
    '- Produce ONE short paragraph (max 2 sentences) focused ONLY on domain logic.',
    '',
    `Full sentence: "${q.source}"`,
    `Blank version: "${q.prompt}"`,
    `Correct answer: "${q.answer}"`,
    `Learner selected: "${selected ?? '(none)'}" (${isCorrect ? 'correct' : 'incorrect'})`,
    logicGuide,
  ].join('\n');

  const res = await fetch(`${API_URL}/process-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, files: [] }),
  });

  if (!res.ok) throw new Error(`Server error ${res.status}`);

  const data = await res.json();
  return (data?.status === 'success' ? (data?.response ?? '') : '').toString();
}

// ----------------------
// Component
// ----------------------
export default function Quiz({ text }: { text: string }) {
  const [seed, setSeed] = useState(() => uuid());
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [explanations, setExplanations] = useState<Record<string, ExplanationState>>({});
  const [copyOk, setCopyOk] = useState<string | null>(null);

  // Create a seeded RNG and rebuild questions whenever seed changes
  const rng = useMemo(() => createRng(seed), [seed]);
  const questions = useMemo(() => buildQuestions(text, 5, rng), [text, rng]);

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id]);

  const onSelect = useCallback((qid: string, oid: string) => {
    setAnswers(prev => ({ ...prev, [qid]: oid }));
  }, []);

  const fetchAllExplanations = useCallback(async () => {
    const init: Record<string, ExplanationState> = {};
    for (const q of questions) {
      if (!answers[q.id]) continue;
      init[q.id] = { status: 'loading' };
    }
    setExplanations(prev => ({ ...prev, ...init }));

    await Promise.all(
      questions.map(async (q) => {
        const selectedOpt = q.options.find(o => o.id === answers[q.id]);
        if (!selectedOpt) return;

        try {
          const aiParagraphRaw = await getAIParagraph(q, selectedOpt.text);
          const { buildParagraph, buildDiagram } = composeReasons(q, selectedOpt.text, aiParagraphRaw);
          const isCorrect = !!selectedOpt.isCorrect;
          const paragraph = buildParagraph(isCorrect);
          const chart = buildDiagram(isCorrect);
          setExplanations(prev => ({
            ...prev,
            [q.id]: { status: 'done', text: paragraph, chart },
          }));
        } catch {
          // Fallback: purely rules-based
          const { buildParagraph, buildDiagram } = composeReasons(q, selectedOpt.text);
          const isCorrect = !!selectedOpt.isCorrect;
          setExplanations(prev => ({
            ...prev,
            [q.id]: { status: 'done', text: buildParagraph(isCorrect), chart: buildDiagram(isCorrect) },
          }));
        }
      })
    );
  }, [questions, answers]);

  const onCheck = useCallback(async () => {
    setChecked(true);
    await fetchAllExplanations();
  }, [fetchAllExplanations]);

  const onReset = useCallback(() => {
    setChecked(false);
    setAnswers({});
    setExplanations({});
    setSeed(uuid() + Date.now().toString(36)); // new seed => new questions
  }, []);

  const handleCopy = async (content: string, key: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyOk(key);
      setTimeout(() => setCopyOk(null), 1400);
    } catch {
      // ignore
    }
  };

  if (questions.length === 0) {
    return (
      <div className="p-5 text-sm text-slate-500">
        Not enough context to generate a quiz. Try asking a more detailed question first.
      </div>
    );
  }

  const score = checked
    ? questions.reduce((acc, q) => {
        const sel = answers[q.id];
        const opt = q.options.find(o => o.id === sel);
        return acc + (opt?.isCorrect ? 1 : 0);
      }, 0)
    : 0;

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles size={16} className="text-violet-600" />
          <span className="font-semibold">Quick Quiz</span>
          <span className="text-xs text-slate-500">• {questions.length} questions</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-1">
              <RotateCcw size={14} /> Regenerate
            </span>
          </button>
          <button
            onClick={onCheck}
            disabled={!allAnswered}
            className="px-3 py-1.5 text-xs rounded-md bg-slate-800 text-white disabled:bg-slate-300 disabled:text-white/90"
          >
            <span className="inline-flex items-center gap-1">
              <Check size={14} /> Check answers
            </span>
          </button>
        </div>
      </div>

      <ul className="space-y-4">
        {questions.map((q, idx) => {
          const selected = answers[q.id];
          const selectedOpt = q.options.find(o => o.id === selected);
          const isCorrect = !!(selectedOpt && selectedOpt.isCorrect);

          const expl = explanations[q.id];
          const hasExpl = checked && selectedOpt;
          const mermaidMarkdown = expl?.chart ? ['```mermaid', expl.chart, '```'].join('\n') : '';

          return (
            <li key={q.id} className="rounded-lg border border-slate-200 bg-white/80">
              <div className="p-4">
                <div className="mb-2 text-sm font-medium text-slate-800 break-words">
                  Q{idx + 1}. {q.prompt}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map(o => {
                    const isSelected = selected === o.id;
                    const stateClass =
                      checked && isSelected
                        ? o.isCorrect
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-red-300 bg-red-50'
                        : 'border-slate-200 bg-white';

                    return (
                      <label
                        key={o.id}
                        className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${stateClass}`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          className="accent-slate-800"
                          checked={isSelected}
                          onChange={() => onSelect(q.id, o.id)}
                        />
                        <span className="text-sm text-slate-700">{o.text}</span>
                      </label>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {hasExpl && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                      className="text-sm space-y-3"
                    >
                      {isCorrect ? (
                        <div className="text-emerald-700 font-medium">
                          Correct! The answer is {selectedOpt?.text}.
                        </div>
                      ) : (
                        <div className="text-red-700 font-medium">
                          Not quite. Correct answer: {q.answer}.
                        </div>
                      )}

                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
                        {expl?.status === 'loading' && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Generating explanation…</span>
                          </div>
                        )}

                        {expl?.status === 'done' && (
                          <>
                            {expl.text && (
                              <p className="text-slate-700 leading-relaxed">
                                {expl.text}
                              </p>
                            )}

                            {expl.chart && (
                              <div>
                                <div className="mb-1 flex items-center justify-between">
                                  <div className="font-medium text-slate-600 text-xs">Diagram</div>
                                  <button
                                    onClick={() => mermaidMarkdown && handleCopy(mermaidMarkdown, q.id)}
                                    className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800"
                                    title="Copy mermaid markdown"
                                  >
                                    <Copy size={14} />
                                    {copyOk === q.id ? 'Copied' : 'Copy'}
                                  </button>
                                </div>
                                <div className="rounded border border-slate-200 bg-white p-2">
                                  <MermaidDiagram chart={expl.chart} />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {expl?.status === 'error' && (
                          <p className="text-slate-700">
                            Could not generate an explanation. Please try again.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm font-semibold text-slate-700"
          >
            Score: {score} / {questions.length}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}