import { TreeNodeData } from './types';
import { TREE_DATA } from './data';

export type StepAction = 
  | { type: 'VISIT_NODE'; id: string; alpha: string; beta: string; nodeType: 'MAX' | 'MIN' | 'LEAF' }
  | { type: 'EVALUATE_LEAF'; id: string; value: number }
  | { type: 'UPDATE_ALPHA'; id: string; newAlpha: string }
  | { type: 'UPDATE_BETA'; id: string; newBeta: string }
  | { type: 'RETURN_VALUE'; id: string; value: string }
  | { type: 'PRUNE_BRANCH'; id: string; parentId: string }
  | { type: 'MESSAGE'; message: string; id?: string };

export function calculateTruthData(root: TreeNodeData): Record<string, TruthRecord> {
  const truth: Record<string, TruthRecord> = {};
  
  const alphaBeta = (node: TreeNodeData, alpha: number, beta: number, isPruned: boolean): number => {
    if (isPruned) {
      truth[node.id] = { pruned: true, alphas: [], betas: [], v: '' };
      if (node.children) {
        node.children.forEach(c => alphaBeta(c, alpha, beta, true));
      }
      return 0; 
    }

    if (node.type === 'LEAF') {
      truth[node.id] = { pruned: false };
      return node.value!;
    }

    const currentAlphas: string[] = [alpha === -Infinity ? '-∞' : alpha.toString()];
    const currentBetas: string[] = [beta === Infinity ? '+∞' : beta.toString()];
    
    if (node.type === 'MAX') {
      let v = -Infinity;
      let prunedFromHere = false;
      for (const child of node.children || []) {
        const val = alphaBeta(child, alpha, beta, prunedFromHere);
        if (!prunedFromHere) {
          if (val > v) v = val;
          if (v > alpha) {
            alpha = v;
            currentAlphas.push(alpha.toString());
          }
          if (alpha >= beta) prunedFromHere = true;
        }
      }
      truth[node.id] = { 
        alphas: currentAlphas, 
        betas: currentBetas, 
        v: v.toString(), 
        pruned: false 
      };
      return v;
    } else {
      let v = Infinity;
      let prunedFromHere = false;
      for (const child of node.children || []) {
        const val = alphaBeta(child, alpha, beta, prunedFromHere);
        if (!prunedFromHere) {
          if (val < v) v = val;
          if (v < beta) {
            beta = v;
            currentBetas.push(beta.toString());
          }
          if (alpha >= beta) prunedFromHere = true;
        }
      }
      truth[node.id] = { 
        alphas: currentAlphas, 
        betas: currentBetas, 
        v: v.toString(), 
        pruned: false 
      };
      return v;
    }
  };

  alphaBeta(root, -Infinity, Infinity, false);
  return truth;
}

export function generateAlphaBetaSteps(root: TreeNodeData): StepAction[] {
  const steps: StepAction[] = [];
  
  const alphaBeta = (node: TreeNodeData, alpha: number, beta: number): number => {
    const alphaStr = alpha === -Infinity ? '-∞' : alpha.toString();
    const betaStr = beta === Infinity ? '+∞' : beta.toString();
    
    steps.push({ type: 'VISIT_NODE', id: node.id, alpha: alphaStr, beta: betaStr, nodeType: node.type });
    
    if (node.type === 'LEAF') {
      steps.push({ type: 'EVALUATE_LEAF', id: node.id, value: node.value! });
      steps.push({ type: 'MESSAGE', message: `Tại lá ${node.id}: giá trị = ${node.value}`, id: node.id });
      steps.push({ type: 'RETURN_VALUE', id: node.id, value: node.value!.toString() });
      return node.value!;
    }

    if (node.type === 'MAX') {
      let v = -Infinity;
      for (let i = 0; i < node.children!.length; i++) {
        const child = node.children![i];
        const val = alphaBeta(child, alpha, beta);
        if (val > v) {
            v = val;
            steps.push({ type: 'MESSAGE', message: `Tại ${node.id} (MAX): cập nhật v = ${v}`, id: node.id });
        }
        if (v > alpha) {
          alpha = v;
          steps.push({ type: 'UPDATE_ALPHA', id: node.id, newAlpha: alpha.toString() });
          steps.push({ type: 'MESSAGE', message: `Tại ${node.id} (MAX): cập nhật α = ${alpha}`, id: node.id });
        }
        if (alpha >= beta) {
          steps.push({ type: 'MESSAGE', message: `Cắt tỉa tại ${node.id}: vì α (${alpha}) ≥ β (${beta === Infinity ? '+∞' : beta})`, id: node.id });
          // Prune remaining children
          for (let j = i + 1; j < node.children!.length; j++) {
            steps.push({ type: 'PRUNE_BRANCH', id: node.children![j].id, parentId: node.id });
          }
          break;
        }
      }
      steps.push({ type: 'RETURN_VALUE', id: node.id, value: v.toString() });
      return v;
    } else {
      let v = Infinity;
      for (let i = 0; i < node.children!.length; i++) {
        const child = node.children![i];
        const val = alphaBeta(child, alpha, beta);
        if (val < v) {
            v = val;
            steps.push({ type: 'MESSAGE', message: `Tại ${node.id} (MIN): cập nhật v = ${v}`, id: node.id });
        }
        if (v < beta) {
          beta = v;
          steps.push({ type: 'UPDATE_BETA', id: node.id, newBeta: beta.toString() });
          steps.push({ type: 'MESSAGE', message: `Tại ${node.id} (MIN): cập nhật β = ${beta}`, id: node.id });
        }
        if (alpha >= beta) {
          steps.push({ type: 'MESSAGE', message: `Cắt tỉa tại ${node.id}: vì α (${alpha === -Infinity ? '-∞' : alpha}) ≥ β (${beta})`, id: node.id });
          for (let j = i + 1; j < node.children!.length; j++) {
            steps.push({ type: 'PRUNE_BRANCH', id: node.children![j].id, parentId: node.id });
          }
          break;
        }
      }
      steps.push({ type: 'RETURN_VALUE', id: node.id, value: v.toString() });
      return v;
    }
  };

  alphaBeta(root, -Infinity, Infinity);
  return steps;
}
