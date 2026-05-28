/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { RotateCcw, FastForward, Edit3, Trash2, Home, CheckCircle2, Code, X, Dices, Settings2, PlayCircle, Hammer } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { getInitialState } from './data';
import { NodeState, TreeNodeData, TruthRecord } from './types';
import NodeCard from './components/NodeCard';
import LeafNode from './components/LeafNode';
import EditorNode from './components/EditorNode';
import { generateAlphaBetaSteps, StepAction, calculateTruthData } from './engine';
import { useTreeStore } from './store';

interface AppProps {
  mode: 'practice' | 'editor';
}

export default function App({ mode }: AppProps) {
  const { 
    treeData, 
    clearTree, 
    resetToExample, 
    generateRandomTree, 
    randomConfig, 
    setRandomConfig 
  } = useTreeStore();

  const [userStates, setUserStates] = useState<Record<string, NodeState>>(getInitialState(treeData));
  const [truthData, setTruthData] = useState<Record<string, TruthRecord>>(calculateTruthData(treeData));
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{x1:number, y1:number, x2:number, y2:number, pruned:boolean}[]>([]);

  // Auto Run States
  const [isStepMode, setIsStepMode] = useState(false);
  const [steps, setSteps] = useState<StepAction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [logs, setLogs] = useState<{message: string, id: number}[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Tree Input States
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isRandomConfigOpen, setIsRandomConfigOpen] = useState(false);
  const [inputText, setInputText] = useState(JSON.stringify(treeData, null, 2));
  const [inputError, setInputError] = useState<string | null>(null);

  const isEditorMode = mode === 'editor';

  useEffect(() => {
    setInputText(JSON.stringify(treeData, null, 2));
  }, [treeData]);

  const handleApplyTree = () => {
    try {
      const parsed = JSON.parse(inputText);
      if (!parsed.id || !parsed.type) throw new Error("Cấu trúc cây không hợp lệ (thiếu id hoặc type)");
      useTreeStore.getState().setTreeData(parsed);
      setIsInputOpen(false);
      setInputError(null);
    } catch (e: any) {
      setInputError(e.message);
    }
  };

  useEffect(() => {
    setUserStates(getInitialState(treeData));
    setTruthData(calculateTruthData(treeData));
    setShowResults(false);
    setIsStepMode(false);
    setSteps([]);
    setCurrentStepIndex(-1);
    setLogs([]);
    setActiveNodeId(null);
  }, [treeData]);

  useEffect(() => {
    if (activeNodeId) {
      const element = document.getElementById(`node-${activeNodeId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [activeNodeId]);

  const resetAll = () => {
     setUserStates(getInitialState(treeData));
     setShowResults(false);
     setIsStepMode(false);
     setSteps([]);
     setCurrentStepIndex(-1);
     setLogs([]);
     setActiveNodeId(null);
  };

  const startStepMode = () => {
    resetAll();
    const newSteps = generateAlphaBetaSteps(treeData);
    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsStepMode(true);
  };

  useEffect(() => {
    if (!isStepMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentStepIndex(prev => Math.min(steps.length, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStepMode, steps.length]);

  useEffect(() => {
    if (!isStepMode) return;

    const nextStates: Record<string, NodeState> = getInitialState(treeData);
    const nextLogs: {message: string, id: number}[] = [];
    let actNodeId: string | null = null;

    for (let i = 0; i < currentStepIndex; i++) {
        const step = steps[i];
        let newLog = '';
        switch (step.type) {
          case 'VISIT_NODE':
            actNodeId = step.id;
            if (nextStates[step.id]) {
                nextStates[step.id].alphas = [step.alpha];
                nextStates[step.id].betas = [step.beta];
            }
            break;
          case 'EVALUATE_LEAF':
            actNodeId = step.id;
            break;
          case 'UPDATE_ALPHA':
            actNodeId = step.id;
            if (nextStates[step.id]) {
                const currentAlphas = [...nextStates[step.id].alphas];
                if (currentAlphas[currentAlphas.length - 1] !== step.newAlpha) {
                    currentAlphas.push(step.newAlpha);
                }
                nextStates[step.id].alphas = currentAlphas;
            }
            break;
          case 'UPDATE_BETA':
            actNodeId = step.id;
            if (nextStates[step.id]) {
                const currentBetas = [...nextStates[step.id].betas];
                if (currentBetas[currentBetas.length - 1] !== step.newBeta) {
                    currentBetas.push(step.newBeta);
                }
                nextStates[step.id].betas = currentBetas;
            }
            break;
          case 'RETURN_VALUE':
            if (nextStates[step.id]) {
                nextStates[step.id].v = step.value;
            }
            actNodeId = step.id;
            break;
          case 'PRUNE_BRANCH':
            actNodeId = step.parentId;
            const markPruned = (nId: string) => {
                if (nextStates[nId]) nextStates[nId].isPruned = true;
                const pruneRecursive = (tNode: TreeNodeData, target: string, inTarget = false) => {
                   if (tNode.id === target) inTarget = true;
                   if (inTarget && nextStates[tNode.id]) nextStates[tNode.id].isPruned = true;
                   if (tNode.children) {
                      tNode.children.forEach(c => pruneRecursive(c, target, inTarget));
                   }
                };
                pruneRecursive(treeData, nId);
            };
            markPruned(step.id);
            break;
          case 'MESSAGE':
            newLog = step.message;
            if (step.id) actNodeId = step.id;
            break;
        }
        if (newLog) {
           nextLogs.push({ message: newLog, id: i });
        }
    }

    setUserStates(nextStates);
    setLogs(nextLogs);
    setActiveNodeId(actNodeId);
  }, [currentStepIndex, isStepMode, steps, treeData]);

  const handleUpdateNode = (id: string, partial: Partial<NodeState>) => {
     setUserStates(prev => ({ ...prev, [id]: { ...prev[id], ...partial } }));
     setShowResults(false);
  };

  const drawLines = () => {
    if (!containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const newLines: any[] = [];

    const traverse = (node: TreeNodeData) => {
       if (node.children) {
          node.children.forEach(child => {
             const p1 = document.getElementById(`node-${node.id}`);
             const p2 = document.getElementById(`node-${child.id}`);
             if (p1 && p2) {
                const b1 = p1.getBoundingClientRect();
                const b2 = p2.getBoundingClientRect();
                newLines.push({
                   x1: b1.left + b1.width / 2 - container.left,
                   y1: b1.bottom - container.top,
                   x2: b2.left + b2.width / 2 - container.left,
                   y2: b2.top - container.top,
                   pruned: userStates[child.id]?.isPruned
                });
             }
             traverse(child);
          });
       }
    };
    traverse(treeData);
    setLines(newLines);
  };

  useLayoutEffect(() => {
     const timer = setTimeout(drawLines, 50);
     window.addEventListener('resize', drawLines);
     return () => {
         clearTimeout(timer);
         window.removeEventListener('resize', drawLines);
     };
  }, [userStates, showResults, treeData, isEditorMode]);

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
     e.stopPropagation();
     if (!isStepMode) {
        setActiveNodeId(id === activeNodeId ? null : id);
     }
  };

  const handleContainerClick = () => {
     if (!isStepMode) {
        setActiveNodeId(null);
     }
  };

  const renderTree = (node: TreeNodeData) => {
     return (
        <div key={node.id} className="flex flex-col items-center gap-8 relative w-fit">
           {isEditorMode ? (
              <EditorNode node={node} />
           ) : node.type === 'LEAF' ? (
              <LeafNode 
                 id={node.id} 
                 value={node.value!} 
                 state={userStates[node.id]} 
                 truth={truthData[node.id]}
                 onUpdate={(partial) => handleUpdateNode(node.id, partial)}
                 showResults={showResults}
                 isActive={activeNodeId === node.id}
                 isStepMode={isStepMode}
                 onClick={!isStepMode ? (e) => handleNodeClick(e, node.id) : undefined}
              />
           ) : (
              <NodeCard 
                 id={node.id} 
                 type={node.type} 
                 state={userStates[node.id]} 
                 truth={truthData[node.id]}
                 onUpdate={(partial) => handleUpdateNode(node.id, partial)}
                 showResults={showResults}
                 isActive={activeNodeId === node.id}
                 isStepMode={isStepMode}
                 onClick={!isStepMode ? (e) => handleNodeClick(e, node.id) : undefined}
              />
           )}
           {node.children && node.children.length > 0 && (
              <div className="flex gap-4 justify-center min-w-max">
                 {node.children.map(renderTree)}
              </div>
           )}
        </div>
     );
  };

  if(!userStates || Object.keys(userStates).length === 0) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#0F1115] text-[#E2E8F0] font-sans overflow-hidden select-none" onClick={handleContainerClick}>
      <header className="p-3 border-b border-[#1E293B] bg-[#111827] flex justify-between items-center z-20 shrink-0">
         <div className="flex items-center gap-4">
            <div className="mr-2">
               <h1 className="text-lg font-semibold text-emerald-400 tracking-tight">Alpha-Beta Lab</h1>
               <div className="flex gap-2 mt-1">
                  <NavLink to="/practice" className={({isActive}) => `text-[10px] px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${isActive ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>
                    <PlayCircle size={10}/> LUYỆN TẬP
                  </NavLink>
                  <NavLink to="/editor" className={({isActive}) => `text-[10px] px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${isActive ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>
                    <Hammer size={10}/> THIẾT KẾ CÂY
                  </NavLink>
               </div>
            </div>

            <div className="h-8 w-px bg-slate-800 mx-2"></div>
            
            <div className="flex items-center gap-2">
                {isEditorMode && (
                  <button 
                    onClick={clearTree}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-all text-[11px] font-bold"
                  >
                    <Trash2 size={12}/> XÓA CÂY
                  </button>
                )}
                <button 
                  onClick={() => setIsInputOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-[#334155] text-slate-300 hover:text-emerald-400 transition-all text-[11px] font-bold"
                >
                  <Code size={12}/> JSON
                </button>
                <div className="flex items-center bg-slate-800 border border-[#334155] rounded overflow-hidden">
                  <button 
                    onClick={() => generateRandomTree()}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-emerald-400 transition-all text-[11px] font-bold border-r border-[#334155]"
                  >
                    <Dices size={12}/> NGẪU NHIÊN
                  </button>
                  <button 
                    onClick={() => setIsRandomConfigOpen(true)}
                    className="px-1.5 py-1 text-slate-400 hover:text-white transition-all bg-slate-700/50"
                  >
                    <Settings2 size={12}/>
                  </button>
                </div>
                <button 
                  onClick={resetToExample}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-[#334155] text-slate-300 hover:text-emerald-400 transition-all text-[11px] font-bold"
                >
                  <Home size={12}/> MẪU
                </button>
            </div>
         </div>

         <div className="flex items-center gap-4">
            {!isEditorMode && (
                <div className="flex items-center gap-2 border-l border-[#334155] pl-4">
                    <div className="flex gap-3 text-[10px] mr-2">
                        <div className="flex items-center gap-1.5"><div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-emerald-500"></div> <span className="text-slate-300">MAX</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-rose-500"></div> <span className="text-slate-300">MIN</span></div>
                    </div>

                    <button 
                        onClick={isStepMode ? () => setIsStepMode(false) : startStepMode}
                        className={`px-3 py-1.5 rounded text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                            isStepMode ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                    >
                        {isStepMode ? 'DỪNG BƯỚC' : <><FastForward size={14} fill="currentColor"/> CHẠY TỪNG BƯỚC</>}
                    </button>
                    
                    <button 
                        onClick={resetAll}
                        className="bg-[#1E293B] hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 border border-[#334155]"
                    >
                        <RotateCcw size={14} /> LÀM LẠI
                    </button>

                    <button 
                        onClick={() => { setIsStepMode(false); setShowResults(true); setTimeout(drawLines, 50); }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-xs font-bold shadow-lg transition-all flex items-center justify-center ml-2"
                    >
                        KIỂM TRA
                    </button>
                </div>
            )}
            {isEditorMode && (
              <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded flex items-center gap-3">
                <span className="text-[10px] font-bold text-amber-300 uppercase">Chế độ thiết kế</span>
                <NavLink to="/practice" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1 rounded text-[10px] font-bold transition-all">
                  XONG, LUYỆN TẬP NGAY
                </NavLink>
              </div>
            )}
         </div>
      </header>
      
      <main className="flex-1 overflow-auto relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:40px_40px]">
         <div className="min-w-max p-8 pb-24 pt-8 relative flex justify-center" ref={containerRef}>
             <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                 {lines.map((l, i) => (
                    <path 
                       key={i} 
                       d={`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`} 
                       stroke={l.pruned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)'} 
                       strokeWidth="2" 
                       strokeDasharray={l.pruned ? '4,4' : 'none'} 
                       fill="none" 
                       className="transition-all duration-300"
                    />
                 ))}
             </svg>
             
             <div className="relative z-10">
                 {renderTree(treeData)}
             </div>
         </div>

         {/* Random Config Modal */}
         {isRandomConfigOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#111827]">
                     <h2 className="font-bold text-slate-100 uppercase text-xs tracking-wider">Cấu hình Random</h2>
                     <button onClick={() => setIsRandomConfigOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={16} />
                     </button>
                  </div>
                  <div className="p-6 space-y-6">
                     <div className="space-y-3">
                        <div className="flex justify-between">
                           <label className="text-[10px] font-bold text-slate-400 uppercase">Độ sâu tối đa: {randomConfig.maxDepth}</label>
                        </div>
                        <input 
                           type="range" min="1" max="5" step="1" 
                           value={randomConfig.maxDepth}
                           onChange={(e) => setRandomConfig({...randomConfig, maxDepth: parseInt(e.target.value)})}
                           className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                     </div>
                     <div className="space-y-3">
                        <div className="flex justify-between">
                           <label className="text-[10px] font-bold text-slate-400 uppercase">Độ rộng tối đa: {randomConfig.maxBreadth}</label>
                        </div>
                        <input 
                           type="range" min="2" max="5" step="1" 
                           value={randomConfig.maxBreadth}
                           onChange={(e) => setRandomConfig({...randomConfig, maxBreadth: parseInt(e.target.value)})}
                           className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                     </div>
                  </div>
                  <div className="p-3 bg-[#111827] flex justify-end">
                     <button 
                        onClick={() => { generateRandomTree(); setIsRandomConfigOpen(false); }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-2"
                     >
                        <Dices size={12}/> TẠO CÂY MỚI
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* JSON Input Modal */}
         {isInputOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
               <div className="bg-[#111827] border border-[#334155] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#1E293B]">
                     <div className="flex items-center gap-2">
                        <Code size={18} className="text-emerald-400" />
                        <h2 className="font-bold text-slate-100 uppercase text-sm tracking-wider">Cấu hình cây bằng JSON</h2>
                     </div>
                     <button onClick={() => setIsInputOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                     </button>
                  </div>
                  
                  <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                     {/* Documentation Side */}
                     <div className="w-full md:w-64 bg-[#0F1115] border-r border-[#334155] p-4 overflow-y-auto text-[11px] text-slate-400">
                        <h3 className="text-emerald-400 font-bold mb-3 uppercase tracking-widest text-[10px]">Hướng dẫn định dạng</h3>
                        <div className="space-y-4">
                           <section>
                              <p className="font-bold text-slate-200 mb-1">Cấu trúc nút (Node):</p>
                              <ul className="list-disc list-inside space-y-1">
                                 <li><code className="text-emerald-300">id</code>: Chuỗi duy nhất (VD: "A", "Node1")</li>
                                 <li><code className="text-emerald-300">type</code>: <span className="text-slate-200">"MAX"</span>, <span className="text-slate-200">"MIN"</span> hoặc <span className="text-slate-200">"LEAF"</span></li>
                                 <li><code className="text-emerald-300">children</code>: Mảng các nút con (cho MAX/MIN)</li>
                                 <li><code className="text-emerald-300">value</code>: Giá trị số (chỉ dành cho LEAF)</li>
                              </ul>
                           </section>
                           <section>
                              <p className="font-bold text-slate-200 mb-1">Ví dụ tối giản:</p>
                              <pre className="bg-black/50 p-2 rounded text-[9px] text-emerald-400/80 leading-relaxed overflow-x-auto">
{`{
  "id": "A",
  "type": "MAX",
  "children": [
    {
      "id": "L1",
      "type": "LEAF",
      "value": 10
    },
    {
      "id": "L2",
      "type": "LEAF",
      "value": 5
    }
  ]
}`}
                              </pre>
                           </section>
                           <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-200/70 text-[10px]">
                              Lưu ý: Hệ thống sẽ tự động cập nhật ID ngẫu nhiên nếu bạn để trống ID khi vẽ tay, nhưng khi nhập JSON hãy đảm bảo ID là duy nhất.
                           </div>
                        </div>
                     </div>

                     {/* Editor Side */}
                     <div className="flex-1 flex flex-col overflow-hidden">
                        <textarea 
                           value={inputText}
                           onChange={(e) => setInputText(e.target.value)}
                           className="flex-1 w-full bg-[#0F1115] p-4 font-mono text-xs text-emerald-300 outline-none resize-none placeholder:text-slate-700"
                           placeholder="Dán mã JSON của cây vào đây..."
                        />
                        {inputError && (
                           <div className="px-4 py-2 bg-rose-500/20 border-t border-rose-500/30 text-rose-400 text-[10px] font-mono whitespace-pre-wrap">
                              Lỗi: {inputError}
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="p-3 bg-[#1E293B] border-t border-[#334155] flex justify-end gap-3">
                     <button 
                        onClick={() => setIsInputOpen(false)}
                        className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                     >
                        ĐÓNG
                     </button>
                     <button 
                        onClick={handleApplyTree}
                        className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                     >
                        <CheckCircle2 size={14} /> CẬP NHẬT CÂY
                     </button>
                  </div>
               </div>
            </div>
         )}
      </main>

      <footer className="h-32 bg-[#111827] border-t border-[#1E293B] p-3 flex gap-4 z-20 shrink-0">
        <div className="flex-1 bg-[#1E293B] rounded-lg p-2 border border-[#334155] flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-1 z-10 shrink-0">
             <h3 className="text-[10px] font-bold text-emerald-400 uppercase">Trạng thái Duyệt</h3>
             {isStepMode && (
                <div className="text-[9px] text-slate-400 font-medium bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                   Phím <span className="font-bold text-slate-200">←</span> / <span className="font-bold text-slate-200">→</span>
                </div>
             )}
          </div>
          <div className="space-y-0.5 overflow-y-auto flex-1 font-mono text-[10px] scroll-smooth pr-1" ref={el => {
             if (el) {
                el.scrollTop = el.scrollHeight;
             }
          }}>
            {logs.length === 0 && <div className="text-slate-500 italic mt-1 text-[10px]">
                {isEditorMode ? "Chế độ chỉnh sửa: Bấm (+) để thêm nút con hoặc nhập giá trị để tạo nút lá." : "Bấm 'CHẠY TỪNG BƯỚC' để xem."}
            </div>}
            {logs.map((log, i) => (
               <div key={log.id} className="flex gap-2 leading-tight">
                 <span className="text-slate-500 w-5 shrink-0">[{i + 1}]</span>
                 <span className={`${log.message.includes('Cắt tỉa') ? 'text-rose-400 font-bold' : log.message.includes('cập nhật') ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {log.message}
                 </span>
               </div>
            ))}
          </div>
        </div>
        <div className="w-56 flex flex-col gap-2">
          <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
              <span className="text-[9px] font-bold text-rose-300 uppercase">Cắt tỉa</span>
            </div>
            <p className="text-[9px] text-rose-200/60 leading-tight mt-1">Nếu α ≥ β, các nhánh còn lại bên phải sẽ không cần xét.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
