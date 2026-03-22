export interface NodeContent {
  definition: string;
  explanation: string;
  example: string;
  application: string;
  mistake: string;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  level: number;
  parentId: string | null;
  content: NodeContent;
  version: number;
}
