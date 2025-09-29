'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, RotateCcw, Sparkles, Eye, EyeOff, GitBranch } from 'lucide-react';
import MermaidDiagram from './Mermaid';

interface ParsedQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    letter: string;
    text: string;
  }[];
  correctAnswer: string;
  explanation?: string;
  diagram?: string;
}

interface QuizData {
  questions: ParsedQuestion[];
}

interface EnhancedQuizProps {
  text: string;
  onRegenerate?: () => void;
}

const parseQuizText = (text: string): QuizData => {
  const questions: ParsedQuestion[] = [];
  
  // Find content between QUIZ START and QUIZ END
  const quizMatch = text.match(/\*\*QUIZ START\*\*(.*?)\*\*QUIZ END\*\*/s);
  const content = quizMatch ? quizMatch[1] : text;
  
  // Split by **Question N:** pattern
  const questionBlocks = content.split(/\*\*Question\s+\d+:\*\*/);
  
  questionBlocks.forEach((block, index) => {
    if (!block.trim() || index === 0) return;
    
    const lines = block.trim().split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return;
    
    const questionText = lines[0];
    const options: { id: string; letter: string; text: string }[] = [];
    let correctAnswer = '';
    let explanation = '';
    let diagram = '';
    
    let currentSection = 'options';
    const diagramLines: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.match(/^[A-D]\)/)) {
        const letter = line.charAt(0);
        const text = line.substring(3).trim();
        options.push({
          id: `${index}-${letter}`,
          letter,
          text
        });
      } else if (line.startsWith('**Correct Answer:**')) {
        correctAnswer = line.replace('**Correct Answer:**', '').trim();
        currentSection = 'answer';
      } else if (line.startsWith('**Explanation:**')) {
        explanation = line.replace('**Explanation:**', '').trim();
        currentSection = 'explanation';
      } else if (line.startsWith('**Diagram:**')) {
        currentSection = 'diagram';
        const diagramStart = line.replace('**Diagram:**', '').trim();
        if (diagramStart) diagramLines.push(diagramStart);
      } else if (currentSection === 'explanation' && !line.startsWith('**')) {
        explanation += ' ' + line;
      } else if (currentSection === 'diagram' && !line.startsWith('**')) {
        diagramLines.push(line);
      }
    }
    
    if (diagramLines.length > 0) {
      diagram = diagramLines.join('\n').trim();
    }
    
    if (questionText && options.length >= 2) {
      questions.push({
        id: `q-${index}`,
        question: questionText,
        options,
        correctAnswer,
        explanation: explanation.trim(),
        diagram: diagram || undefined
      });
    }
  });
  
  return { questions };
};

