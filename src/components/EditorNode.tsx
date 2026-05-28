import React from 'react';
import { Plus, Trash2, Hash } from 'lucide-react';
import { TreeNodeData } from '../types';
import { useTreeStore } from '../store';

interface Props {
  node: TreeNodeData;
}

export default function EditorNode({ node }: Props) {
  const { addChild, updateNode, removeChild, treeData } = useTreeStore();
  const isRoot = node.id === treeData.id;

  const handleValueChange = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num)) {
      updateNode(node.id, { value: num, type: 'LEAF' });
    } else if (val === '') {
      updateNode(node.id, { value: undefined, type: node.children && node.children.length > 0 ? node.type : 'MAX' });
    }
  };

  const toggleType = () => {
    const nextType = node.type === 'MAX' ? 'MIN' : 'MAX';
    updateNode(node.id, { type: nextType });
  };

  const findParentId = (root: TreeNodeData, targetId: string): string | null => {
    if (root.children) {
      if (root.children.some(c => c.id === targetId)) return root.id;
      for (const child of root.children) {
        const parentId = findParentId(child, targetId);
        if (parentId) return parentId;
      }
    }
    return null;
  };

  const handleRemove = () => {
    const parentId = findParentId(treeData, node.id);
    if (parentId) {
      removeChild(parentId, node.id);
    }
  };

  const isLeaf = node.type === 'LEAF' || (node.value !== undefined);

  return (
    <div id={`node-${node.id}`} className="relative flex flex-col items-center group">
      <div className={`bg-[#111827] rounded-lg border-2 shadow-xl transition-all w-28 overflow-hidden border-[#334155] group-hover:border-indigo-500/50`}>
        <div className={`w-full flex items-center justify-between px-2 py-1 font-bold border-b text-[10px] ${
          node.type === 'MAX' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
          node.type === 'MIN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
          'bg-slate-800 text-slate-300 border-slate-700'
        }`}>
          <button onClick={toggleType} disabled={isLeaf && node.value !== undefined} className="hover:opacity-80 transition-opacity">
            {node.type === 'MAX' ? '▲ MAX' : node.type === 'MIN' ? '▼ MIN' : '● LEAF'}
          </button>
          {!isRoot && (
            <button onClick={handleRemove} className="text-slate-500 hover:text-rose-500 transition-colors">
              <Trash2 size={10} />
            </button>
          )}
        </div>

        <div className="p-2 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 bg-[#0F1115] rounded border border-[#334155] px-1.5 py-1 focus-within:border-emerald-500/50 transition-colors">
            <Hash size={10} className="text-slate-500" />
            <input 
              type="text"
              value={node.value !== undefined ? node.value : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Value"
              className="w-full bg-transparent text-[10px] font-mono text-emerald-300 outline-none"
            />
          </div>
        </div>
      </div>

      {(!isLeaf || (node.children && node.children.length > 0)) && (
        <button 
          onClick={() => addChild(node.id)}
          className="mt-2 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all scale-75 group-hover:scale-100 opacity-0 group-hover:opacity-100"
          title="Add Child"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}
