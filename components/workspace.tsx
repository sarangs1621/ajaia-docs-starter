"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  FilePlus2, FileText, Search, Upload, Users, Clock3, ChevronDown,
  MoreHorizontal, Sparkles, Command, PanelLeftClose, Share2, LogOut,
  X, ShieldCheck, LoaderCircle, Trash2, Download, UserX, MessageSquare,
  Clock, Check, Printer, Edit3, Eye, RotateCcw, Plus
} from "lucide-react";
import Editor from "@/components/editor";
import AuthScreen from "@/components/auth-screen";
import {
  EMPTY_DOCUMENT,
  supportedTextFile,
  textToDocument,
  documentToMarkdown,
  documentToPlainText,
} from "@/lib/document-content";
import { supabase } from "@/lib/supabase";
import type {
  SharedPerson,
  WorkspaceDocument,
  DocumentRole,
  DocumentComment,
  DocumentVersion,
  CollaboratorPresence,
} from "@/lib/types";

const DEMO_USER = { id: "demo-owner", name: "Sarang Nair", email: "sarang@example.com" };
const DEMO_COLLABORATOR = { id: "demo-collaborator", name: "Aditi Menon", email: "aditi@example.com" };
type DemoDoc = WorkspaceDocument;

function getCollaboratorColor(name: string): string {
  const colors = ["#4f46e5", "#059669", "#d97706", "#7c3aed", "#db2777", "#0284c7"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const initialComments: Record<string, DocumentComment[]> = {
  "welcome-doc": [
    {
      id: "comment-1",
      document_id: "welcome-doc",
      author_id: DEMO_COLLABORATOR.id,
      author_name: DEMO_COLLABORATOR.name,
      author_email: DEMO_COLLABORATOR.email,
      text: "Great overview! Should we add a quick tip about keyboard shortcuts (like ⌘B and ⌘I)?",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      resolved: false,
    },
    {
      id: "comment-2",
      document_id: "welcome-doc",
      author_id: DEMO_USER.id,
      author_name: DEMO_USER.name,
      author_email: DEMO_USER.email,
      text: "Good point, already added to the footer tip bar.",
      created_at: new Date(Date.now() - 1800000).toISOString(),
      resolved: true,
    },
  ],
  "product-brief": [
    {
      id: "comment-3",
      document_id: "product-brief",
      author_id: DEMO_USER.id,
      author_name: DEMO_USER.name,
      author_email: DEMO_USER.email,
      text: "Let's review the focus areas for Q4 before the Friday sync.",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      resolved: false,
    },
  ],
};

const initialDocs: DemoDoc[] = [
  {
    id: "welcome-doc", title: "Welcome to Ajaia", owner_id: DEMO_USER.id,
    updated_at: new Date().toISOString(), access: "owned", permission: "editor",
    content: {
      type: "doc", content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Make room for good work." }] },
        { type: "paragraph", content: [{ type: "text", text: "Ajaia is a calm space for ideas, plans, and shared work." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Start here" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Create a document and give it a clear title." }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Use the toolbar to format your ideas." }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Share a document with a teammate when it is ready." }] }] }
        ]},
        { type: "paragraph", content: [{ type: "text", text: "Connect Supabase to save documents between sessions and share them across accounts." }] }
      ]
    }
  },
  {
    id: "product-brief", title: "Product brief — Q4", owner_id: DEMO_COLLABORATOR.id,
    updated_at: new Date(Date.now() - 86400000).toISOString(), access: "shared", permission: "editor",
    content: {
      type: "doc", content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Product brief — Q4" }] },
        { type: "paragraph", content: [{ type: "text", text: "A shared example document to demonstrate the distinction between owned and shared work." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Focus areas" }] },
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Reduce friction in everyday workflows." }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Make ownership and access obvious." }] }] }
        ]}
      ]
    }
  }
];

const initialVersions: Record<string, DocumentVersion[]> = {
  "welcome-doc": [
    {
      id: "v-1",
      document_id: "welcome-doc",
      title: "Welcome to Ajaia · Initial Draft",
      content: initialDocs[0].content,
      author_name: "Sarang Nair",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      word_count: 58,
    },
  ],
  "product-brief": [
    {
      id: "v-2",
      document_id: "product-brief",
      title: "Product brief — Q4 · Draft v1",
      content: initialDocs[1].content,
      author_name: "Aditi Menon",
      created_at: new Date(Date.now() - 172800000).toISOString(),
      word_count: 42,
    },
  ],
};

function displayName(user: User) {
  const metadataName = user.user_metadata?.display_name;
  return typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : user.email?.split("@")[0] ?? "Ajaia user";
}

