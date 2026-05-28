import React from 'react';
import { Scissors } from 'lucide-react';
import { NodeState, TruthRecord } from '../types';

interface Props {
  id: string;
  value: number;
  state: NodeState;
  truth: TruthRecord;
  onUpdate: (partial: Partial<NodeState>) => void;
  showResults: boolean;
  isActive?: boolean;
  isStepMode?: boolean;
}

export default function LeafNode({ id, value, state, truth, onUpdate, showResults, isActive, isStepMode }: Props) {
  if (!state) return null;
  let isCorrect = true;
  let err = '';

  if (showResults) {
    if (state.isPruned !== truth.pruned) {
       isCorrect = false;
       err = `ĐA: ${truth.pruned ? 'Cắt' : 'Ko'}`;
    }
  }

  return (
    <div className={`relative flex flex-col items-center gap-1 mt-2 text-slate-300 transition-all ${isActive ? 'scale-110 z-30 transform-gpu' : ''}`}>
       <button 
          onClick={() => onUpdate({ isPruned: !state.isPruned })}
          disabled={isStepMode}
          className={`absolute -top-3 -right-3 z-20 p-1 rounded-full shadow-lg border transition-all ${
            state.isPruned ? 'bg-rose-500 text-white border-rose-600 outline outline-2 outline-[#0F1115]' : 'bg-[#1E293B] text-slate-400 hover:text-rose-400 border-[#334155]'
          }`}
          title="Toggle Prune"
       >
          <Scissors size={10} />
       </button>
       <div 
         id={`node-${id}`} 
         className={`w-10 h-10 flex items-center justify-center font-bold text-sm bg-[#1E293B] border rounded transition-all duration-300 ${
            isActive ? 'ring-2 ring-indigo-500/50 border-indigo-400 text-indigo-300 bg-indigo-500/10' : state.isPruned ? 'opacity-40 grayscale border-slate-700 text-slate-500' : 'border-[#334155] shadow-lg text-emerald-100'
         } ${showResults && !isCorrect ? 'border-rose-500 bg-rose-500/20' : ''} ${showResults && isCorrect ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)] text-emerald-300' : ''}`}
       >
         {value}
       </div>
       {showResults && !isCorrect && (
          <div className="absolute top-12 whitespace-nowrap bg-rose-900/90 text-rose-200 text-[9px] px-1.5 py-0.5 rounded shadow-md border border-rose-700/50 z-50 pointer-events-none backdrop-blur-sm">
             {err}
          </div>
       )}
    </div>
  );
}
