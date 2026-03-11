import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scale, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Table as TableIcon, 
  Zap,
  Info,
  ArrowRight
} from 'lucide-react';
import { AnalysisType, DecisionInput, AnalysisResult, ProsConsResult, ComparisonResult, SWOTResult } from './types';
import { generateAnalysis } from './services/gemini';

export default function App() {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [type, setType] = useState<AnalysisType>(AnalysisType.PROS_CONS);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddOption = () => setOptions([...options, '']);
  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const input: DecisionInput = {
        topic,
        context,
        type,
        options: type === AnalysisType.COMPARISON ? options.filter(o => o.trim()) : undefined
      };
      const data = await generateAnalysis(input);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 py-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Scale className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">The Tiebreaker</h1>
        </div>
        <div className="hidden sm:block text-sm text-slate-500 font-medium">
          AI-Powered Decision Assistant
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Form Section */}
          <div className="lg:col-span-5">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">What's the decision?</label>
                  <input 
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Should I buy a Tesla or a BMW?"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Additional Context (Optional)</label>
                  <textarea 
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Provide more details to help the AI..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px] resize-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700">Analysis Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: AnalysisType.PROS_CONS, label: 'Pros & Cons', icon: Scale },
                      { id: AnalysisType.COMPARISON, label: 'Comparison Table', icon: TableIcon },
                      { id: AnalysisType.SWOT, label: 'SWOT Analysis', icon: Zap },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setType(item.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                          type === item.id 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <item.icon size={18} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {type === AnalysisType.COMPARISON && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <label className="block text-sm font-semibold text-slate-700">Options to Compare</label>
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        {options.length > 2 && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={handleAddOption}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      <Plus size={16} /> Add Option
                    </button>
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading || !topic.trim()}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      Analyze Decision
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!result && !isLoading && !error && (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
                    <Info className="text-slate-400 w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Ready to help</h3>
                  <p className="text-slate-500 max-w-xs">
                    Fill out the form to get an AI-powered breakdown of your decision.
                  </p>
                </motion.div>
              )}

              {isLoading && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12"
                >
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-indigo-100 rounded-full"></div>
                    <div className="w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Thinking...</h3>
                  <p className="text-slate-500">Analyzing pros, cons, and alternatives for you.</p>
                </motion.div>
              )}

              {error && (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-red-50 rounded-3xl border border-red-100 text-center"
                >
                  <XCircle className="text-red-500 w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-red-800 mb-2">Something went wrong</h3>
                  <p className="text-red-600 mb-6">{error}</p>
                  <button 
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </motion.div>
              )}

              {result && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider mb-4">
                      <Scale size={16} />
                      Analysis Result
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-6 leading-tight">{topic}</h2>
                    
                    {type === AnalysisType.PROS_CONS && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="flex items-center gap-2 font-bold text-emerald-600">
                            <CheckCircle2 size={18} /> Pros
                          </h4>
                          <ul className="space-y-3">
                            {(result as ProsConsResult).pros.map((pro, i) => (
                              <li key={i} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-4">
                          <h4 className="flex items-center gap-2 font-bold text-rose-600">
                            <XCircle size={18} /> Cons
                          </h4>
                          <ul className="space-y-3">
                            {(result as ProsConsResult).cons.map((con, i) => (
                              <li key={i} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {type === AnalysisType.COMPARISON && (
                      <div className="overflow-x-auto -mx-8 px-8">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100">
                              {(result as ComparisonResult).headers.map((header, i) => (
                                <th key={i} className="py-4 px-4 font-bold text-slate-700 uppercase tracking-wider text-xs">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(result as ComparisonResult).rows.map((row, i) => (
                              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                {(result as ComparisonResult).headers.map((header, j) => (
                                  <td key={j} className="py-4 px-4 text-slate-600 leading-relaxed">
                                    {row[header] || row[Object.keys(row)[j]]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {type === AnalysisType.SWOT && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { title: 'Strengths', items: (result as SWOTResult).strengths, color: 'emerald' },
                          { title: 'Weaknesses', items: (result as SWOTResult).weaknesses, color: 'rose' },
                          { title: 'Opportunities', items: (result as SWOTResult).opportunities, color: 'indigo' },
                          { title: 'Threats', items: (result as SWOTResult).threats, color: 'amber' },
                        ].map((section) => (
                          <div key={section.title} className={`p-6 rounded-2xl border border-${section.color}-100 bg-${section.color}-50/30`}>
                            <h4 className={`font-bold text-${section.color}-700 mb-3`}>{section.title}</h4>
                            <ul className="space-y-2">
                              {section.items.map((item, i) => (
                                <li key={i} className="flex gap-2 text-slate-600 text-xs leading-relaxed">
                                  <ArrowRight size={12} className={`mt-0.5 text-${section.color}-400 shrink-0`} />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200"
                  >
                    <div className="flex items-center gap-2 font-bold text-indigo-200 text-sm uppercase tracking-wider mb-3">
                      <Zap size={16} />
                      AI Verdict
                    </div>
                    <p className="text-xl font-medium leading-relaxed italic">
                      "{result.verdict}"
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-sm">
          Built with Gemini AI &bull; Helping you make better choices
        </p>
      </footer>
    </div>
  );
}
