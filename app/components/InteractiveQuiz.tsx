'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface QuizProps {
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
}

export default function InteractiveQuiz({ questions }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  
  const handleAnswerSelection = (index: number) => {
    if (isAnswered) return;
    
    setSelectedAnswer(index);
    setIsAnswered(true);
    
    if (index === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
      toast.success('Correct! +10 XP', {
        className: 'bg-green-600',
        duration: 2000,
        position: 'top-center'
      });
    }
  };
  
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };
  
  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
  };
  
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  
  return (
    <div className="my-6 bg-[#202123] rounded-lg border border-gray-700 overflow-hidden interactive-card">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex justify-between items-center">
        <h3 className="text-white font-medium">Interactive Knowledge Check</h3>
        <div className="text-xs bg-white/20 px-2 py-1 rounded-full">
          Question {currentQuestion + 1} of {questions.length}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-700">
        <motion.div 
          className="h-full bg-green-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      {!showResults ? (
        <div className="p-4">
          <div className="mb-4">
            <h4 className="text-white text-lg mb-4">{question.question}</h4>
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleAnswerSelection(index)}
                  className={`w-full text-left p-3 border rounded-md transition-all ${
                    selectedAnswer === index
                      ? index === question.correctAnswer
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-red-500 bg-red-500/20'
                      : 'border-gray-600 hover:border-blue-500 bg-[#2A2B32] hover:bg-[#32333E]'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={isAnswered}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {isAnswered && index === question.correctAnswer && (
                      <Check size={18} className="text-green-500" />
                    )}
                    {isAnswered && selectedAnswer === index && index !== question.correctAnswer && (
                      <X size={18} className="text-red-500" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
          
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-[#2A2B32] border border-gray-700 rounded-md"
            >
              <p className="text-sm mb-2">
                {selectedAnswer === question.correctAnswer ? (
                  <span className="text-green-400 font-medium">Correct!</span>
                ) : (
                  <span className="text-red-400 font-medium">Incorrect!</span>
                )}
              </p>
              {question.explanation && (
                <p className="text-gray-300 text-sm">{question.explanation}</p>
              )}
              <button
                onClick={handleNextQuestion}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-6 text-center"
        >
          <div className="mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center">
              <Trophy size={32} className="text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">Quiz Complete!</h3>
          <p className="text-gray-300 mb-4">Your score: {score} out of {questions.length}</p>
          
          <div className="w-full bg-gray-700 h-3 rounded-full mb-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(score / questions.length) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className={`h-full rounded-full ${
                score / questions.length > 0.7 ? 'bg-green-500' : 
                score / questions.length > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
          </div>
          
          <div className="mb-6">
            {score === questions.length ? (
              <div className="text-green-400 font-medium">Perfect score! Excellent work!</div>
            ) : score / questions.length > 0.7 ? (
              <div className="text-green-400 font-medium">Great job! You&apos;ve mastered this topic.</div>
            ) : score / questions.length > 0.4 ? (
              <div className="text-yellow-400 font-medium">Good effort! Review a bit more to improve.</div>
            ) : (
              <div className="text-red-400 font-medium">You might need more practice on this topic.</div>
            )}
          </div>
          
          <button
            onClick={resetQuiz}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      )}
    </div>
  );
}