export default function Workspace() {
  const [documents, setDocuments] = useState<DemoDoc[]>(initialDocs);
  const [activeId, setActiveId] = useState("welcome-doc");
  const [query, setQuery] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<DocumentRole>("editor");
  const [shareNotice, setShareNotice] = useState("");
  const [sharedPeople, setSharedPeople] = useState<SharedPerson[]>([]);
  const [userMode, setUserMode] = useState<"owner" | "collaborator">("owner");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "local" | "error">("local");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DemoDoc | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccountBusy, setDeletingAccountBusy] = useState(false);
  const [authScreenMessage, setAuthScreenMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Real-time collaboration indicators
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);

  // Commenting and suggestion mode
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Record<string, DocumentComment[]>>(initialComments);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentFilter, setCommentFilter] = useState<"all" | "open" | "resolved">("open");
  const [editorMode, setEditorMode] = useState<"edit" | "suggest">("edit");

  // Version history
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<Record<string, DocumentVersion[]>>(initialVersions);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setNotice(`Could not restore session: ${error.message}`);
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const loadDocuments = useCallback(async (userId: string) => {
    if (!supabase) return;
    setLoadingDocs(true);
    try {
      const [ownedResult, sharesResult] = await Promise.all([
        supabase.from("documents").select("id,title,content,owner_id,updated_at").eq("owner_id", userId).order("updated_at", { ascending: false }),
        supabase.from("document_shares").select("document_id,permission").eq("shared_with_id", userId),
      ]);
      if (ownedResult.error) throw ownedResult.error;
      if (sharesResult.error) throw sharesResult.error;
      const sharedIds = (sharesResult.data ?? []).map((share) => share.document_id);
      let sharedDocs: Array<Record<string, unknown>> = [];
      if (sharedIds.length) {
        const { data, error } = await supabase.from("documents").select("id,title,content,owner_id,updated_at").in("id", sharedIds).order("updated_at", { ascending: false });
        if (error) throw error;
        sharedDocs = (data ?? []) as Array<Record<string, unknown>>;
      }
      const permissionById = new Map((sharesResult.data ?? []).map((share) => [share.document_id, (share.permission as DocumentRole) || "viewer"]));
      let mapped: DemoDoc[] = [
        ...((ownedResult.data ?? []).map((doc) => ({ ...doc, access: "owned" as const, permission: "editor" as const })) as DemoDoc[]),
        ...(sharedDocs.map((doc) => ({ ...doc, access: "shared" as const, permission: permissionById.get(String(doc.id)) ?? "viewer" })) as DemoDoc[]),
      ];
      if (!mapped.length) {
        const firstDoc = {
          id: crypto.randomUUID(), title: "Welcome to Ajaia", owner_id: userId,
          content: { type: "doc", content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Make room for good work." }] },
            { type: "paragraph", content: [{ type: "text", text: "This is your workspace. Start writing, then share your document with a teammate." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A few good next steps" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Write down the idea you do not want to lose." }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Use headings and lists to keep it readable." }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Share with a teammate when you are ready." }] }] }
            ]}
          ] },
        };
        const { data, error } = await supabase.from("documents").insert(firstDoc).select("id,title,content,owner_id,updated_at").single();
        if (error) throw error;
        mapped = [{ ...data, access: "owned", permission: "editor" } as DemoDoc];
      }
      setDocuments(mapped);
      setActiveId((previous) => mapped.some((doc) => doc.id === previous) ? previous : mapped[0].id);
      setSaveState("saved");
      setNotice("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unknown database error";
      setNotice(`Unable to load documents: ${message}. Check the SQL migration and Supabase keys.`);
    } finally { setLoadingDocs(false); }
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) return;
    setDocuments([]);
    setNotice("");
    void loadDocuments(session.user.id);
  }, [session?.user.id, loadDocuments]);

  useEffect(() => () => {
    Object.values(saveTimers.current).forEach((timer) => clearTimeout(timer));
  }, []);

  const authenticated = Boolean(supabase && session?.user);
  const remoteUser = session?.user;
  const currentUser = remoteUser
    ? { id: remoteUser.id, name: displayName(remoteUser), email: remoteUser.email ?? "" }
    : userMode === "owner" ? DEMO_USER : DEMO_COLLABORATOR;

  const visibleDocs = useMemo(() => {
    const current = documents.map((doc) => {
      if (authenticated) return doc;
      return { ...doc, access: (doc.owner_id === currentUser.id ? "owned" : "shared") as "owned" | "shared", permission: doc.permission ?? "editor" };
    });
    return current.filter((doc) => {
      const isVisible = authenticated ? true : (doc.owner_id === currentUser.id || doc.id === "welcome-doc" || doc.id === "product-brief");
      return isVisible && doc.title.toLowerCase().includes(query.toLowerCase());
    });
  }, [documents, query, authenticated, currentUser.id]);

  const activeDoc = visibleDocs.find((doc) => doc.id === activeId) ?? visibleDocs[0] ?? null;
  const canEdit = !activeDoc || (activeDoc.access === "owned" || activeDoc.permission === "editor" || activeDoc.permission === "admin");
  const canComment = !activeDoc || (activeDoc.access === "owned" || activeDoc.permission === "commenter" || activeDoc.permission === "editor" || activeDoc.permission === "admin");
  const canShare = !authenticated || (activeDoc?.access === "owned" || activeDoc?.permission === "admin");
  const canDelete = Boolean(activeDoc && (!authenticated ? activeDoc.owner_id === currentUser.id : (activeDoc.access === "owned" || activeDoc.permission === "admin")));

  // Real-time presence effect
  useEffect(() => {
    if (!activeDoc) return;
    if (authenticated && supabase) {
      const channel = supabase.channel(`presence:doc:${activeDoc.id}`, {
        config: { presence: { key: currentUser.id } },
      });
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const activeUsers: CollaboratorPresence[] = [];
          for (const key of Object.keys(state)) {
            const presences = state[key] as Array<Record<string, unknown>>;
            if (presences && presences.length > 0) {
              const p = presences[0];
              activeUsers.push({
                id: String(p.id || key),
                name: String(p.name || "Collaborator"),
                email: String(p.email || ""),
                color: String(p.color || getCollaboratorColor(String(p.name || ""))),
                status: (p.status as "editing" | "viewing") || "viewing",
                lastActive: String(p.lastActive || new Date().toISOString()),
              });
            }
          }
          if (activeUsers.length > 0) {
            setCollaborators(activeUsers);
          } else {
            setCollaborators([
              {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
                color: getCollaboratorColor(currentUser.name),
                status: canEdit ? "editing" : "viewing",
                lastActive: new Date().toISOString(),
              },
            ]);
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              color: getCollaboratorColor(currentUser.name),
              status: canEdit ? "editing" : "viewing",
              lastActive: new Date().toISOString(),
            });
          }
        });
      return () => {
        void channel.unsubscribe();
      };
    } else {
      const isOwner = userMode === "owner";
      setCollaborators([
        {
          id: currentUser.id,
          name: `${currentUser.name} (You)`,
          email: currentUser.email,
          color: getCollaboratorColor(currentUser.name),
          status: canEdit ? "editing" : "viewing",
          lastActive: new Date().toISOString(),
        },
        {
          id: isOwner ? DEMO_COLLABORATOR.id : DEMO_USER.id,
          name: isOwner ? DEMO_COLLABORATOR.name : DEMO_USER.name,
          email: isOwner ? DEMO_COLLABORATOR.email : DEMO_USER.email,
          color: getCollaboratorColor(isOwner ? DEMO_COLLABORATOR.name : DEMO_USER.name),
          status: "viewing",
          lastActive: new Date().toISOString(),
        },
      ]);
    }
  }, [activeDoc, authenticated, currentUser.id, currentUser.name, currentUser.email, canEdit, userMode]);

  // Comment memos
  const activeDocComments = useMemo(() => {
    if (!activeDoc) return [];
    return comments[activeDoc.id] || [];
  }, [activeDoc, comments]);

  const openComments = useMemo(() => {
    return activeDocComments.filter((c) => !c.resolved);
  }, [activeDocComments]);

  const filteredComments = useMemo(() => {
    if (commentFilter === "open") return activeDocComments.filter((c) => !c.resolved);
    if (commentFilter === "resolved") return activeDocComments.filter((c) => c.resolved);
    return activeDocComments;
  }, [activeDocComments, commentFilter]);

  // Version history memos
  const activeDocVersions = useMemo(() => {
    if (!activeDoc) return [];
    return versions[activeDoc.id] || [];
  }, [activeDoc, versions]);

  const activeVersionPreview = useMemo(() => {
    if (!selectedVersionId) return activeDocVersions[0] || null;
    return activeDocVersions.find((v) => v.id === selectedVersionId) || activeDocVersions[0] || null;
  }, [activeDocVersions, selectedVersionId]);

  const readingStats = useMemo(() => {
    if (!activeDoc) return { words: 0, minutes: 1 };
    const text = documentToPlainText(activeDoc.content);
    const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, minutes };
  }, [activeDoc]);

  const activeDocId = activeDoc?.id;
  const activeDocAccess = activeDoc?.access;

  useEffect(() => {
    if (!showShare || !supabase || !session?.user.id || !activeDocId || activeDocAccess !== "owned") {
      setSharedPeople([]); return;
    }
    let cancelled = false;
    void supabase.rpc("list_document_shares", { p_document_id: activeDocId }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setShareNotice(`Could not load access list: ${error.message}`); return; }
      setSharedPeople((data ?? []) as SharedPerson[]);
    });
    return () => { cancelled = true; };
  }, [showShare, session?.user.id, activeDocId, activeDocAccess]);

  async function createDocument() {
    const id = crypto.randomUUID();
    const doc: DemoDoc = {
      id, title: "Untitled document", owner_id: currentUser.id,
      updated_at: new Date().toISOString(), access: "owned", permission: "editor",
      content: structuredClone(EMPTY_DOCUMENT),
    };
    if (authenticated && supabase) {
      const { data, error } = await supabase.from("documents").insert({ id, title: doc.title, owner_id: currentUser.id, content: doc.content }).select("id,title,content,owner_id,updated_at").single();
      if (error) { setNotice(`Could not create document: ${error.message}`); return; }
      setDocuments((prev) => [{ ...data, access: "owned", permission: "editor" } as DemoDoc, ...prev]);
      setSaveState("saved");
      setNotice("Document created and saved.");
    } else {
      setDocuments((prev) => [doc, ...prev]);
      setSaveState("local");
      setNotice("New document created in demo mode. Add Supabase credentials to persist it after refresh.");
    }
    setActiveId(id);
  }

  function updateDocument(patch: Partial<DemoDoc>) {
    if (!activeDoc || !canEdit) return;
    const updated = { ...activeDoc, ...patch, updated_at: new Date().toISOString() };
    setDocuments((prev) => prev.map((doc) => doc.id === activeDoc.id ? updated : doc));
    if (!authenticated || !supabase) { setSaveState("local"); return; }
    setSaveState("saving");
    const client = supabase;
    const documentId = activeDoc.id;
    if (saveTimers.current[documentId]) clearTimeout(saveTimers.current[documentId]);
    saveTimers.current[documentId] = setTimeout(async () => {
      const { error } = await client.from("documents").update({ title: updated.title, content: updated.content }).eq("id", documentId);
      if (error) {
        setSaveState("error");
        setNotice(`Save failed: ${error.message}. Your latest edits remain on screen; retry by editing the document again.`);
      } else {
        setSaveState("saved");
      }
    }, 650);
  }

  async function importFile(file?: File) {
    if (!file) return;
    if (!supportedTextFile(file.name)) { setNotice("Unsupported file. Please choose a .txt or .md file."); return; }
    if (file.size > 1024 * 1024) { setNotice("File is too large. Maximum supported size is 1 MB."); return; }
    try {
      const text = await file.text();
      const id = crypto.randomUUID();
      const doc: DemoDoc = {
        id, title: file.name.replace(/\.(txt|md)$/i, "") || "Imported document", owner_id: currentUser.id,
        updated_at: new Date().toISOString(), access: "owned", permission: "editor", content: textToDocument(text),
      };
      if (authenticated && supabase) {
        const { data, error } = await supabase.from("documents").insert({ id, title: doc.title, owner_id: currentUser.id, content: doc.content }).select("id,title,content,owner_id,updated_at").single();
        if (error) throw error;
        setDocuments((prev) => [{ ...data, access: "owned", permission: "editor" } as DemoDoc, ...prev]);
        setSaveState("saved");
        setNotice(`Imported and saved ${file.name}.`);
      } else {
        setDocuments((prev) => [doc, ...prev]);
        setSaveState("local");
        setNotice(`Imported ${file.name}. Demo-mode documents reset when this page is refreshed.`);
      }
      setActiveId(id);
    } catch (cause) {
      setNotice(`Import failed: ${cause instanceof Error ? cause.message : "Could not read or save file."}`);
    }
  }

  async function shareDocument() {
    const email = shareEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setShareNotice("Enter a valid email address."); return; }
    if (!activeDoc) return;
    if (!authenticated || !supabase) {
      setShareNotice(`Demo only: ${activeDoc.title} is not actually shared. Connect Supabase and sign in to grant persistent access.`);
      return;
    }
    if (activeDoc.access !== "owned") { setShareNotice("Only the document owner can manage access."); return; }
    setSharingBusy(true); setShareNotice("");
    const { data, error } = await supabase.rpc("share_document_by_email", {
      p_document_id: activeDoc.id, p_email: email, p_permission: sharePermission,
    });
    setSharingBusy(false);
    if (error) { setShareNotice(error.message.includes("No account") ? "No Ajaia account uses that email yet. Ask them to create an account first." : `Could not share document: ${error.message}`); return; }
    setShareNotice(`Access granted to ${email} as ${sharePermission}.`);
    const { data: people, error: peopleError } = await supabase.rpc("list_document_shares", { p_document_id: activeDoc.id });
    if (!peopleError) setSharedPeople((people ?? []) as SharedPerson[]);
    void data;
  }

  async function revokeShare(email: string) {
    if (!supabase || !activeDoc || !authenticated) return;
    const { error } = await supabase.rpc("revoke_document_share_by_email", { p_document_id: activeDoc.id, p_email: email });
    if (error) { setShareNotice(`Could not remove access: ${error.message}`); return; }
    setSharedPeople((prev) => prev.filter((person) => person.email !== email));
    setShareNotice(`Access removed for ${email}.`);
  }

  async function deleteDocument(docTarget: DemoDoc) {
    if (saveTimers.current[docTarget.id]) {
      clearTimeout(saveTimers.current[docTarget.id]);
      delete saveTimers.current[docTarget.id];
    }
    setDeletingBusy(true);
    if (authenticated && supabase) {
      const { error } = await supabase.from("documents").delete().eq("id", docTarget.id);
      if (error) {
        setNotice(`Could not delete document: ${error.message}`);
        setDeletingBusy(false);
        setDocToDelete(null);
        return;
      }
    }
    setDocuments((prev) => prev.filter((doc) => doc.id !== docTarget.id));
    if (activeId === docTarget.id) {
      const remaining = visibleDocs.filter((doc) => doc.id !== docTarget.id);
      setActiveId(remaining[0]?.id ?? "");
    }
    setDeletingBusy(false);
    setDocToDelete(null);
    setNotice(`Deleted "${docTarget.title}".`);
  }

  async function deleteAccount() {
    setDeletingAccountBusy(true);
    try {
      if (authenticated && supabase) {
        const { error } = await supabase.rpc("delete_user_account");
        if (error) {
          // Fallback if RPC not applied: delete documents and profiles directly
          await supabase.from("documents").delete().eq("owner_id", currentUser.id);
          await supabase.from("profiles").delete().eq("id", currentUser.id);
        }
        setAuthScreenMessage("Your account and all associated documents have been permanently deleted.");
        setShowDeleteAccountModal(false);
        await supabase.auth.signOut();
      } else {
        setDocuments(initialDocs);
        setActiveId("welcome-doc");
        setShowDeleteAccountModal(false);
        setNotice("Demo workspace has been reset.");
      }
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Could not delete account";
      setNotice(`Failed to delete account: ${msg}`);
      setShowDeleteAccountModal(false);
    } finally {
      setDeletingAccountBusy(false);
    }
  }

  function exportDocument(format: "md" | "txt" | "pdf") {
    if (!activeDoc) return;
    if (format === "pdf") {
      window.print();
      setNotice(`Prepared "${activeDoc.title}" for PDF print / export.`);
      return;
    }
    try {
      const content = format === "md" ? documentToMarkdown(activeDoc.content) : documentToPlainText(activeDoc.content);
      let baseTitle = (activeDoc.title || "document")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\.(txt|md)$/i, "")
        .trim();
      if (!baseTitle) baseTitle = "document";
      const filename = `${baseTitle}.${format}`;

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {
          // ignore cleanup errors
        }
      }, 1000);

      setNotice(`Exported ${filename}`);
    } catch (err) {
      setNotice(`Export failed: ${err instanceof Error ? err.message : "Could not export file"}`);
    }
  }

  function addComment() {
    if (!activeDoc || !canComment || !newCommentText.trim()) return;
    const comment: DocumentComment = {
      id: crypto.randomUUID(),
      document_id: activeDoc.id,
      author_id: currentUser.id,
      author_name: currentUser.name,
      author_email: currentUser.email,
      text: newCommentText.trim(),
      created_at: new Date().toISOString(),
      resolved: false,
    };
    setComments((prev) => ({
      ...prev,
      [activeDoc.id]: [comment, ...(prev[activeDoc.id] || [])],
    }));
    setNewCommentText("");
    setNotice("Comment added to discussion.");
  }

  function toggleResolveComment(commentId: string) {
    if (!activeDoc) return;
    setComments((prev) => ({
      ...prev,
      [activeDoc.id]: (prev[activeDoc.id] || []).map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c
      ),
    }));
  }

  function deleteComment(commentId: string) {
    if (!activeDoc) return;
    setComments((prev) => ({
      ...prev,
      [activeDoc.id]: (prev[activeDoc.id] || []).filter((c) => c.id !== commentId),
    }));
  }

  function createVersionSnapshot(customTitle?: string) {
    if (!activeDoc) return;
    const text = documentToPlainText(activeDoc.content);
    const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const snapshot: DocumentVersion = {
      id: crypto.randomUUID(),
      document_id: activeDoc.id,
      title: customTitle || `${activeDoc.title} · Snapshot (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
      content: structuredClone(activeDoc.content),
      author_name: currentUser.name,
      created_at: new Date().toISOString(),
      word_count: wordCount,
    };
    setVersions((prev) => ({
      ...prev,
      [activeDoc.id]: [snapshot, ...(prev[activeDoc.id] || [])],
    }));
    setSelectedVersionId(snapshot.id);
    setNotice("Saved a version snapshot.");
  }

  function restoreVersion(v: DocumentVersion) {
    if (!activeDoc || !canEdit) return;
    updateDocument({ content: structuredClone(v.content), title: v.title.replace(/ · Snapshot.*/, "") });
    setNotice(`Restored document to version from ${new Date(v.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}.`);
    setShowVersionHistory(false);
  }

  if (supabase && !authReady) return <main className="auth-loading"><LoaderCircle size={22} className="spin"/><span>Opening your workspace…</span></main>;
  if (supabase && !session) return <AuthScreen initialMessage={authScreenMessage}/>;

  return (
    <main className="app-shell">
      {sidebarOpen && <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">a.</div><div><div className="brand-name">ajaia</div><div className="brand-subtitle">WORKSPACE</div></div>
          <button className="icon-button sidebar-collapse" aria-label="Collapse sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={17}/></button>
        </div>
        <div className="workspace-switch"><div className="workspace-avatar">{currentUser.name.slice(0,1).toUpperCase()}</div><span><strong>{currentUser.name}</strong><small>{authenticated ? "Personal workspace" : "Local demo workspace"}</small></span><ChevronDown size={15}/></div>
        <div className="sidebar-actions">
          <button className="primary-button" onClick={() => void createDocument()}><FilePlus2 size={16}/> New document <span className="shortcut">⌘ N</span></button>
          <label className="secondary-button"><Upload size={16}/> Import file<input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => { void importFile(e.target.files?.[0]); e.currentTarget.value = ""; }}/></label>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <button className="nav-item active"><FileText size={16}/> All documents <span className="nav-count">{visibleDocs.length}</span></button>
        {!authenticated && <button className="nav-item" onClick={() => { setUserMode(userMode === "owner" ? "collaborator" : "owner"); setActiveId(userMode === "owner" ? "product-brief" : "welcome-doc"); }}><Users size={16}/> Switch demo user <span className="switch-pill">{userMode === "owner" ? "You" : "Demo"}</span></button>}
        <div className="section-heading"><span>{authenticated ? "YOUR DOCUMENTS" : "DEMO DOCUMENTS"}</span><button className="tiny-icon" aria-label="Create document" onClick={() => void createDocument()}><FilePlus2 size={15}/></button></div>
        <div className="search-box"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents"/><kbd>⌘ K</kbd></div>
        <div className="document-list">
          {visibleDocs.map((doc) => {
            const canDeleteThis = !authenticated ? doc.owner_id === currentUser.id : doc.access === "owned";
            return (
              <div key={doc.id} className={`document-item-wrap ${activeDoc?.id === doc.id ? "selected" : ""}`}>
                <button className={`document-item ${activeDoc?.id === doc.id ? "selected" : ""}`} onClick={() => setActiveId(doc.id)}>
                  <FileText size={16}/><span className="document-item-copy"><strong>{doc.title}</strong><small>{doc.access === "shared" ? `Shared with you · ${doc.permission}` : "Owned by you"}</small></span>
                </button>
                {canDeleteThis && (
                  <button
                    className="document-item-delete"
                    title={`Delete "${doc.title}"`}
                    aria-label={`Delete "${doc.title}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocToDelete(doc);
                    }}
                  >
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>
            );
          })}
          {loadingDocs && <p className="empty-search">Loading documents…</p>}
          {!loadingDocs && visibleDocs.length === 0 && <p className="empty-search">No documents found. Create one to get started.</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">{currentUser.name.slice(0, 1).toUpperCase()}</div>
          <div className="profile-copy">
            <strong>{currentUser.name}</strong>
            <small>{currentUser.email}</small>
          </div>
          <div className="profile-actions">
            <button
              className="icon-button delete-account-btn"
              title={authenticated ? "Delete account" : "Reset demo workspace"}
              aria-label={authenticated ? "Delete account" : "Reset demo workspace"}
              onClick={() => setShowDeleteAccountModal(true)}
            >
              <UserX size={15}/>
            </button>
            {authenticated && (
              <button
                className="icon-button"
                title="Sign out"
                aria-label="Sign out"
                onClick={() => { void supabase?.auth.signOut(); }}
              >
                <LogOut size={15}/>
              </button>
            )}
          </div>
        </div>
      </aside>}

      <section className="main-panel">
        <header className="topbar" style={{ zIndex: 100, position: "sticky", top: 0 }}>
          {!sidebarOpen && <button className="icon-button" aria-label="Show sidebar" onClick={() => setSidebarOpen(true)}><PanelLeftClose size={17}/></button>}
          <div className="breadcrumbs"><span>Documents</span><span className="crumb-slash">/</span><strong>{activeDoc?.title ?? "No document selected"}</strong></div>

          {/* Real-time Collaboration Indicators */}
          {activeDoc && (
            <div className="collaborator-presence-stack">
              <div className="avatar-stack">
                {collaborators.map((c, i) => (
                  <div
                    key={c.id}
                    className="collab-avatar"
                    style={{ backgroundColor: c.color, zIndex: 10 - i }}
                    title={`${c.name} · ${c.status === "editing" ? "Editing document" : "Viewing document"}`}
                  >
                    {c.name.slice(0, 1).toUpperCase()}
                    <span className="collab-status-dot"/>
                  </div>
                ))}
              </div>
              <span className="collab-count-badge">
                <span className="live-pulse"/>
                {collaborators.length} active
              </span>
            </div>
          )}

          <div className="topbar-actions">
            <span className={`save-indicator ${saveState}`}><span className="status-dot"/>{saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Demo · not saved"}</span>

            {/* Mode Selector */}
            {canEdit && (
              <button
                className={`mode-toggle-btn ${editorMode === "suggest" ? "active" : ""}`}
                onClick={() => setEditorMode(editorMode === "edit" ? "suggest" : "edit")}
                title={editorMode === "edit" ? "Switch to Suggestion / Comment mode" : "Switch to Direct Editing mode"}
              >
                {editorMode === "edit" ? <><Edit3 size={13}/> Editing</> : <><Sparkles size={13}/> Suggesting</>}
              </button>
            )}

            {/* Comments Toggle */}
            <button
              className={`icon-button comment-btn ${showComments ? "active" : ""}`}
              onClick={() => setShowComments((prev) => !prev)}
              title="Comments & discussions"
              aria-label="Comments"
            >
              <MessageSquare size={16}/>
              {openComments.length > 0 && <span className="comment-badge">{openComments.length}</span>}
            </button>

            <button className="share-button" disabled={!activeDoc || !canShare} title={!canShare ? "Only the document owner or admin can share it" : "Share document"} onClick={() => { setShowShare(true); setShareNotice(""); setShareEmail(""); setSharePermission("editor"); }}><Share2 size={15}/> Share</button>
            <button
              className="icon-button delete-action"
              disabled={!activeDoc || !canDelete}
              title={!activeDoc ? "No document selected" : !canDelete ? "Only the document owner or admin can delete this document" : "Delete document"}
              aria-label="Delete document"
              onClick={() => { if (activeDoc && canDelete) setDocToDelete(activeDoc); }}
            >
              <Trash2 size={16}/>
            </button>
            <div className="menu-container" ref={menuRef} style={{ position: "relative", zIndex: 120 }}>
              <button
                className="icon-button"
                aria-label="More options"
                title="More options"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <MoreHorizontal size={18}/>
              </button>
              {menuOpen && (
                <div className="dropdown-menu" role="menu" style={{ zIndex: 9999, position: "absolute", top: "calc(100% + 8px)", right: 0 }}>
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    disabled={!activeDoc}
                    onClick={() => {
                      setMenuOpen(false);
                      setShowVersionHistory(true);
                    }}
                  >
                    <Clock size={14}/> Version history
                  </button>
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    disabled={!activeDoc}
                    onClick={() => {
                      setMenuOpen(false);
                      createVersionSnapshot();
                    }}
                  >
                    <Sparkles size={14}/> Snapshot current milestone
                  </button>
                  <div className="dropdown-divider"/>
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    disabled={!activeDoc}
                    onClick={() => {
                      setMenuOpen(false);
                      exportDocument("pdf");
                    }}
                  >
                    <Printer size={14}/> Export as PDF (Print)
                  </button>
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    disabled={!activeDoc}
                    onClick={() => {
                      setMenuOpen(false);
                      exportDocument("md");
                    }}
                  >
                    <Download size={14}/> Export as Markdown (.md)
                  </button>
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    disabled={!activeDoc}
                    onClick={() => {
                      setMenuOpen(false);
                      exportDocument("txt");
                    }}
                  >
                    <Download size={14}/> Export as Text (.txt)
                  </button>
                  <div className="dropdown-divider"/>
                  <button
                    className="dropdown-item danger"
                    role="menuitem"
                    disabled={!activeDoc || !canDelete}
                    title={!canDelete ? "Only the document owner or admin can delete this document" : "Delete document"}
                    onClick={() => {
                      setMenuOpen(false);
                      if (activeDoc && canDelete) setDocToDelete(activeDoc);
                    }}
                  >
                    <Trash2 size={14}/> Delete document
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {notice && <div className="notice-bar"><Sparkles size={14}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}

        <div className="workspace-content-row" style={{ zIndex: 1, position: "relative" }}>
          {activeDoc ? <div className="editor-scroll">
            <div className="document-meta">
              <div className="doc-type">
                <FileText size={13}/>
                <span>DOCUMENT</span>
                {activeDoc.access === "shared" ? (
                  <span className={`role-tag role-${activeDoc.permission ?? "viewer"}`}>
                    <Users size={11}/> SHARED · {(activeDoc.permission ?? "viewer").toUpperCase()}
                  </span>
                ) : (
                  <span className="owned-tag">OWNED</span>
                )}
              </div>
              <div className="doc-meta-right">
                <span className="doc-stats">{readingStats.words} {readingStats.words === 1 ? "word" : "words"} · {readingStats.minutes} min read</span>
                <span className="meta-separator">·</span>
                <button
                  className="icon-button"
                  style={{ width: "auto", height: "auto", padding: "2px 6px", fontSize: "11px", gap: "4px" }}
                  title="View version history"
                  onClick={() => setShowVersionHistory(true)}
                >
                  <Clock3 size={12}/>
                  <span>{saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Demo"}</span>
                </button>
              </div>
            </div>

            {/* Role notices */}
            {activeDoc.access === "shared" && activeDoc.permission === "commenter" && (
              <div className="role-notice-banner commenter">
                <MessageSquare size={15}/>
                <span>You have <strong>Commenter</strong> access. You can leave comments and review suggestions, but text editing is restricted.</span>
                <button className="secondary-button small-btn" onClick={() => setShowComments(true)}>Open comments</button>
              </div>
            )}
            {activeDoc.access === "shared" && activeDoc.permission === "viewer" && (
              <div className="role-notice-banner viewer">
                <Eye size={15}/>
                <span>You have <strong>Viewer</strong> access to this document. Editing is disabled.</span>
              </div>
            )}

            <input className="document-title" aria-label="Document title" value={activeDoc.title} maxLength={120} readOnly={!canEdit} onChange={(e) => updateDocument({ title: e.target.value || "Untitled document" })}/>
            <div className="editor-caption">{activeDoc.access === "shared" ? `Shared with you as ${activeDoc.permission}.` : "A calm, focused space for your next good idea."}</div>
            <Editor key={activeDoc.id} content={activeDoc.content} editable={canEdit && editorMode === "edit"} onChange={(content) => updateDocument({ content })}/>
            <div className="editor-footer">
              <span>
                <Command size={13}/> {canEdit
                  ? editorMode === "edit"
                    ? "Tip: select text to format, or use shortcuts like ⌘B, ⌘I, ⌘U"
                    : "Suggestion mode active: additions and revisions flagged for review"
                  : activeDoc.permission === "commenter"
                  ? "Commenter mode: you can leave feedback using the comments panel"
                  : "View-only access: editing is disabled"}
              </span>
              <span>{activeDoc.access === "shared" ? `${activeDoc.permission} access` : "Private to your workspace"}</span>
            </div>
          </div> : <div className="empty-workspace"><div className="empty-illustration"><FileText size={27}/></div><h2>{loadingDocs ? "Opening your documents…" : "Your next good idea starts here."}</h2><p>Create a document, or import a plain-text or Markdown file.</p><button className="primary-button" onClick={() => void createDocument()}><FilePlus2 size={16}/> Create a document</button></div>}

          {/* Slide-over Comments Panel */}
          {showComments && activeDoc && (
            <aside className="comments-panel" style={{ zIndex: 2 }}>
              <div className="comments-panel-header">
                <h3><MessageSquare size={16}/> Comments ({activeDocComments.length})</h3>
                <button className="icon-button" onClick={() => setShowComments(false)} aria-label="Close comments panel"><X size={16}/></button>
              </div>
              <div className="comments-filter-tabs">
                <button className={`filter-tab ${commentFilter === "open" ? "active" : ""}`} onClick={() => setCommentFilter("open")}>Open ({openComments.length})</button>
                <button className={`filter-tab ${commentFilter === "resolved" ? "active" : ""}`} onClick={() => setCommentFilter("resolved")}>Resolved ({activeDocComments.length - openComments.length})</button>
                <button className={`filter-tab ${commentFilter === "all" ? "active" : ""}`} onClick={() => setCommentFilter("all")}>All ({activeDocComments.length})</button>
              </div>

              {canComment && (
                <form className="comments-new-form" onSubmit={(e) => { e.preventDefault(); addComment(); }}>
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a comment or suggestion for teammates…"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        addComment();
                      }
                    }}
                  />
                  <div className="comments-form-footer">
                    <small>⌘ Enter to send</small>
                    <button type="submit" className="primary-button small-btn" disabled={!newCommentText.trim()}>Comment</button>
                  </div>
                </form>
              )}

              <div className="comments-list">
                {filteredComments.length > 0 ? (
                  filteredComments.map((comment) => (
                    <div key={comment.id} className={`comment-card ${comment.resolved ? "resolved" : ""}`}>
                      <div className="comment-card-top">
                        <div className="comment-avatar" style={{ backgroundColor: getCollaboratorColor(comment.author_name) }}>
                          {comment.author_name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="comment-author-name">{comment.author_name}</span>
                        <span className="comment-date">{new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="comment-body">{comment.text}</div>
                      <div className="comment-footer-actions">
                        <button
                          className="comment-action-btn resolve-btn"
                          onClick={() => toggleResolveComment(comment.id)}
                          title={comment.resolved ? "Reopen comment" : "Mark as resolved"}
                        >
                          <Check size={12}/> {comment.resolved ? "Reopen" : "Resolve"}
                        </button>
                        {(comment.author_id === currentUser.id || canDelete) && (
                          <button
                            className="comment-action-btn delete-btn"
                            onClick={() => deleteComment(comment.id)}
                            title="Delete comment"
                          >
                            <Trash2 size={12}/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-comments">
                    {commentFilter === "resolved" ? "No resolved comments." : "No comments yet. Start a discussion with your team!"}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </section>

      {showShare && activeDoc && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowShare(false); }}>
        <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
          <div className="modal-heading"><div><h2 id="share-title">Share document</h2><p>Invite someone to work with you.</p></div><button className="icon-button" onClick={() => setShowShare(false)} aria-label="Close dialog"><X size={18}/></button></div>
          <label className="field-label" htmlFor="share-email">Email address</label>
          <div className="invite-field"><Users size={17}/><input id="share-email" type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} placeholder="teammate@company.com"/></div>
          <label className="field-label permission-label" htmlFor="share-permission">Permission & Role</label>
          <select id="share-permission" className="permission-select" value={sharePermission} onChange={(e) => setSharePermission(e.target.value as DocumentRole)}>
            <option value="editor">Editor — can edit and format document</option>
            <option value="commenter">Commenter — can view and add comments</option>
            <option value="viewer">Viewer — can only read document</option>
            <option value="admin">Admin — can edit and manage collaborator access</option>
          </select>
          {shareNotice && <p className="share-notice" role="status">{shareNotice}</p>}
          {authenticated && activeDoc.access === "owned" && <div className="access-list"><div className="access-list-heading"><ShieldCheck size={14}/> PEOPLE WITH ACCESS</div>{sharedPeople.length ? sharedPeople.map((person) => <div className="access-person" key={person.id}><div className="access-avatar">{(person.display_name || person.email).slice(0,1).toUpperCase()}</div><div className="access-person-name"><strong>{person.display_name || person.email.split("@")[0]}</strong><small>{person.email}</small></div><span className={`access-role role-${person.permission}`}>{person.permission}</span><button className="remove-access" title={`Remove ${person.email}`} aria-label={`Remove access for ${person.email}`} onClick={() => void revokeShare(person.email)}>×</button></div>) : <p className="no-access">Only you have access so far.</p>}</div>}
          <div className="modal-footer"><button className="secondary-button modal-cancel" onClick={() => setShowShare(false)}>Close</button><button className="share-button" disabled={sharingBusy || !canShare} onClick={() => void shareDocument()}>{sharingBusy && <LoaderCircle size={14} className="spin"/>} Grant access</button></div>
          <p className="modal-footnote">{authenticated ? "The recipient must have an Ajaia account with this email address." : "Demo mode does not persist access grants. Sign in with Supabase to share securely."}</p>
        </section>
      </div>}

      {docToDelete && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !deletingBusy) setDocToDelete(null); }}>
        <section className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="delete-modal-warning">
            <div className="delete-icon-badge"><Trash2 size={20}/></div>
            <div className="delete-modal-body">
              <h2 id="delete-title">Delete document</h2>
              <p>Are you sure you want to delete <strong>{docToDelete.title}</strong>? This will permanently remove the document and all associated shares. This action cannot be undone.</p>
            </div>
          </div>
          <div className="delete-modal-footer">
            <button className="secondary-button modal-cancel" disabled={deletingBusy} onClick={() => setDocToDelete(null)}>Cancel</button>
            <button className="danger-button" disabled={deletingBusy} onClick={() => void deleteDocument(docToDelete)}>
              {deletingBusy && <LoaderCircle size={14} className="spin"/>}
              Delete document
            </button>
          </div>
        </section>
      </div>}

      {showDeleteAccountModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingAccountBusy) setShowDeleteAccountModal(false);
          }}
        >
          <section className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
            <div className="delete-modal-warning">
              <div className="delete-icon-badge">
                <UserX size={20}/>
              </div>
              <div className="delete-modal-body">
                <h2 id="delete-account-title">
                  {authenticated ? "Delete account" : "Reset demo workspace"}
                </h2>
                <p>
                  {authenticated ? (
                    <>
                      Are you sure you want to permanently delete your account (<strong>{currentUser.email}</strong>)? All documents created by you and all sharing permissions will be permanently erased. This action cannot be undone.
                    </>
                  ) : (
                    <>
                      Are you sure you want to reset your local demo data? This will clear all locally created documents and reset to the default workspace.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="delete-modal-footer">
              <button
                className="secondary-button modal-cancel"
                disabled={deletingAccountBusy}
                onClick={() => setShowDeleteAccountModal(false)}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                disabled={deletingAccountBusy}
                onClick={() => void deleteAccount()}
              >
                {deletingAccountBusy && <LoaderCircle size={14} className="spin"/>}
                {authenticated ? "Permanently delete account" : "Reset workspace"}
              </button>
            </div>
          </section>
        </div>
      )}

      {showVersionHistory && activeDoc && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowVersionHistory(false);
          }}
        >
          <section className="version-modal" role="dialog" aria-modal="true" aria-labelledby="version-title">
            <div className="version-modal-header">
              <div>
                <h2 id="version-title">
                  <Clock size={17} /> Version history
                </h2>
                <p>{activeDoc.title} · Review previous snapshots and restore past states</p>
              </div>
              <button className="icon-button" onClick={() => setShowVersionHistory(false)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div className="version-modal-content">
              <div className="version-sidebar">
                <button
                  className="secondary-button"
                  style={{ marginBottom: "8px", justifyContent: "center" }}
                  onClick={() => createVersionSnapshot()}
                >
                  <Plus size={14} /> Snapshot current state
                </button>
                {activeDocVersions.map((v) => (
                  <div
                    key={v.id}
                    className={`version-item ${activeVersionPreview?.id === v.id ? "selected" : ""}`}
                    onClick={() => setSelectedVersionId(v.id)}
                  >
                    <span className="version-item-title">{v.title}</span>
                    <div className="version-item-meta">
                      <span>{new Date(v.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                      <span>{v.word_count} words</span>
                    </div>
                  </div>
                ))}
                {activeDocVersions.length === 0 && (
                  <p className="empty-search">No saved snapshots yet.</p>
                )}
              </div>

              <div className="version-preview">
                {activeVersionPreview ? (
                  <>
                    <div className="version-preview-heading">
                      <div>
                        <strong>{activeVersionPreview.title}</strong>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                          Captured by {activeVersionPreview.author_name} on {new Date(activeVersionPreview.created_at).toLocaleString()}
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          className="primary-button small-btn"
                          onClick={() => restoreVersion(activeVersionPreview)}
                        >
                          <RotateCcw size={13} /> Restore this version
                        </button>
                      )}
                    </div>
                    <div className="version-preview-body">
                      {documentToPlainText(activeVersionPreview.content) || "(Empty document content)"}
                    </div>
                  </>
                ) : (
                  <p className="empty-search">Select a version snapshot to preview.</p>
                )}
              </div>
            </div>

            <div className="version-modal-footer">
              <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                Restoring a past version updates your current draft while keeping all past snapshots intact.
              </small>
              <button className="secondary-button modal-cancel" onClick={() => setShowVersionHistory(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
