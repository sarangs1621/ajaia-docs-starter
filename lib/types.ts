export type DocumentRole = "viewer" | "commenter" | "editor" | "admin";

export type DocumentRecord = {
  id: string;
  title: string;
  content: Record<string, unknown>;
  owner_id: string;
  updated_at: string;
};

export type WorkspaceDocument = DocumentRecord & {
  access: "owned" | "shared";
  permission?: DocumentRole;
};

export type SharedPerson = {
  id: string;
  email: string;
  display_name: string;
  permission: DocumentRole;
  created_at: string;
};

export type DocumentComment = {
  id: string;
  document_id: string;
  author_id: string;
  author_name: string;
  author_email: string;
  text: string;
  created_at: string;
  resolved?: boolean;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  title: string;
  content: Record<string, unknown>;
  author_name: string;
  created_at: string;
  word_count: number;
};

export type CollaboratorPresence = {
  id: string;
  name: string;
  email: string;
  color: string;
  status: "editing" | "viewing";
  lastActive: string;
};

