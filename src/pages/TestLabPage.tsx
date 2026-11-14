import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Beaker, CheckCircle2, Clock3, ExternalLink,
  LoaderCircle, Play, RefreshCw, ShieldAlert, Terminal, XCircle,
} from "lucide-react";

import { getCodebaseSources, type CodebaseSource } from "../Api/CodeIntelligence";
import { getAgentRunHistory, getAgentRunDetail, type TaskHistoryItem, type WorkflowDetail } from "../Api/AgentRuns";
import {
  engineeringError, executeLocalTests, type TestRunner, type TestExecutionResult,
} from "../Api/Engineering";
import { useAuthStore } from "../store/useAuthStore";

const panel = "min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel";
const dateLabel = (date: string) => new Date(date).toLocaleString();
const nameFromPath = (path: string) => path.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) || "Workspace";

const Output = ({ text, label }: { text: string; label: string }) => (
  <div className="min-w-0">
    <div className="border-b border-app-line bg-app-panel2 px-3 py-2 text-micro font-semibold uppercase tracking-eyebrow text-app-muted">{label}</div>
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-words bg-app-bg p-3 font-mono text-2xs leading-5 text-app-mono-text">{text || "(no output)"}</pre>
  </div>
);

const TestLabPage = () => {
  const token = useAuthStore((state) => state.token);
  const [sources, setSources] = useState<CodebaseSource[]>([]);
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [runner, setRunner] = useState<TestRunner>("pytest");
  const [timeout, setTimeoutValue] = useState(120);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<WorkflowDetail | null>(null);
  const [execution, setExecution] = useState<TestExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    if (!token) return;
    Promise.allSettled([getCodebaseSources(token), getAgentRunHistory(token, 0, 100)])
      .then(async (results) => {
        if (!active) return;
        const [sourceResult, historyResult] = results;
        if (sourceResult.status === "fulfilled") {
          setSources(sourceResult.value);
          setWorkspaceRoot((current) => sourceResult.value.some((s) => s.workspaceRoot === current)
            ? current : (sourceResult.value[0]?.workspaceRoot ?? ""));
        }
        if (historyResult.status === "fulfilled") {
          const testing = historyResult.value.items.filter((item) => item.test_runner);
          setHistory(testing);
          setSelectedId((current) => testing.some((item) => item.thread_id === current)
            ? current : (testing[0]?.thread_id ?? ""));
        }
        setError([
          sourceResult.status === "rejected" ? `Sources: ${await engineeringError(sourceResult.reason)}` : "",
          historyResult.status === "rejected" ? `History: ${await engineeringError(historyResult.reason)}` : "",
        ].filter(Boolean).join(" "));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, reload]);

  useEffect(() => {
    let active = true;
    if (!token || !selectedId) return;
    getAgentRunDetail(selectedId, token).then((detail) => {
      if (active) { setSelectedDetail(detail); setDetailError(""); }
    }).catch(async (cause) => {
      if (active) { setSelectedDetail(null); setDetailError(await engineeringError(cause)); }
    }).finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [selectedId, token, reload]);

  const refresh = () => {
    setLoading(true);
    setLoadingDetail(true);
    setError("");
    setReload((n) => n + 1);
  };

  const runTests = async () => {
    if (!token || running || !sources.some((s) => s.workspaceRoot === workspaceRoot)) return;
    setConfirm(false);
    setRunning(true);
    setError("");
    setExecution(null);
    try {
      setExecution(await executeLocalTests(token, workspaceRoot, runner, timeout));
    } catch (cause) {
      setError(await engineeringError(cause));
    } finally {
      setRunning(false);
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
            <p className="mt-1 max-w-2xl text-[13px] text-app-muted">Inspect test evidence and explicitly run a predefined test suite in a permitted local workspace.</p>
          </div>
          <button className="btn" type="button" onClick={refresh} disabled={!token || loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""}/>Refresh</button>
        </header>

        <div className="flex gap-3 rounded-callout border border-status-amber-line bg-status-amber-bg p-4 text-xs text-status-amber">
          <ShieldAlert size={18} className="shrink-0"/>
          <p><strong>Execution requires consent.</strong> Running project tests executes code from the selected workspace. Choose only a codebase you trust. ForgePath uses predefined runners, not arbitrary shell commands.</p>
        </div>

        {error && <div role="alert" className="rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber">{error}</div>}

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-home">
          <section className={panel}>
            <div className="border-b border-app-line p-4 sm:p-5">
              <h2 className="text-[13px] font-bold">Run a test suite</h2>
              <p className="mt-1 text-2xs text-app-muted">Manual local execution · explicit approval · bounded timeout</p>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <label className="block text-xs font-semibold">Workspace
                <select value={workspaceRoot} onChange={(e) => setWorkspaceRoot(e.target.value)} disabled={running || loading} className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs font-normal text-app-text">
                  {!sources.length && <option value="">No configured workspaces</option>}
                  {sources.map((source) => <option key={source.workspaceRoot} value={source.workspaceRoot}>{source.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold">Test runner
                  <select value={runner} onChange={(e) => setRunner(e.target.value as TestRunner)} disabled={running} className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs font-normal text-app-text">
                    <option value="pytest">pytest</option><option value="npm">npm</option><option value="go">go</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold">Timeout (seconds)
                  <input type="number" min={1} max={600} value={timeout} onChange={(e) => setTimeoutValue(Number(e.target.value))} disabled={running} className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs font-normal text-app-text"/>
                </label>
              </div>
              <p className="text-2xs text-app-muted">The backend runs its configured test command. It does not accept arbitrary commands from this form.</p>
              <button type="button" onClick={() => setConfirm(true)} disabled={!token || !workspaceRoot || running || !Number.isInteger(timeout) || timeout < 1 || timeout > 600} className="btn btn-primary disabled:opacity-50">
                {running ? <LoaderCircle size={15} className="animate-spin"/> : <Play size={15}/>}{running ? "Executing tests..." : "Run tests"}
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
            <div><h2 className="text-[13px] font-bold">Execution results</h2><p className="mt-1 text-2xs text-app-muted">{execution ? "Latest manually executed suite" : "Selected workflow checkpoint"}</p></div>
            {status && <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-2xs ${status === "passed" ? "border-status-green-line bg-status-green-bg text-status-green" : "border-status-amber-line bg-status-amber-bg text-status-amber"}`}>{status === "passed" ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {status}</span>}
          </div>
          {execution ? <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap gap-4 text-2xs text-app-muted"><span>Runner: {execution.runner}</span><span>Duration: {execution.duration_ms} ms</span><span>Exit: {execution.exit_code ?? "—"}</span><span>{dateLabel(execution.finished_at)}</span></div>
            <p className="break-all font-mono text-micro text-app-dim">Command: {execution.command.join(" ")}</p>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2"><div className="overflow-hidden rounded-lg border border-app-line"><Output label={execution.stdout_truncated ? "stdout · truncated" : "stdout"} text={execution.stdout}/></div><div className="overflow-hidden rounded-lg border border-app-line"><Output label={execution.stderr_truncated ? "stderr · truncated" : "stderr"} text={execution.stderr}/></div></div>
            <p className="flex items-center gap-2 text-micro text-app-muted"><Clock3 size={14}/> The backend does not persist standalone stdout/stderr. They remain visible only in this page session.</p>
          </div> : hasResults ? <div className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-2"><div className="overflow-hidden rounded-lg border border-app-line"><Output label="workflow stdout" text={workflowTest?.stdout ?? ""}/></div><div className="overflow-hidden rounded-lg border border-app-line"><Output label="workflow stderr" text={workflowTest?.stderr ?? ""}/></div></div> : <div className="flex flex-col items-center gap-3 px-5 py-12 text-center text-xs text-app-muted"><Terminal size={25} className="text-app-accent"/><p>No test output to display. Choose a workflow with a saved result or execute a suite above.</p></div>}
        </section>

        {confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-app-bg/90 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="test-consent-title" className="w-full max-w-md rounded-panel border border-app-line bg-app-panel p-5 shadow-panel">
          <h2 id="test-consent-title" className="text-sm font-bold">Authorize test execution?</h2>
          <p className="mt-3 text-xs leading-relaxed text-app-muted">This will execute the backend's <strong className="text-app-text">{runner}</strong> test command in <strong className="break-all text-app-text">{nameFromPath(workspaceRoot)}</strong>, with a maximum runtime of {timeout} seconds. Project test code may have side effects.</p>
          <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn" onClick={() => setConfirm(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => void runTests()}><Play size={14}/>Authorize and run</button></div>
        </div></div>}
      </div>
    </div>
  );
};

export default TestLabPage;