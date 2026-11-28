import { useEffect, useRef, useState } from "react";
import { HTTPError } from "ky";
import {
  CreateProjectConversation,
  DeleteProjectConversation,
  GetProjectConversation,
  ListProjectConversations,
  PreviewProjectConversation,
  RunProjectConversation,
  type ProjectConversationList,
  type ProjectConversationPreview,
  type ProjectConversationThread,
} from "../../Api/ProjectConversations";

type Props = { token: string; projectId: string };

const withAuthentication = <T,>(
  token: string,
  action: (accessToken: string) => Promise<T>,
): Promise<T> => action(token);

const explainError = async (error: unknown): Promise<string> => {
  if (error instanceof HTTPError) {
    try {
      const data: unknown = await error.response.clone().json();
      if (data && typeof data === "object" && "detail" in data &&
          typeof data.detail === "string") return data.detail;
    } catch { /* use status below */ }
    return `Conversation request failed (HTTP ${error.response.status}).`;
  }
  return error instanceof Error ? error.message : "Conversation request failed.";
};

const ProjectConversationPanel = ({ token, projectId }: Props) => {
  const [list, setList] = useState<ProjectConversationList | null>(null);
  const [thread, setThread] = useState<ProjectConversationThread | null>(null);
  const [question, setQuestion] = useState("");
  const [maxFiles, setMaxFiles] = useState(6);
  const [semantic, setSemantic] = useState(false);
  const [preview, setPreview] = useState<ProjectConversationPreview | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draftGeneration = useRef(0);

  const invalidatePreview = () => {
    draftGeneration.current += 1;
    setPreview(null);
  };

  useEffect(() => {
    if (!token || !projectId) return;
    let cancelled = false;
    const load = async () => {
      setWorking("load");
      try {
        const result = await withAuthentication(token, (key) => ListProjectConversations(key, projectId));
        if (cancelled) return;
        setList(result);
        const latest = result.items.find((item) => !item.stale) ?? result.items[0];
        if (latest) {
          const full = await withAuthentication(token, (key) => GetProjectConversation(key, projectId, latest.id));
          if (!cancelled) setThread(full);
        } else {
          setThread(null);
        }
      } catch (cause) {
        const message = await explainError(cause);
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setWorking(null);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [token, projectId]);

  const openThread = async (threadId: string) => {
    if (!token || !projectId || working) return;
    setWorking("open");
    setError(null);
    invalidatePreview();
    try {
      const full = await withAuthentication(token, (key) => GetProjectConversation(key, projectId, threadId));
      setThread(full);
      setQuestion("");
    } catch (cause) {
      setError(await explainError(cause));
    } finally {
      setWorking(null);
    }
  };

  const createThread = async () => {
    if (!token || !projectId || !list || working) return;
    setWorking("create");
    setError(null);
    invalidatePreview();
    try {
      const created = await withAuthentication(token, (key) =>
        CreateProjectConversation(key, projectId, list.current_snapshot_id));
      const updated = await withAuthentication(token, (key) => ListProjectConversations(key, projectId));
      setList(updated);
      setThread(created);
      setQuestion("");
    } catch (cause) {
      setError(await explainError(cause));
    } finally {
      setWorking(null);
    }
  };

  const removeThread = async () => {
    if (!token || !projectId || !thread || working) return;
    if (!window.confirm("Delete this investigation conversation and all its saved responses?")) return;
    setWorking("delete");
    setError(null);
    invalidatePreview();
    try {
      await withAuthentication(token, (key) => DeleteProjectConversation(key, projectId, thread.id));
      const updated = await withAuthentication(token, (key) => ListProjectConversations(key, projectId));
      setList(updated);
      setThread(null);
      setQuestion("");
    } catch (cause) {
      setError(await explainError(cause));
    } finally {
      setWorking(null);
    }
  };

  const previewTurn = async () => {
    if (!token || !projectId || !thread || thread.stale || question.trim().length < 3 || working) return;
    const version = ++draftGeneration.current;
    setPreview(null);
    setWorking("preview");
    setError(null);
    try {
      const result = await withAuthentication(token, (key) =>
        PreviewProjectConversation(key, projectId, thread.id, question.trim(), maxFiles, thread.revision));
      if (version === draftGeneration.current) setPreview(result);
    } catch (cause) {
      if (version === draftGeneration.current) setError(await explainError(cause));
    } finally {
      setWorking(null);
    }
  };

  const runTurn = async () => {
    if (!token || !projectId || !thread || !preview || thread.stale || working ||
        preview.revision !== thread.revision || preview.snapshot_id !== thread.snapshot_id) return;
    const version = draftGeneration.current;
    setWorking("run");
    setError(null);
    try {
      await withAuthentication(token, (key) => RunProjectConversation(
        key, projectId, thread.id, question.trim(), maxFiles,
        thread.revision, preview.snapshot_id, semantic,
      ));
      const full = await withAuthentication(token, (key) => GetProjectConversation(key, projectId, thread.id));
      const updated = await withAuthentication(token, (key) => ListProjectConversations(key, projectId));
      if (version === draftGeneration.current) {
        setThread(full);
        setList(updated);
        setQuestion("");
        invalidatePreview();
      }
    } catch (cause) {
      if (version === draftGeneration.current) setError(await explainError(cause));
    } finally {
      setWorking(null);
    }
  };

  const latestTurn = thread?.turns.at(-1);

  return (
    <section className="min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
      <div className="border-b border-app-line px-4 py-4 sm:px-5">
        <h2 className="text-base font-bold">Conversational project context</h2>
        <p className="mt-1 text-xs text-app-muted">
          Ask follow-up questions within a saved project investigation. Threads persist on the backend;
          history is context, not proof. Each new answer is verified against the current snapshot.
        </p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {!projectId ? <p className="text-xs text-app-muted">Select a saved project above to begin.</p> : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 text-xs font-semibold">
                Saved conversations
                <select
                  value={thread?.id ?? ""}
                  onChange={(event) => void openThread(event.target.value)}
                  disabled={Boolean(working)}
                  className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs text-app-text"
                >
                  <option value="">Choose a conversation</option>
                  {(list?.items ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.revision} answers{item.stale ? ", older snapshot" : ""})
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-primary" onClick={() => void createThread()}
                disabled={Boolean(working) || !list}>New conversation</button>
              <button type="button" className="btn" onClick={() => void removeThread()}
                disabled={Boolean(working) || !thread}>Delete</button>
            </div>
            {thread && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-app-muted">
                  <span>Saved responses: {thread.revision}/20 · Snapshot: {thread.snapshot_id.slice(0, 8)}</span>
                  <span>{thread.stale ? "Older snapshot · read-only" : "Current snapshot"}</span>
                </div>
                {thread.stale && (
                  <p className="rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber">
                    The project snapshot has changed. You can read this history, but new investigations require a new conversation.
                  </p>
                )}
                {thread.turns.length > 0 && (
                  <div className="max-h-136 space-y-3 overflow-y-auto rounded-lg border border-app-line bg-app-bg p-3">
                    {thread.turns.map((turn) => (
                      <div key={turn.ordinal} className="space-y-2 rounded-lg border border-app-line bg-app-panel2 p-3">
                        <p className="text-xs font-semibold">{turn.ordinal}. {turn.question}</p>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-app-muted">{turn.report.summary}</p>
                        <p className="text-2xs text-app-dim">
                          {turn.report.selected_files.length} source files · {turn.report.completion_calls} AI completion
                          {turn.report.embedding_query_calls > 0 ? " · 1 embedding query" : ""}
                        </p>
                        {turn.report.evidence_links.length > 0 && (
                          <details className="rounded-md border border-app-line p-2 text-xs">
                            <summary className="cursor-pointer font-semibold">
                              Verified source evidence ({turn.report.evidence_links.length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {turn.report.evidence_links.map((item, index) => (
                                <div key={`${item.path}-${index}`} className="rounded-md border border-app-line p-2">
                                  <p className="wrap-break-words font-mono text-2xs text-status-blue">
                                    {item.path} · L{item.start_line}–{item.end_line}
                                  </p>
                                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap wrap-break-words text-2xs">{item.quote}</pre>
                                  <p className="mt-1 text-2xs text-app-muted">{item.explanation}</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        {turn.report.findings.length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer font-semibold">Unverified findings ({turn.report.findings.length})</summary>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-app-muted">
                              {turn.report.findings.map((finding, index) => (
                                <li key={index}>{finding.title} · {finding.path} · {finding.severity}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                        {turn.report.gaps.length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer font-semibold">Limitations ({turn.report.gaps.length})</summary>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-app-muted">
                              {turn.report.gaps.map((gap, index) => <li key={index}>{gap}</li>)}
                            </ul>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {latestTurn && latestTurn.report.follow_up_questions.length > 0 && !thread.stale && (
                  <div className="flex flex-wrap gap-2">
                    {latestTurn.report.follow_up_questions.map((next, index) => (
                      <button key={index} type="button" className="btn" disabled={Boolean(working)}
                        onClick={() => { setQuestion(next); invalidatePreview(); }}>{next}</button>
                    ))}
                  </div>
                )}
                {!thread.stale && thread.revision < 20 && (
                  <div className="space-y-3 rounded-lg border border-app-line bg-app-panel2 p-3">
                    <label className="block text-xs font-semibold">
                      {thread.revision === 0 ? "First investigation question" : "Ask a follow-up"}
                      <textarea
                        rows={3} maxLength={2000} value={question}
                        onChange={(event) => { setQuestion(event.target.value); invalidatePreview(); }}
                        disabled={working === "run"}
                        placeholder="Example: What calls that function, and where is the behavior tested?"
                        className="mt-2 w-full rounded-lg border border-app-line bg-app-bg p-3 text-xs text-app-text"
                      />
                    </label>
                    <div className="flex flex-wrap items-end gap-3 text-xs">
                      <label className="font-semibold">Files (max 10)
                        <select value={maxFiles} onChange={(event) => { setMaxFiles(Number(event.target.value)); invalidatePreview(); }}
                          disabled={Boolean(working)}
                          className="mt-1 block rounded-lg border border-app-line bg-app-bg p-2 text-xs">
                          {[3, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-app-line bg-app-bg px-3 py-2.5">
                        <input type="checkbox" checked={semantic}
                          onChange={(event) => { setSemantic(event.target.checked); invalidatePreview(); }}
                          disabled={Boolean(working)} className="accent-app-accent" />
                        Semantic matches (+1 embedding query)
                      </label>
                      <button type="button" className="btn" onClick={() => void previewTurn()}
                        disabled={Boolean(working) || question.trim().length < 3}>
                        {working === "preview" ? "Selecting sources..." : "Preview source context (free)"}
                      </button>
                    </div>
                    {preview && (
                      <div className="space-y-2 rounded-md border border-app-line bg-app-bg p-3 text-xs">
                        <p className="font-semibold">
                          {preview.selected_files.length}/{preview.total_files} files · {preview.prior_turns} previous answers · ~{preview.estimated_tokens} context tokens
                        </p>
                        <ul className="space-y-1 text-2xs text-app-muted">
                          {preview.selected_files.map((file) => (
                            <li key={file.path} className="wrap-break-words font-mono">
                              {file.path} · L{file.start_line}–{file.end_line} · {file.reason}
                            </li>
                          ))}
                        </ul>
                        <p className="text-2xs text-app-dim">
                          Preview uses no AI calls. History provides context; the new report must cite current source excerpts.
                        </p>
                        <button type="button" className="btn btn-primary" onClick={() => void runTurn()}
                          disabled={Boolean(working) || preview.selected_files.length === 0}>
                          {working === "run" ? "Investigating..." :
                            `Run follow-up (${semantic ? "1 AI completion + 1 embedding query" : "1 AI completion"})`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {!thread && list && <p className="text-xs text-app-muted">Start a conversation to keep your investigations and follow-up questions together.</p>}
          </>
        )}
        {working === "load" && <p className="text-xs text-app-muted">Loading saved conversations...</p>}
        {error && <p role="alert" className="rounded-lg border border-status-red/40 bg-status-red/10 p-3 text-xs text-status-red">{error}</p>}
        <p className="text-2xs text-app-dim">
          History is stored privately by the backend in its configured conversation database. It may include quoted source code; protect the server's data directory.
        </p>
      </div>
    </section>
  );
};

export default ProjectConversationPanel;