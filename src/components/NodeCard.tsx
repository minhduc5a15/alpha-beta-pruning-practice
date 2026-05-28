import React, { useState } from 'react';
import { Scissors, Undo2, Check } from 'lucide-react';
import { NodeState, TruthRecord } from '../types';

interface Props {
  id: string;
  type: 'MAX' | 'MIN';
  state: NodeState;
  truth: TruthRecord;
  onUpdate: (partial: Partial<NodeState>) => void;
  showResults: boolean;
  isActive?: boolean;
  isStepMode?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function NodeCard({ id, type, state, truth, onUpdate, showResults, isActive, isStepMode, onClick }: Props) {
  if (!state) return null;
  const handleAddAlpha = (val: string) => {
    if(!val) return;
    onUpdate({ alphas: [...state.alphas, val] });
  };
  const handleRemoveAlpha = () => {
    onUpdate({ alphas: state.alphas.slice(0, -1) });
  };

  const handleAddBeta = (val: string) => {
    if(!val) return;
    onUpdate({ betas: [...state.betas, val] });
  };
  const handleRemoveBeta = () => {
    onUpdate({ betas: state.betas.slice(0, -1) });
  };

  // Validation
  const errors: string[] = [];
  if (showResults) {
     if (state.isPruned !== truth.pruned) {
         errors.push(`Cắt tỉa sai. ĐA: ${truth.pruned ? 'Cắt' : 'Không'}`);
     }
     
     if (!truth.pruned || state.isPruned !== truth.pruned) {
         // Check values
         const clean = (s:string) => s.trim().replace(/\s/g, '');
         if (truth.v !== clean(state.v)) {
             errors.push(`v sai. ĐA: ${truth.v || 'rỗng'}`);
         }
         if (truth.alphas!.join(',') !== state.alphas.map(clean).join(',')) {
             errors.push(`α sai. ĐA: ${truth.alphas?.length ? truth.alphas.join('➔') : 'ø'}`);
         }
         if (truth.betas!.join(',') !== state.betas.map(clean).join(',')) {
             errors.push(`β sai. ĐA: ${truth.betas?.length ? truth.betas.join('➔') : 'ø'}`);
         }
     }
  }

  const isCorrect = showResults && errors.length === 0;
  const isWrong = showResults && errors.length > 0;

  return (
    <div className="relative w-[150px]">
       <button 
          onClick={(e) => { e.stopPropagation(); onUpdate({ isPruned: !state.isPruned }); }}
          disabled={isStepMode}
          className={`absolute -top-2.5 -right-2.5 z-20 p-1.5 rounded-full shadow-lg border transition-all ${
            state.isPruned ? 'bg-rose-500 text-white border-rose-600 outline outline-2 outline-[#0F1115]' : 'bg-[#1E293B] text-slate-400 hover:text-rose-400 border-[#334155]'
          }`}
          title="Mark as Pruned"
       >
          <Scissors size={12} />
       </button>

       <div 
         id={`node-${id}`} 
         onClick={onClick}
         className={`bg-[#111827] rounded-lg border shadow-xl transition-all duration-300 flex flex-col overflow-hidden backdrop-blur-sm ${
          isActive ? 'ring-2 ring-indigo-500/50 scale-105 z-30 transform-gpu' : ''
       } ${
          state.isPruned ? 'opacity-40 grayscale' : ''
       } ${isCorrect ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : isWrong ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : isActive ? 'border-indigo-400' : 'border-[#334155]'} ${!isStepMode ? 'cursor-pointer hover:border-slate-500' : ''}`}>
          <div className={`w-full flex items-center justify-center py-1 font-bold border-b text-xs ${
             type === 'MAX' ? isActive ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-[#1E293B] text-emerald-400 border-emerald-500/30' : isActive ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-[#1E293B] text-rose-400 border-rose-500/30'
          }`}>
             <span className="text-[8px] mr-1">{type === 'MAX' ? '▲' : '▼'}</span>
             {id} ({type})
          </div>

          <div className="p-2 flex flex-col gap-2 text-slate-300">
             {/* V */}
             <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400 w-3 text-[10px]">v:</span>
                <input 
                   disabled={state.isPruned || showResults || isStepMode}
                   value={state.v} 
                   onChange={e => onUpdate({ v: e.target.value })}
                   className="flex-1 min-w-0 border-b border-slate-600 px-1 py-0 text-xs font-semibold focus:border-emerald-500 outline-none disabled:opacity-50 bg-transparent text-center"
                   placeholder="?"
                />
             </div>

             {/* Alpha */}
             <div className="flex flex-col gap-0.5 border-t border-[#1E293B] pt-1">
                <div className="flex items-center">
                   <span className="font-bold text-slate-400 w-4 text-[10px]">α:</span>
                   <div className="flex flex-wrap gap-1 flex-1 items-center min-h-[18px]">
                      {state.alphas.length === 0 && <span className="text-slate-600 text-[9px] italic">ø</span>}
                      {state.alphas.map((a, i) => (
                         <span key={i} className={`text-[10px] ${i < state.alphas.length - 1 ? 'line-through text-slate-500' : 'font-bold text-emerald-400'}`}>{a}</span>
                      ))}
                   </div>
                </div>
                <InputActionBar onAdd={handleAddAlpha} onRemove={handleRemoveAlpha} disabled={state.isPruned || showResults || isStepMode} hasItems={state.alphas.length > 0} />
             </div>

             {/* Beta */}
             <div className="flex flex-col gap-0.5 border-t border-[#1E293B] pt-1">
                <div className="flex items-center">
                   <span className="font-bold text-slate-400 w-4 text-[10px]">β:</span>
                   <div className="flex flex-wrap gap-1 flex-1 items-center min-h-[18px]">
                      {state.betas.length === 0 && <span className="text-slate-600 text-[9px] italic">ø</span>}
                      {state.betas.map((b, i) => (
                         <span key={i} className={`text-[10px] ${i < state.betas.length - 1 ? 'line-through text-slate-500' : 'font-bold text-rose-400'}`}>{b}</span>
                      ))}
                   </div>
                </div>
                <InputActionBar onAdd={handleAddBeta} onRemove={handleRemoveBeta} disabled={state.isPruned || showResults || isStepMode} hasItems={state.betas.length > 0} />
             </div>
          </div>
       </div>

       {isWrong && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-rose-500/10 border border-rose-500/30 rounded-md p-1.5 shadow-lg z-50 text-[9px] text-rose-200 w-full backdrop-blur-md">
             <div className="font-bold border-b border-rose-500/30 pb-0.5 mb-1 text-rose-300">Đáp án:</div>
             <ul className="flex flex-col gap-0.5">
                {errors.map((err, i) => (
                   <li key={i} className="leading-tight">• {err}</li>
                ))}
             </ul>
          </div>
       )}
       {isCorrect && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-emerald-500/10 border border-emerald-500/30 rounded-md py-0.5 px-2 shadow-md z-50 text-[9px] text-emerald-300 font-bold flex items-center gap-1 backdrop-blur-md">
             <Check size={10}/> Đúng!
          </div>
       )}
    </div>
  );
}

