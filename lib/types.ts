export type DocumentRecord = {
  id: string;
  title: string;
  content: Record<string, unknown>;
  owner_id: string;
  updated_at: string;
};

export type WorkspaceDocument = DocumentRecord & {
  access: "owned" | "shared";
  permission?: "viewer" | "editor";
};

export type SharedPerson = {
  id: string;
  email: string;
  display_name: string;
  permission: "viewer" | "editor";
  created_at: string;
};
