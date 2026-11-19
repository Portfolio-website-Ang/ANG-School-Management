import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import type { SchoolDatabase } from '../types';
import { querySchoolDataWithAI } from '../services/geminiService';
import Card from './ui/Card';
import Spinner from './ui/Spinner';

interface AiAssistantViewProps {
  db: SchoolDatabase;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  isError?: boolean;
}

const STARTER_PROMPTS = [
  'List all overdue and due fee invoices with parent contact details.',
  'Which students were marked Absent or Late today?',
  'Summarize quiz performance across Class 5A.',
  'Draft a short parent circular for upcoming STEM assessments.',
];

const AiAssistantView: React.FC<AiAssistantViewProps> = ({ db }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `Hello! I am the ${db.branding.schoolName} AI Analyst. Ask me about enrollment, attendance patterns, overdue fees, LMS courses, or quiz performance.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendQuery = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setIsLoading(true);

    try {
      const answer = await querySchoolDataWithAI(trimmed);
      setMessages(prev => [...prev, { sender: 'ai', text: answer }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: err?.message || 'Unable to process query right now.',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STARTER_PROMPTS.map(prompt => (
          <button
            key={prompt}
            type="button"
            disabled={isLoading}
            onClick={() => sendQuery(prompt)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      <Card
        title="Live School Data Analyst"
        subtitle="Queries execute securely through the server endpoint against live school records"
        className="flex flex-col h-[68vh]"
      >
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-lg brand-bg text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'brand-bg text-white'
                    : msg.isError
                    ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg brand-bg text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Spinner size="sm" />
                <span>Analyzing school records...</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about students, attendance, fees, or LMS progress..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-white brand-bg disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>Ask Analyst</span>
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AiAssistantView;