function InputActionBar({ onAdd, onRemove, disabled, hasItems }: { onAdd:(v:string)=>void, onRemove:()=>void, disabled:boolean, hasItems:boolean }) {
   const [val, setVal] = useState('');
   return (
      <div className="flex items-stretch gap-1 mt-0.5">
         <input 
            value={val} onChange={e=>setVal(e.target.value)} 
            onKeyDown={e => { if(e.key === 'Enter' && val) { onAdd(val); setVal(''); } }}
            disabled={disabled}
            className="w-8 border-b border-slate-600 px-0.5 text-[10px] text-center focus:border-emerald-500 outline-none disabled:opacity-50 bg-transparent text-slate-300 font-mono"
            placeholder="..."
         />
         <button onClick={() => { if(val){ onAdd(val); setVal(''); } }} disabled={disabled || !val} className="bg-[#1E293B] hover:bg-emerald-900/40 disabled:opacity-50 border border-[#334155] rounded px-1 text-emerald-400 font-bold text-[10px]" title="Thêm">
            +
         </button>
         <div className="w-px bg-slate-700 mx-0.5"></div>
         <button onClick={() => onAdd('-∞')} disabled={disabled} className="bg-[#1E293B] hover:bg-emerald-900/40 disabled:opacity-50 border border-[#334155] rounded px-0.5 text-[9px] font-mono whitespace-nowrap text-emerald-400">-∞</button>
         <button onClick={() => onAdd('+∞')} disabled={disabled} className="bg-[#1E293B] hover:bg-rose-900/40 disabled:opacity-50 border border-[#334155] rounded px-0.5 text-[9px] font-mono whitespace-nowrap text-rose-400">+∞</button>
         <div className="flex-1"></div>
         <button onClick={onRemove} disabled={disabled || !hasItems} className="text-slate-500 hover:text-rose-400 disabled:opacity-30 p-0.5" title="Xóa bước cuối">
            <Undo2 size={10}/>
         </button>
      </div>
   )
}
