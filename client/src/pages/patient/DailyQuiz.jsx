import React, { useState } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DailyQuiz() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(1);

  const sampleQuestion = {
    id: 'QQ001',
    question: 'When should you take your prescribed Paracetamol?',
    options: [
      'Before breakfast on an empty stomach',
      'After meals with water',
      'Only when in severe pain',
      'At bedtime right before sleeping'
    ],
    correctAnswer: 1
  };

  return (
    <PageContainer
      title="Daily Teach-Back Quiz"
      subtitle="Test your comprehension of your post-discharge instructions."
      badge={<span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">Question 1 of 5</span>}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card title="Comprehension Check" variant="gradient">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-950 rounded-lg text-cyan-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">{sampleQuestion.question}</h3>
            </div>

            <div className="space-y-3 pt-4">
              {sampleQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
                    selectedOption === idx
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-lg shadow-cyan-950'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span>{opt}</span>
                  {selectedOption === idx && <CheckCircle2 className="w-5 h-5 text-cyan-400" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => navigate('/patient/quiz/result')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Submit & Next Question
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
