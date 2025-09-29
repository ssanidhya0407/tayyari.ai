'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface QuizComponentProps {
  questions: Question[];
  topic: string;
  onComplete?: (answers: string[], correctCount: number, totalQuestions: number) => void;
}

export default function QuizComponent({ questions, topic, onComplete }: QuizComponentProps) {
  const { user } = useUser();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateAndSubmitResults();
    }
  };

  const calculateAndSubmitResults = async () => {
    let correctAnswers = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correct_answer) {
        correctAnswers++;
      }
    });

    const finalScore = correctAnswers / questions.length;
    setScore(finalScore);
    setShowResults(true);

    // Call the completion callback with results
    if (onComplete) {
      onComplete(selectedAnswers, correctAnswers, questions.length);
    }
  };

  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center text-white">Quiz Complete! 🎉</h2>
        <div className="text-center">
          <div className="text-4xl font-bold text-green-400 mb-2">
            {Math.round(score * 100)}%
          </div>
          <p className="text-gray-300 mb-4">
            You got {Math.round(score * questions.length)} out of {questions.length} questions correct!
          </p>
          <p className="text-blue-400 font-semibold">
            🎯 Points have been awarded to your account!
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          Take Another Quiz
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];
  if (!question) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg text-white">
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4">{question.question_text}</h3>
      
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelect(option)}
            className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
              selectedAnswers[currentQuestion] === option
                ? 'border-blue-500 bg-blue-500/20'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={!selectedAnswers[currentQuestion]}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
      </button>
    </div>
  );
}
