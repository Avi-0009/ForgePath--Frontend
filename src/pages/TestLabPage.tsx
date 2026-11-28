import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Beaker, CheckCircle2, Clock3, ExternalLink,
  LoaderCircle, Play, RefreshCw, ShieldAlert, Terminal, XCircle,
} from "lucide-react";

import { listProjects, type ActivatedProject } from "../Api/ProjectActivation";
import { getAgentRunHistory, getAgentRunDetail, type TaskHistoryItem, type WorkflowDetail } from "../Api/AgentRuns";
import {
  engineeringError, projectTestError, getProjectTestSnapshot, executeProjectTests,
  type TestRunner, type ProjectTestSnapshot, type ProjectTestExecutionResult,
} from "../Api/Engineering";
import { useAuthStore } from "../store/useAuthStore";
import { getActiveProjectId } from "../store/useActiveProjectId";
import { createWorkspaceRequestGuard } from "../store/useWorkspaceStore";

const panel = "min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel";
const dateLabel = (date: string) => new Date(date).toLocaleString();
const nameFromPath = (path: string) => path.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) || "Workspace";
const validTimeout = (timeout: number) => Number.isInteger(timeout) && timeout >= 1 && timeout <= 600;

type TestApproval = {
  projectId: string;
  projectName: string;
  snapshot: ProjectTestSnapshot;
  runner: TestRunner;
  timeout: number;
  isCurrent: () => boolean;
};

type DisplayedExecution = ProjectTestExecutionResult & { projectName: string };

const Output = ({ text, label }: { text: string; label: string }) => (
  <div className="min-w-0">
    <div className="border-b border-app-line bg-app-panel2 px-3 py-2 text-micro font-semibold uppercase tracking-eyebrow text-app-muted">{label}</div>
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-words bg-app-bg p-3 font-mono text-2xs leading-5 text-app-mono-text">{text || "(no output)"}</pre>
  </div>
);

