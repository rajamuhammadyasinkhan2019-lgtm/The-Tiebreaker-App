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
  ArrowRight,
  BarChart4,
  List,
  Copy,
  Check,
  GitCompare,
  History
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid 
} from 'recharts';
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
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [history, setHistory] = useState<Array<{
    id: string;
    topic: string;
    type: AnalysisType;
    result: AnalysisResult;
    timestamp: number;
  }>>(() => {
    try {
      const saved = localStorage.getItem('tiebreaker_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [compareLeftId, setCompareLeftId] = useState<string>('');
  const [compareRightId, setCompareRightId] = useState<string>('');
  const [isCompareMode, setIsCompareMode] = useState(false);

  const loadingSteps = [
    "Analyzing prompt and criteria parameters...",
    "Scanning landscapes and synthesizing variables...",
    "Estimating success probabilities & calibrating confidence score...",
    "Formulating optimal decision tree & writing final tiebreaker verdict..."
  ];

  React.useEffect(() => {
    let interval: NodeJS.Timeout | number;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < loadingSteps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1800);
    }
    return () => {
      clearInterval(interval as any);
    };
  }, [isLoading]);

  React.useEffect(() => {
    if (history.length > 0 && !compareLeftId) {
      setCompareLeftId(history[0].id);
    }
    if (history.length > 1 && !compareRightId) {
      setCompareRightId(history[1].id);
    } else if (history.length > 0 && !compareRightId) {
      setCompareRightId(history[0].id);
    }
  }, [history, compareLeftId, compareRightId]);

  const handleCopy = () => {
    if (!result) return;
    
    let text = `THE TIEBREAKER ANALYSIS\n=======================\n`;
    text += `Topic: ${topic}\n`;
    if (context) {
      text += `Context: ${context}\n`;
    }
    text += `Analysis Method: ${type}\n\n`;

    if (type === AnalysisType.PROS_CONS) {
      const pc = result as ProsConsResult;
      text += `--- PROS ---\n`;
      if (pc.pros && pc.pros.length > 0) {
        pc.pros.forEach(pro => text += `• ${pro}\n`);
      } else {
        text += `• None\n`;
      }
      text += `\n--- CONS ---\n`;
      if (pc.cons && pc.cons.length > 0) {
        pc.cons.forEach(con => text += `• ${con}\n`);
      } else {
        text += `• None\n`;
      }
    } else if (type === AnalysisType.COMPARISON) {
      const comp = result as ComparisonResult;
      if (comp.headers && comp.headers.length > 0 && comp.rows) {
        text += `--- COMPARISON TABLE ---\n`;
        text += comp.headers.join(' | ') + '\n';
        text += comp.headers.map(() => '---').join(' | ') + '\n';
        comp.rows.forEach(row => {
          const rowValues = comp.headers.map(header => {
            return row[header] !== undefined 
              ? row[header] 
              : (row[header.toLowerCase()] !== undefined 
                  ? row[header.toLowerCase()] 
                  : (row[Object.keys(row)[0]] || ""));
          });
          text += rowValues.join(' | ') + '\n';
        });
      }
    } else if (type === AnalysisType.SWOT) {
      const swot = result as SWOTResult;
      text += `--- SWOT ANALYSIS ---\n`;
      text += `[Strengths]\n`;
      (swot.strengths || []).forEach(item => text += `• ${item}\n`);
      text += `\n[Weaknesses]\n`;
      (swot.weaknesses || []).forEach(item => text += `• ${item}\n`);
      text += `\n[Opportunities]\n`;
      (swot.opportunities || []).forEach(item => text += `• ${item}\n`);
      text += `\n[Threats]\n`;
      (swot.threats || []).forEach(item => text += `• ${item}\n`);
    }

    if (result.confidenceScore !== undefined) {
      text += `\nConfidence Score: ${result.confidenceScore}%\n`;
    }

    if (result.successProbabilities && result.successProbabilities.length > 0) {
      text += `\n--- SUCCESS PROBABILITIES ---\n`;
      result.successProbabilities.forEach(probItem => {
        text += `• ${probItem.option}: ${probItem.probability}%\n`;
        if (probItem.rationale) {
          text += `  Rationale: ${probItem.rationale}\n`;
        }
      });
    }

    text += `\n--- VERDICT ---\n`;
    text += result.verdict + `\n`;
    text += `\nShared via The Tiebreaker Decision Assistant.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Could not copy summary: ", err);
    });
  };

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

  const handleDeleteHistory = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== idToDelete);
      try {
        localStorage.setItem('tiebreaker_history', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    if (compareLeftId === idToDelete) setCompareLeftId('');
    if (compareRightId === idToDelete) setCompareRightId('');
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
      const newItem = {
        id: Date.now().toString(),
        topic,
        type,
        result: data,
        timestamp: Date.now()
      };
      setHistory(prev => {
        const updated = [newItem, ...prev];
        try {
          localStorage.setItem('tiebreaker_history', JSON.stringify(updated));
        } catch (e) {
          console.error("Could not write history to localStorage", e);
        }
        return updated;
      });
      setCompareLeftId(newItem.id);
      setIsCompareMode(false);
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
            {history.length > 0 && (
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 shadow-sm border border-slate-200/40 w-fit ml-auto">
                <button
                  type="button"
                  onClick={() => setIsCompareMode(false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !isCompareMode
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Scale size={14} /> Active Analysis
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCompareMode(true);
                    if (!compareLeftId && history.length > 0) {
                      setCompareLeftId(history[0].id);
                    }
                    if (!compareRightId && history.length > 0) {
                      setCompareRightId(history[1]?.id || history[0].id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isCompareMode
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <GitCompare size={14} /> Split Compare ({history.length})
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {isCompareMode && (
                <motion.div
                  key="compare_view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Page Header inside results column */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
                      <GitCompare size={14} />
                      Split-Screen Compare
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      Side-by-Side Analysis Comparison
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 pb-1 font-normal leading-normal">
                      Select two historical decisions from the dropdowns below to compare their final verdicts and model-based success probabilities side-by-side.
                    </p>
                  </div>

                  {/* Split grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LEFT PANEL */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col space-y-6">
                      <div>
                        <label className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">
                          Decision One (Left)
                        </label>
                        <select
                          value={compareLeftId}
                          onChange={(e) => setCompareLeftId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-[#FDFCFB]"
                        >
                          <option value="">-- Choose a Decision --</option>
                          {history.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.topic} ({item.type === AnalysisType.PROS_CONS ? "Pros/Cons" : item.type === AnalysisType.COMPARISON ? "Comparison" : "SWOT"})
                            </option>
                          ))}
                        </select>
                      </div>

                      {history.find(h => h.id === compareLeftId) ? (
                        (() => {
                          const leftItem = history.find(h => h.id === compareLeftId)!;
                          return (
                            <div className="space-y-6 divide-y divide-slate-50">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 font-sans">
                                    {leftItem.type === AnalysisType.PROS_CONS ? 'Pros & Cons' : leftItem.type === AnalysisType.COMPARISON ? 'Comparison Table' : 'SWOT Analysis'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(leftItem.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 leading-tight">
                                  {leftItem.topic}
                                </h4>
                                {leftItem.context && (
                                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-full truncate" title={leftItem.context}>
                                    Context: {leftItem.context}
                                  </p>
                                )}
                              </div>

                              <div className="pt-4 space-y-3">
                                <span className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                                  AI Verdict
                                </span>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <p className="text-xs text-slate-600 leading-relaxed italic">
                                    "{leftItem.result.verdict}"
                                  </p>
                                </div>
                              </div>

                              <div className="pt-4 space-y-4">
                                <span className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                                  Option Probabilities
                                </span>
                                <div className="space-y-3.5">
                                  {leftItem.result.successProbabilities && leftItem.result.successProbabilities.length > 0 ? (
                                    leftItem.result.successProbabilities.map((prob, idx) => (
                                      <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-baseline gap-2">
                                          <span className="text-xs font-bold text-slate-700 truncate max-w-[75%]" title={prob.option}>
                                            {prob.option}
                                          </span>
                                          <span className={`text-xs font-extrabold ${
                                            prob.probability >= 80 ? 'text-emerald-600' :
                                            prob.probability >= 55 ? 'text-indigo-600' : 'text-rose-500'
                                          }`}>
                                            {prob.probability}%
                                          </span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${
                                              prob.probability >= 80 ? 'bg-emerald-500' :
                                              prob.probability >= 55 ? 'bg-indigo-500' : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${prob.probability}%` }}
                                          />
                                        </div>
                                        {prob.rationale && (
                                          <p className="text-[11px] text-slate-500 italic pl-1 leading-normal">
                                            "{prob.rationale}"
                                          </p>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[11px] text-slate-400 italic">No direct option probabilities for this analysis method. See verdict.</div>
                                  )}
                                </div>
                              </div>

                              {leftItem.result.confidenceScore !== undefined && (
                                <div className="pt-4 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Certainty
                                  </span>
                                  <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
                                    leftItem.result.confidenceScore >= 80 ? 'bg-emerald-50 text-emerald-700' :
                                    leftItem.result.confidenceScore >= 55 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {leftItem.result.confidenceScore}%
                                  </span>
                                </div>
                              )}

                              <div className="pt-4 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteHistory(leftItem.id, e)}
                                  className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors text-[11px] font-semibold cursor-pointer"
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
                          <Info size={24} className="mb-2 text-slate-300" />
                          <p className="text-xs">No decision selected.</p>
                        </div>
                      )}
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col space-y-6">
                      <div>
                        <label className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">
                          Decision Two (Right)
                        </label>
                        <select
                          value={compareRightId}
                          onChange={(e) => setCompareRightId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-[#FDFCFB]"
                        >
                          <option value="">-- Choose a Decision --</option>
                          {history.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.topic} ({item.type === AnalysisType.PROS_CONS ? "Pros/Cons" : item.type === AnalysisType.COMPARISON ? "Comparison" : "SWOT"})
                            </option>
                          ))}
                        </select>
                      </div>

                      {history.find(h => h.id === compareRightId) ? (
                        (() => {
                          const rightItem = history.find(h => h.id === compareRightId)!;
                          return (
                            <div className="space-y-6 divide-y divide-slate-50">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 font-sans">
                                    {rightItem.type === AnalysisType.PROS_CONS ? 'Pros & Cons' : rightItem.type === AnalysisType.COMPARISON ? 'Comparison Table' : 'SWOT Analysis'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(rightItem.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 leading-tight">
                                  {rightItem.topic}
                                </h4>
                                {rightItem.context && (
                                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-full truncate" title={rightItem.context}>
                                    Context: {rightItem.context}
                                  </p>
                                )}
                              </div>

                              <div className="pt-4 space-y-3">
                                <span className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                                  AI Verdict
                                </span>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <p className="text-xs text-slate-600 leading-relaxed italic">
                                    "{rightItem.result.verdict}"
                                  </p>
                                </div>
                              </div>

                              <div className="pt-4 space-y-4">
                                <span className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                                  Option Probabilities
                                </span>
                                <div className="space-y-3.5">
                                  {rightItem.result.successProbabilities && rightItem.result.successProbabilities.length > 0 ? (
                                    rightItem.result.successProbabilities.map((prob, idx) => (
                                      <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-baseline gap-2">
                                          <span className="text-xs font-bold text-slate-700 truncate max-w-[75%]" title={prob.option}>
                                            {prob.option}
                                          </span>
                                          <span className={`text-xs font-extrabold ${
                                            prob.probability >= 80 ? 'text-emerald-600' :
                                            prob.probability >= 55 ? 'text-indigo-600' : 'text-rose-500'
                                          }`}>
                                            {prob.probability}%
                                          </span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${
                                              prob.probability >= 80 ? 'bg-emerald-500' :
                                              prob.probability >= 55 ? 'bg-indigo-500' : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${prob.probability}%` }}
                                          />
                                        </div>
                                        {prob.rationale && (
                                          <p className="text-[11px] text-slate-500 italic pl-1 leading-normal">
                                            "{prob.rationale}"
                                          </p>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[11px] text-slate-400 italic">No direct option probabilities for this analysis method. See verdict.</div>
                                  )}
                                </div>
                              </div>

                              {rightItem.result.confidenceScore !== undefined && (
                                <div className="pt-4 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Certainty
                                  </span>
                                  <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
                                    rightItem.result.confidenceScore >= 80 ? 'bg-emerald-50 text-emerald-700' :
                                    rightItem.result.confidenceScore >= 55 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {rightItem.result.confidenceScore}%
                                  </span>
                                </div>
                              )}

                              <div className="pt-4 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteHistory(rightItem.id, e)}
                                  className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors text-[11px] font-semibold cursor-pointer"
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
                          <Info size={24} className="mb-2 text-slate-300" />
                          <p className="text-xs">No decision selected.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {!isCompareMode && !result && !isLoading && !error && (
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

              {!isCompareMode && isLoading && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-6 md:p-12"
                >
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-indigo-50 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing Decision Parameters</h3>
                  <p className="text-slate-500 text-sm mb-6 max-w-sm text-center">
                    Generating a multi-dimensional assessment via Gemini AI decision modeling.
                  </p>

                  {/* Indeterminate moving progress indicator bar */}
                  <div className="w-full max-w-sm bg-slate-100 h-1.5 rounded-full overflow-hidden mb-8 relative">
                    <motion.div 
                      className="bg-indigo-600 h-full rounded-full absolute top-0 left-0"
                      initial={{ left: "-40%", width: "40%" }}
                      animate={{ left: "100%" }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5, 
                        ease: "easeInOut" 
                      }}
                    />
                  </div>

                  {/* Dynamic Step-Based Status Indicators */}
                  <div className="w-full max-w-md space-y-3.5 text-left border border-slate-100 bg-white p-6 rounded-2xl shadow-sm">
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-50 pb-2">
                      Model Thinking Trace
                    </div>
                    {loadingSteps.map((step, index) => {
                      const isCompleted = index < loadingStep;
                      const isActive = index === loadingStep;
                      return (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="relative flex items-center justify-center shrink-0 mt-1">
                            {isCompleted ? (
                              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                            ) : isActive ? (
                              <span className="relative flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-600"></span>
                              </span>
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                            )}
                          </div>
                          <span className={`text-xs md:text-sm transition-all leading-normal ${
                            isCompleted ? 'text-slate-400 line-through' :
                            isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'
                          }`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {!isCompareMode && error && (
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

              {!isCompareMode && result && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                        <Scale size={16} />
                        Analysis Result
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          copied
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-[#FDFCFB] hover:bg-slate-50 border-slate-200 text-slate-600 active:scale-95'
                        }`}
                        title="Copy formatted summary to clipboard"
                      >
                        {copied ? (
                          <>
                            <Check size={14} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy Summary
                          </>
                        )}
                      </button>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-6 leading-tight">{topic}</h2>
                    
                    {type === AnalysisType.PROS_CONS && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="flex items-center gap-2 font-bold text-emerald-600">
                            <CheckCircle2 size={18} /> Pros
                          </h4>
                          <ul className="space-y-3">
                            {((result as ProsConsResult).pros || []).map((pro, i) => (
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
                            {((result as ProsConsResult).cons || []).map((con, i) => (
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
                              {((result as ComparisonResult).headers || []).map((header, i) => (
                                <th key={i} className="py-4 px-4 font-bold text-slate-700 uppercase tracking-wider text-xs">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {((result as ComparisonResult).rows || []).map((row, i) => (
                              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                {((result as ComparisonResult).headers || []).map((header, j) => (
                                  <td key={j} className="py-4 px-4 text-slate-600 leading-relaxed">
                                    {row[header] !== undefined 
                                      ? row[header] 
                                      : (row[header.toLowerCase()] !== undefined 
                                          ? row[header.toLowerCase()] 
                                          : (row[Object.keys(row)[j]] || ""))}
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
                              {(section.items || []).map((item, i) => (
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

                  {/* Confidence and Probability metrics */}
                  {((result?.confidenceScore !== undefined) || (result?.successProbabilities && result.successProbabilities.length > 0)) && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="grid grid-cols-1 md:grid-cols-12 gap-6"
                    >
                      {/* Overall Confidence Score */}
                      {result?.confidenceScore !== undefined && (
                        <div className="md:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                          <div>
                            <div className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">
                              Overall Confidence
                            </div>
                            <div className="relative flex items-center justify-center py-4">
                              <div className="text-center">
                                <span className={`text-5xl font-black tracking-tighter ${
                                  result.confidenceScore >= 80 ? 'text-emerald-600' :
                                  result.confidenceScore >= 55 ? 'text-indigo-600' : 'text-rose-500'
                                }`}>
                                  {result.confidenceScore}%
                                </span>
                                <div className="text-xs font-semibold text-slate-500 mt-2">
                                  Model Certainty
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                result.confidenceScore >= 80 ? 'bg-emerald-500' :
                                result.confidenceScore >= 55 ? 'bg-indigo-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${result.confidenceScore}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Success Probabilities of Options */}
                      {result?.successProbabilities && result.successProbabilities.length > 0 && (
                        <div className="md:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px]">
                          <div>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                              <div className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                                Probability of Success
                              </div>
                              <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => setViewMode('chart')}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === 'chart'
                                      ? 'bg-white text-indigo-600 shadow-sm'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  <BarChart4 size={14} /> Chart View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewMode('list')}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === 'list'
                                      ? 'bg-white text-indigo-600 shadow-sm'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  <List size={14} /> Brief Rationale
                                </button>
                              </div>
                            </div>

                            {viewMode === 'chart' ? (
                              <div className="w-full h-64 mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={result.successProbabilities.map(p => ({
                                      name: p.option,
                                      probability: p.probability,
                                      rationale: p.rationale,
                                      shortName: p.option.length > 18 ? p.option.slice(0, 16) + '...' : p.option
                                    }))}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                      dataKey="shortName" 
                                      stroke="#94a3b8" 
                                      fontSize={11} 
                                      tickLine={false}
                                      axisLine={false}
                                    />
                                    <YAxis 
                                      stroke="#94a3b8" 
                                      fontSize={11} 
                                      tickLine={false} 
                                      axisLine={false}
                                      domain={[0, 100]}
                                      tickFormatter={(v) => `${v}%`}
                                    />
                                    <Tooltip
                                      cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          return (
                                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs max-w-xs">
                                              <p className="font-bold mb-1">{data.name}</p>
                                              <p className="text-indigo-300 font-extrabold mb-1">
                                                Probability: {data.probability}%
                                              </p>
                                              {data.rationale && (
                                                <p className="text-slate-400 font-normal italic mt-1 leading-relaxed">
                                                  "{data.rationale}"
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Bar 
                                      dataKey="probability" 
                                      radius={[6, 6, 0, 0]} 
                                      maxBarSize={48}
                                    >
                                      {result.successProbabilities.map((entry, index) => {
                                        const color = entry.probability >= 80 ? '#10b981' : entry.probability >= 55 ? '#6366f1' : '#f43f5e';
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                      })}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {result.successProbabilities.map((probItem, index) => (
                                  <div key={index} className="space-y-1.5">
                                    <div className="flex justify-between items-baseline">
                                      <div className="font-bold text-slate-800 text-sm">{probItem.option}</div>
                                      <div className={`text-sm font-extrabold ${
                                        probItem.probability >= 80 ? 'text-emerald-600' :
                                        probItem.probability >= 55 ? 'text-indigo-600' : 'text-rose-500'
                                      }`}>
                                        {probItem.probability}%
                                      </div>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                          probItem.probability >= 80 ? 'bg-emerald-500' :
                                          probItem.probability >= 55 ? 'bg-indigo-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${probItem.probability}%` }}
                                      />
                                    </div>
                                    {probItem.rationale && (
                                      <p className="text-xs text-slate-500 italic leading-relaxed pl-1">
                                        {probItem.rationale}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

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
