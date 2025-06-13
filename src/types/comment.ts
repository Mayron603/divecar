
export interface Comment {
  id: string;
  investigationId: string;
  authorName: string;
  content: string;
  createdAt: string; // ISO string
}

export interface CommentInput {
  investigationId: string;
  authorName: string;
  content: string;
}