const TestLabPage = () => {
  const token = useAuthStore((state) => state.token);
  const [projects, setProjects] = useState<ActivatedProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [runner, setRunner] = useState<TestRunner>("pytest");
  const [timeout, setTimeoutValue] = useState(120);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<WorkflowDetail | null>(null);
  const [execution, setExecution] = useState<DisplayedExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState<TestApproval | null>(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [reload, setReload] = useState(0);
  const selectedProject = projects.find((project) => project.id === projectId);
  const busy = preparing || running || confirm !== null;

  useEffect(() => {
    if (!token) return;
    let active = true;
    const isCurrent = createWorkspaceRequestGuard();
    const allowed = () => active && isCurrent();
    Promise.allSettled([listProjects(token), getAgentRunHistory(token, 0, 100)])
      .then(async ([projectResult, historyResult]) => {
        if (!allowed()) return;
        if (projectResult.status === "fulfilled") {
          const ready = projectResult.value.items.filter((project) => project.status === "ready");
          const activeId = getActiveProjectId(useAuthStore.getState().user?.id);
          setProjects(ready);
          setProjectId((current) => ready.some((project) => project.id === current)
            ? current : (ready.find((project) => project.id === activeId)?.id ?? ready[0]?.id ?? ""));
        } else {
          setProjects([]);
          setProjectId("");
        }
        if (historyResult.status === "fulfilled") {
          const testing = historyResult.value.items.filter((item) => item.test_runner);
          setHistory(testing);
          setSelectedId((current) => testing.some((item) => item.thread_id === current)
            ? current : (testing[0]?.thread_id ?? ""));
          if (!testing.length) {
            setSelectedDetail(null);
            setLoadingDetail(false);
          }
        }
        const message = [
          projectResult.status === "rejected" ? `Projects: ${await projectTestError(projectResult.reason)}` : "",
          historyResult.status === "rejected" ? `History: ${await engineeringError(historyResult.reason)}` : "",
        ].filter(Boolean).join(" ");
        if (allowed() && message) setError(message);
      })
      .finally(() => { if (allowed()) setLoading(false); });
    return () => { active = false; };
  }, [token, reload]);

  useEffect(() => {
    if (!token || !selectedId) return;
    let active = true;
    const isCurrent = createWorkspaceRequestGuard();
    const allowed = () => active && isCurrent();
    getAgentRunDetail(selectedId, token).then((detail) => {
      if (allowed()) { setSelectedDetail(detail); setDetailError(""); }
    }).catch(async (cause) => {
      const message = await engineeringError(cause);
      if (allowed()) { setSelectedDetail(null); setDetailError(message); }
    }).finally(() => { if (allowed()) setLoadingDetail(false); });
    return () => { active = false; };
  }, [selectedId, token, reload]);

  const refresh = () => {
    if (busy) return;
    setLoading(true);
    setLoadingDetail(Boolean(selectedId));
    setError("");
    setReload((n) => n + 1);
  };

  const prepareRun = async () => {
    if (!token || !selectedProject || busy || loading || !validTimeout(timeout)) return;
    const isCurrent = createWorkspaceRequestGuard();
    const project = selectedProject;
    setPreparing(true);
    setError("");
    try {
      const snapshot = await getProjectTestSnapshot(token, project.id);
      if (!isCurrent()) return;
      if (snapshot.project_id !== project.id || !snapshot.snapshot_id) {
        throw new Error("The project snapshot could not be verified.");
      }
      setConfirm({ projectId: project.id, projectName: project.name, snapshot, runner, timeout, isCurrent });
    } catch (cause) {
      const message = await projectTestError(cause);
      if (isCurrent()) setError(message);
    } finally {
      if (isCurrent()) setPreparing(false);
    }
  };

  const runTests = async () => {
    if (!token || !confirm || running || preparing || !confirm.isCurrent()) return;
    const approved = confirm;
    setConfirm(null);
    setRunning(true);
    setError("");
    setExecution(null);
    try {
      const result = await executeProjectTests(
        token, approved.projectId, approved.snapshot.snapshot_id,
        approved.runner, approved.timeout,
      );
      if (!approved.isCurrent()) return;
      if (result.project_id !== approved.projectId || result.snapshot_id !== approved.snapshot.snapshot_id || result.runner !== approved.runner) {
        throw new Error("The returned test result does not match the approved execution.");
      }
      setExecution({ ...result, projectName: approved.projectName });
    } catch (cause) {
      const message = await projectTestError(cause);
      if (approved.isCurrent()) setError(message);
    } finally {
      if (approved.isCurrent()) setRunning(false);
    }
  };

  const status = execution?.status ?? selectedDetail?.test_result?.status;
  const workflowTest = selectedDetail?.test_result;
  const hasResults = Boolean(workflowTest);

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-micro font-bold uppercase tracking-eyebrow text-app-dim">ENGINEERING / TEST LAB</p>
            <h1 className="font-manrope text-[28px] font-extrabold tracking-tight">Test lab</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-app-muted">Inspect test evidence and explicitly run a predefined test suite against a saved project snapshot.</p>
          </div>
          <button className="btn" type="button" onClick={refresh} disabled={!token || loading || busy}><RefreshCw size={14} className={loading ? "animate-spin" : ""}/>Refresh</button>
        </header>

        <div className="flex gap-3 rounded-callout border border-status-amber-line bg-status-amber-bg p-4 text-xs text-status-amber">
          <ShieldAlert size={18} className="shrink-0"/>
          <p><strong>Execution requires consent.</strong> Tests execute the approved saved snapshot in a disposable backend sandbox with no network access. Only included source files and available runtime dependencies can be used. Save a new snapshot if your local files have changed.</p>
        </div>

        {error && <div role="alert" className="rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber">{error}</div>}

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-home">
          <section className={panel}>
            <div className="border-b border-app-line p-4 sm:p-5">
              <h2 className="text-[13px] font-bold">Run a test suite</h2>
              <p className="mt-1 text-2xs text-app-muted">Project snapshot · isolated execution · explicit approval</p>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <label className="block text-xs font-semibold">Project
                <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setExecution(null); setError(""); }} disabled={busy || loading} className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs font-normal text-app-text">
                  {!projects.length && <option value="">No ready projects</option>}
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              {!loading && !projects.length && <p className="text-2xs text-app-muted">Select and activate a folder in <Link to="/repositories" className="text-app-accent">Repositories</Link> first.</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold">Test runner
                  <select value={runner} onChange={(e) => setRunner(e.target.value as TestRunner)} disabled={busy} className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs font-normal text-app-text">
                    <option value="pytest">pytest</option><option value="npm">npm</option><option value="go">go</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold">Timeout (seconds)
                  <input type="number" min={1} max={600} value={timeout} onChange={(e) => setTimeoutValue(Number(e.target.value))} disabled={busy} className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs font-normal text-app-text"/>
                </label>
              </div>
              <p className="text-2xs text-app-muted">The backend runs a predefined test command. Missing dependencies are not downloaded automatically.</p>
              <button type="button" onClick={() => void prepareRun()} disabled={!token || !selectedProject || busy || loading || !validTimeout(timeout)} className="btn btn-primary disabled:opacity-50">
                {preparing || running ? <LoaderCircle size={15} className="animate-spin"/> : <Play size={15}/>}{running ? "Executing tests..." : preparing ? "Checking snapshot..." : "Run tests"}
              </button>
            </div>
          </section>

          <aside className={panel}>
            <div className="border-b border-app-line p-4 sm:p-5"><h2 className="text-[13px] font-bold">Workflow test history</h2><p className="mt-1 text-2xs text-app-muted">Most recent agent runs · checkpoint evidence</p></div>
            <div className="p-4 sm:p-5">
              <label className="block text-2xs text-app-muted">Select agent run
                <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setSelectedDetail(null); setLoadingDetail(true); }} disabled={!history.length} className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs text-app-text">
                  {!history.length && <option value="">No agent runs found</option>}
                  {history.map((item) => <option key={item.thread_id} value={item.thread_id}>{item.task_description.slice(0, 65)}</option>)}
                </select>
              </label>
              {loadingDetail && <p className="mt-4 text-xs text-app-muted"><LoaderCircle size={14} className="mr-2 inline animate-spin"/>Loading checkpoint…</p>}
              {detailError && <p className="mt-4 text-xs text-status-amber">{detailError}</p>}
              {!loadingDetail && selectedDetail && <div className="mt-4 space-y-3 border-t border-app-line pt-4 text-xs">
                <div className="flex items-center gap-2"><Beaker size={16} className="text-app-accent"/><span className="font-semibold">{nameFromPath(selectedDetail.workspace_root)}</span></div>
                <p className="text-app-muted">Run state: <span className="text-app-text">{selectedDetail.status.replaceAll("_", " ")}</span></p>
                <p className="text-app-muted">Test result: <span className="text-app-text">{workflowTest?.status ?? "Not recorded at this checkpoint"}</span></p>
                {workflowTest && <p className="text-app-muted">Exit code: <span className="text-app-text">{workflowTest.exit_code ?? "—"}</span></p>}
                <Link to="/runs" className="inline-flex items-center gap-1 text-app-accent">Open Agent Runs <ExternalLink size={13}/></Link>
              </div>}
              {!loading && !history.length && <p className="mt-4 text-xs text-app-muted">Workflow test evidence will appear here after an agent runs tests.</p>}
            </div>
          </aside>
        </div>

        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-line p-4 sm:p-5">
            <div><h2 className="text-[13px] font-bold">Execution results</h2><p className="mt-1 text-2xs text-app-muted">{execution ? "Latest manually executed suite" : running ? "Test execution in progress" : "Selected workflow checkpoint"}</p></div>
            {!running && status && <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-2xs ${status === "passed" ? "border-status-green-line bg-status-green-bg text-status-green" : "border-status-amber-line bg-status-amber-bg text-status-amber"}`}>{status === "passed" ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {status}</span>}
          </div>
          {running ? <div role="status" className="flex items-center gap-3 p-5 text-xs text-app-muted"><LoaderCircle size={18} className="animate-spin"/>Waiting for isolated test execution to finish…</div> : execution ? <div className="space-y-4 p-4 sm:p-5">
            <p className="break-all text-xs font-semibold">{execution.projectName}</p>
            <p className="break-all font-mono text-micro text-app-dim">Snapshot: {execution.snapshot_id}</p>
            <div className="flex flex-wrap gap-4 text-2xs text-app-muted"><span>Runner: {execution.runner}</span><span>Duration: {execution.duration_ms} ms</span><span>Exit: {execution.exit_code ?? "—"}</span><span>{dateLabel(execution.finished_at)}</span></div>
            <p className="break-all font-mono text-micro text-app-dim">Command: {execution.command.join(" ")}</p>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2"><div className="overflow-hidden rounded-lg border border-app-line"><Output label={execution.stdout_truncated ? "stdout · truncated" : "stdout"} text={execution.stdout}/></div><div className="overflow-hidden rounded-lg border border-app-line"><Output label={execution.stderr_truncated ? "stderr · truncated" : "stderr"} text={execution.stderr}/></div></div>
            <p className="flex items-center gap-2 text-micro text-app-muted"><Clock3 size={14}/> The backend does not persist standalone stdout/stderr. They remain visible only in this page session.</p>
          </div> : hasResults ? <div className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-2"><div className="overflow-hidden rounded-lg border border-app-line"><Output label="workflow stdout" text={workflowTest?.stdout ?? ""}/></div><div className="overflow-hidden rounded-lg border border-app-line"><Output label="workflow stderr" text={workflowTest?.stderr ?? ""}/></div></div> : <div className="flex flex-col items-center gap-3 px-5 py-12 text-center text-xs text-app-muted"><Terminal size={25} className="text-app-accent"/><p>No test output to display. Choose a workflow with a saved result or execute a suite above.</p></div>}
        </section>

        {confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-app-bg/90 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="test-consent-title" className="w-full max-w-md rounded-panel border border-app-line bg-app-panel p-5 shadow-panel">
          <h2 id="test-consent-title" className="text-sm font-bold">Authorize test execution?</h2>
          <p className="mt-3 text-xs leading-relaxed text-app-muted">Run <strong className="text-app-text">{confirm.runner}</strong> on <strong className="break-all text-app-text">{confirm.projectName}</strong> with a test timeout of {confirm.timeout} seconds. Only this saved snapshot will be executed.</p>
          <p className="mt-3 break-all font-mono text-micro text-app-dim">Snapshot: {confirm.snapshot.snapshot_id}</p>
          <p className="mt-2 text-2xs text-app-muted">{confirm.snapshot.file_count} files · {confirm.snapshot.total_bytes.toLocaleString()} bytes · offline sandbox</p>
          <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => void runTests()}><Play size={14}/>Authorize and run</button></div>
        </div></div>}
      </div>
    </div>
  );
};

export default TestLabPage;
