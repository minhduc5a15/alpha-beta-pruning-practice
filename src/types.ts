export interface TreeNodeData {
  id: string;
  type: 'MAX' | 'MIN' | 'LEAF';
  value?: number;
  children?: TreeNodeData[];
}

export interface NodeState {
  v: string;
  alphas: string[];
  betas: string[];
  isPruned: boolean;
}

export interface TruthRecord {
  alphas?: string[];
  betas?: string[];
  v?: string;
  pruned: boolean;
}
