import { 
  useEffect, 
  useMemo, 
  useState 
} from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle, 
  Check, 
  ChevronRight, 
  FileCode2, 
  GitPullRequest,
  LoaderCircle, 
  RefreshCw, 
  ShieldAlert, 
  X,
} from "lucide-react";
import { getAgentRunDetail, type WorkflowDetail } from "../Api/AgentRuns";
import { getTaskHistory, type TaskHistoryItem, type WorkflowStatus } from "../Api/Tasks";
import { engineeringError, resumeWorkflow, type Decision } from "../Api/Engineering";
import { useAuthStore } from "../store/useAuthStore";

const pendingStates = new Set<WorkflowStatus>([
  "awaiting_plan_approval", "awaiting_file_selection",
  "awaiting_patch_approval", "awaiting_test_approval",
  "awaiting_repair_file_selection",
]);

const panel = "min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel";
const label = (status: string) => status.replace(/^awaiting_/, "").replaceAll("_", " ");
const short = (text: string) => text.trim().split("\n")[0] || "Untitled run";

type PendingDecision = { 
  action: Decision; selectedFile?: string };

const ApprovalsPage = () => {
  const token = useAuthStore((state) => state.token);
  const [items, setItems] = useState<TaskHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [selectedFile, setSelectedFile] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [notice, setNotice] = useState("");
  const [decision, setDecision] = useState<PendingDecision | null>(null);
  const [reload, setReload] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let active = true;
    if (!token) return;
    getTaskHistory(token, offset, 100).then((response) => {
      if (!active) return;
      const waiting = response.items.filter((item) => pendingStates.has(item.status));
      setItems((previous) => offset === 0 ? waiting : [...previous, ...waiting]);
      setTotal(response.total);
      setSelectedId((current) => waiting.some((item) => item.thread_id === current)
        ? current : (waiting[0]?.thread_id ?? ""));
      setError("");
    }).catch(async (cause) => {
      if (active) 
        setError(await engineeringError(cause));
    }).finally(() => { 
      if (active) setLoading(false); });
    return () => { 
      active = false; };
  }, [token, reload, offset]);

  useEffect(() => {
    let active = true;
    if (!selectedId || !token) return;
    getAgentRunDetail(selectedId, token).then((result) => {
      if (!active) return;
      setDetail(result);
      setSelectedFile(result.pending_action?.available_files[0] ?? "");
      setDetailError("");
    }).catch(async (cause) => {
      if (active) { 
        setDetail(null); setDetailError(await engineeringError(cause)); }
    }).finally(() => { 
      if (active) setDetailLoading(false); });
    return () => { 
      active = false; };
  }, [token, selectedId, reload]);

  const selected = useMemo(() => items.find((item) => item.thread_id === selectedId), [items, selectedId]);
  const pending = detail?.pending_action;
  const needsFile = pending?.kind === "file_selection" || pending?.kind === "repair_file_selection";
  const needsApproval = pending?.kind === "plan_approval" || pending?.kind === "patch_approval" || pending?.kind === "test_approval";
  const isCurrent = Boolean(detail && pending && pendingStates.has(detail.status) && selected?.status === detail.status);
  const canChoose = Boolean(needsFile && selectedFile && pending?.available_files.includes(selectedFile));

  const refresh = () => {
    setLoading(true);
    setDetailLoading(true);
    setError("");
    setDetailError("");
    setDecision(null);
    setOffset(0);
    setReload((value) => value + 1);
  };

  const chooseRun = (threadId: string) => {
    setSelectedId(threadId);
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");
    setNotice("");
    setDecision(null);
  };

  const submit = async () => {
    if (!token || !selectedId || !decision || !detail || !pending || !isCurrent || submitting) return;
    if (decision.action === "select_file" && (!needsFile || !decision.selectedFile || !pending.available_files.includes(decision.selectedFile))) return;
    if (decision.action === "approve" && !needsApproval) return;
    if (decision.action === "reject" && !needsApproval) return;
    setSubmitting(true);
    setError("");
    const action = decision.action;
    setDecision(null);
    try {
      const updated = await resumeWorkflow(token, selectedId, action, decision.selectedFile);
      setDetail(updated);
      setNotice(`Decision submitted: ${action.replaceAll("_", " ")}. Current state: ${updated.status.replaceAll("_", " ")}.`);
      setLoading(true);
      setReload((value) => value + 1);
    } catch (cause) {
      setError(await engineeringError(cause));
      setDetailLoading(true);
      setReload((value) => value + 1);
    } finally { 
      setSubmitting(false); }
  };

  const confirmText = decision?.action === "approve"
    ? pending?.kind === "patch_approval"
      ? "This authorization can apply a proposed patch to source files. Inspect the diff before proceeding."
      : pending?.kind === "test_approval"
        ? "This authorization will let the agent execute tests, which runs project code."
        : "This authorizes the agent to continue the approved plan."
    : decision?.action === "select_file"
      ? `The agent will continue with the selected file: ${decision.selectedFile ?? ""}.`
      : decision?.action === "reject"
        ? "The agent will receive a rejection for this checkpoint."
        : "This cancels the current workflow. This does not automatically undo changes already applied.";

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="mb-1 text-micro font-bold uppercase tracking-eyebrow text-app-dim">ENGINEERING / HUMAN CHECKPOINTS</p><h1 className="font-manrope text-[28px] font-extrabold tracking-tight">Approvals</h1><p className="mt-1 max-w-2xl text-[13px] text-app-muted">Inspect the pending checkpoint before allowing a workflow to continue.</p></div>
          <button type="button" className="btn" onClick={refresh} disabled={!token || loading || submitting}><RefreshCw size={14} className={loading ? "animate-spin" : ""}/>Refresh queue</button>
        </header>

        <div className="flex gap-3 rounded-callout border border-status-amber-line bg-status-amber-bg p-4 text-xs text-status-amber"><ShieldAlert size={18} className="shrink-0"/><p><strong>Human-controlled execution.</strong> Approving patches can write to configured source files. Approving tests can execute code. A rejected or cancelled checkpoint is not a rollback of earlier changes.</p></div>
        {error && <div role="alert" className="rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-status-green-line bg-status-green-bg p-3 text-xs text-status-green">{notice}</div>}

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(230px,0.78fr)_minmax(0,1.5fr)]">
          <section className={panel}>
            <div className="border-b border-app-line p-4"><h2 className="text-[13px] font-bold">Pending decisions <span className="font-normal text-app-muted">({items.length}{offset + 100 < total ? "+" : ""})</span></h2><p className="mt-1 text-2xs text-app-muted">Saved workflow history · newest first</p></div>
            {loading && !items.length ? <p className="flex items-center justify-center gap-2 p-10 text-xs text-app-muted"><LoaderCircle size={16} className="animate-spin"/>Loading queue…</p>
              : !items.length ? <div className="px-5 py-12 text-center"><Check size={25} className="mx-auto text-status-green"/><p className="mt-3 text-sm font-semibold">No pending approvals</p><p className="mt-1 text-xs text-app-muted">Workflow checkpoints will appear here when your decision is needed.</p></div>
              : <div className="max-h-170 overflow-y-auto p-2">{items.map((item) => (
                <button type="button" key={item.thread_id} onClick={() => chooseRun(item.thread_id)} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-app-row-hover ${selectedId === item.thread_id ? "bg-app-panel3" : ""}`}>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-app-text">{short(item.task_description)}</p><p className="mt-1 text-2xs capitalize text-status-amber">{label(item.status)}</p><p className="mt-2 font-mono text-micro text-app-dim">{item.thread_id.slice(0, 8)} · {new Date(item.updated_at).toLocaleDateString()}</p></div><ChevronRight size={15} className="shrink-0 text-app-muted"/>
                </button>
              ))}</div>}
            {total > offset + 100 && <button type="button" onClick={() => { 
              setOffset((n) => n + 100); setLoading(true); }} className="w-full border-t border-app-line p-3 text-xs text-app-accent hover:bg-app-row-hover">Search older workflows</button>}
          </section>

          <section className={panel}>
            <div className="border-b border-app-line p-4 sm:p-5"><h2 className="text-[13px] font-bold">Checkpoint review</h2><p className="mt-1 text-2xs text-app-muted">Always inspect the current state before submitting a decision</p></div>
            {!selected ? <div className="px-5 py-14 text-center text-xs text-app-muted">Select a pending workflow to inspect it.</div>
              : detailLoading ? <div className="flex items-center justify-center gap-2 p-12 text-xs text-app-muted"><LoaderCircle size={16} className="animate-spin"/>Loading checkpoint…</div>
              : detailError ? <p className="p-5 text-xs text-status-amber">{detailError}</p>
              : !detail || !pending ? <div className="p-5 text-xs text-app-muted">This workflow no longer has a pending checkpoint. Refresh the queue.</div>
              : <div className="space-y-5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-status-amber-line bg-status-amber-bg px-2.5 py-1 text-micro font-bold uppercase text-status-amber">{label(detail.status)}</span><span className="font-mono text-micro text-app-dim">{detail.thread_id.slice(0, 8)}</span></div>
                <div><h3 className="text-xs font-bold">Requested decision</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-app-muted">{pending.message}</p></div>
                {
                  pending.step_number != null && <p className="text-2xs text-app-muted">Plan step: {pending.step_number}</p>
                }
                {pending.kind === "plan_approval" && <div className="rounded-lg border border-app-line bg-app-panel2 p-4"><h3 className="text-xs font-bold">Proposed plan</h3><p className="mt-2 text-xs text-app-muted">{detail.plan?.objective ?? detail.plan?.task_summary ?? "Plan details unavailable"}</p><ol className="mt-3 space-y-2 pl-4 text-xs text-app-muted">{detail.plan?.steps.map((step) => <li key={step.step_number} className="list-decimal"><strong className="text-app-text">{step.title}</strong> — {step.description}</li>)}</ol></div>}
                {pending.kind === "patch_approval" && <div className="rounded-lg border border-app-line bg-app-panel2 p-4"><div className="flex items-center gap-2"><GitPullRequest size={16} className="text-app-accent"/><h3 className="text-xs font-bold">Proposed source change</h3></div><p className="mt-2 break-all font-mono text-2xs text-app-muted">{detail.patch_proposal?.relative_path ?? "No file path in checkpoint"}</p>{detail.patch_proposal?.diff ? <pre className="mt-3 max-h-80 overflow-auto whitespace-pre p-3 font-mono text-2xs leading-5 text-app-mono-text bg-app-bg">{detail.patch_proposal.diff}</pre> : <p className="mt-3 text-xs text-status-amber">No patch diff available. Approval is disabled until the patch is inspectable.</p>}</div>}
                {needsFile && <label className="block text-xs font-semibold">Select file to continue
                  <select value={selectedFile} onChange={(e) => setSelectedFile(e.target.value)} className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 font-mono text-xs text-app-text">
                    {!pending.available_files.length && <option value="">No selectable files returned</option>}
                    {pending.available_files.map((file) => <option key={file} value={file}>{file}</option>)}
                  </select>
                </label>}
                {pending.kind === "test_approval" && <div className="flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-2xs text-status-amber"><AlertCircle size={16} className="shrink-0"/><span>Approving will authorize the workflow to run tests. Test code may have side effects.</span></div>}
                {selected?.test_runner && pending.kind === "test_approval" && <p className="text-2xs text-app-muted">Configured runner: <strong className="text-app-text">{selected.test_runner}</strong></p>}
                {isCurrent ? <div className="flex flex-wrap gap-2 border-t border-app-line pt-4">
                  {needsFile ? <button type="button" onClick={() => setDecision({ 
                    action: "select_file", selectedFile })} disabled={!canChoose || submitting} className="btn btn-primary disabled:opacity-50"><FileCode2 size={14}/>Select and continue</button>
                    : <><button type="button" onClick={() => setDecision({ 
                      action: "approve" })} disabled={!needsApproval || submitting || (pending.kind === "patch_approval" && !detail.patch_proposal?.diff)} className="btn btn-primary disabled:opacity-50"><Check size={14}/>Approve checkpoint</button><button type="button" onClick={() => setDecision({ 
                      action: "reject" })} disabled={!needsApproval || submitting} className="btn"><X size={14}/>Reject</button></>}
                  <button type="button" onClick={() => setDecision({ 
                    action: "cancel" })} disabled={submitting} className="btn border-status-amber-line text-status-amber">Cancel workflow</button>
                </div> : <p className="text-xs text-status-amber">The workflow state changed. Refresh before deciding.</p>}
                <div className="border-t border-app-line pt-3"><Link to="/runs" className="text-2xs font-semibold text-app-accent">View Agent Runs</Link></div>
              </div>}
          </section>
        </div>

        {decision && detail && <div className="fixed inset-0 z-50 grid place-items-center bg-app-bg/90 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="decision-title" className="w-full max-w-md rounded-panel border border-app-line bg-app-panel p-5 shadow-panel">
          <div className="flex gap-2"><ShieldAlert size={19} className="shrink-0 text-status-amber"/><h2 id="decision-title" className="text-sm font-bold capitalize">Confirm {decision.action.replaceAll("_", " ")}</h2></div>
          <p className="mt-3 wrap-break-words text-xs leading-relaxed text-app-muted">{confirmText}</p>
          <p className="mt-3 text-2xs text-app-dim">Workflow: {detail.thread_id.slice(0, 8)} · {label(detail.status)}</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setDecision(null)} className="btn">Go back</button><button type="button" onClick={() => void submit()} disabled={submitting} className="btn btn-primary disabled:opacity-50">Confirm decision</button></div>
        </div></div>}
      </div>
    </div>
  );
};

export default ApprovalsPage;