export default function EnhancedQuiz({ text, onRegenerate }: EnhancedQuizProps) {
  const quizData = useMemo(() => parseQuizText(text), [text]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({});
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const handleAnswerSelect = useCallback((questionId: string, optionId: string) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }, [showResults]);
  
  const handleCheckAnswers = useCallback(() => {
    setShowResults(true);
  }, []);
  
  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate) return;
    
    setIsRegenerating(true);
    try {
      await onRegenerate();
      // Reset state for new quiz
      setAnswers({});
      setShowResults(false);
      setShowExplanations({});
    } catch (error) {
      console.error('Failed to regenerate quiz:', error);
    } finally {
      setIsRegenerating(false);
    }
  }, [onRegenerate]);
  
  const toggleExplanation = useCallback((questionId: string) => {
    setShowExplanations(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  }, []);
  
  const allAnswered = quizData.questions.every(q => answers[q.id]);
  const score = showResults 
    ? quizData.questions.reduce((acc, q) => {
        const selectedOption = q.options.find(opt => opt.id === answers[q.id]);
        return acc + (selectedOption?.letter === q.correctAnswer ? 1 : 0);
      }, 0)
    : 0;
  
  if (quizData.questions.length === 0) {
    return (
      <div className="p-5 text-center text-slate-500">
        <p>Unable to parse quiz questions. Please try again.</p>
      </div>
    );
  }
  
  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles size={16} className="text-violet-600" />
          <span className="font-semibold">Interactive Quiz</span>
          <span className="text-xs text-slate-500">• {quizData.questions.length} questions</span>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1">
                <RotateCcw size={14} className={isRegenerating ? 'animate-spin' : ''} />
                {isRegenerating ? 'Generating...' : 'Regenerate'}
              </span>
            </button>
          )}
          <button
            onClick={handleCheckAnswers}
            disabled={!allAnswered || showResults}
            className="px-3 py-1.5 text-xs rounded-md bg-slate-800 text-white disabled:bg-slate-300 disabled:text-white/90 transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <Check size={14} /> Check Answers
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {quizData.questions.map((question, idx) => {
          const selectedOptionId = answers[question.id];
          const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
          const isCorrect = selectedOption?.letter === question.correctAnswer;
          const correctOption = question.options.find(opt => opt.letter === question.correctAnswer);
          
          return (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-lg border border-slate-200 bg-white/80 shadow-sm"
            >
              <div className="p-4">
                <div className="mb-3 text-sm font-medium text-slate-800">
                  <span className="text-violet-600">Q{idx + 1}.</span> {question.question}
                </div>
                
                <div className="grid gap-2">
                  {question.options.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    const isCorrectOption = option.letter === question.correctAnswer;
                    
                    let stateClass = 'border-slate-200 bg-white hover:bg-slate-50';
                    
                    if (showResults && isSelected) {
                      stateClass = isCorrect 
                        ? 'border-emerald-300 bg-emerald-50' 
                        : 'border-red-300 bg-red-50';
                    } else if (showResults && isCorrectOption) {
                      stateClass = 'border-emerald-300 bg-emerald-50';
                    }
                    
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${stateClass} ${showResults ? 'cursor-default' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          className="mt-0.5 accent-violet-600"
                          checked={isSelected}
                          onChange={() => handleAnswerSelect(question.id, option.id)}
                          disabled={showResults}
                        />
                        <div className="flex-1">
                          <span className="font-medium text-violet-700">{option.letter})</span>
                          <span className="ml-2 text-sm text-slate-700">{option.text}</span>
                        </div>
                        {showResults && isCorrectOption && (
                          <Check size={16} className="text-emerald-600 mt-0.5" />
                        )}
                      </label>
                    );
                  })}
                </div>
                
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`text-sm font-medium ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isCorrect ? '✓ Correct!' : '✗ Incorrect'} 
                        {!isCorrect && correctOption && (
                          <span className="ml-1">Correct answer: {correctOption.letter}) {correctOption.text}</span>
                        )}
                      </div>
                      
                      {(question.explanation || question.diagram) && (
                        <button
                          onClick={() => toggleExplanation(question.id)}
                          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 transition-colors"
                        >
                          {showExplanations[question.id] ? (
                            <>
                              <EyeOff size={14} />
                              <span>Hide Details</span>
                            </>
                          ) : (
                            <>
                              <Eye size={14} />
                              <span>Show Details</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    <AnimatePresence>
                      {showExplanations[question.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="space-y-3"
                        >
                          {question.explanation && (
                            <div className="rounded-md bg-slate-50 p-3">
                              <div className="text-xs font-medium text-slate-600 mb-1">Explanation</div>
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {question.explanation}
                              </p>
                            </div>
                          )}
                          
                          {question.diagram && (
                            <div className="rounded-md bg-white border border-slate-200 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <GitBranch size={14} className="text-slate-600" />
                                <span className="text-xs font-medium text-slate-600">Concept Diagram</span>
                              </div>
                              <div className="bg-white rounded border border-slate-100 p-2">
                                <MermaidDiagram chart={question.diagram} />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {showResults && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-lg bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200"
        >
          <div className="text-center">
            <div className="text-lg font-semibold text-violet-800">
              Quiz Complete! 🎉
            </div>
            <div className="text-sm text-violet-700 mt-1">
              Your Score: <span className="font-bold">{score} / {quizData.questions.length}</span>
              {score === quizData.questions.length && (
                <span className="ml-2">Perfect! 🌟</span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}