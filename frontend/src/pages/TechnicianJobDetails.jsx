import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addTechnicianNote,
  checkInTechnicianJob,
  checkOutTechnicianJob,
  captureTechnicianSignature,
  completeTechnicianJob,
  getTechnicianJob,
  pauseTechnicianJob,
  resumeTechnicianJob,
  startTechnicianJob,
  updateTechnicianChecklistItem,
  uploadTechnicianAttachment
} from "../api/technicianService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

function absoluteFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return `${base.replace(/\/api$/, "")}${path}`;
}

function mapLink(latitude, longitude) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function formatMeters(value) {
  if (value === null || value === undefined) return "N/A";
  return `${Number(value).toFixed(1)} m`;
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission was denied. Please allow location access and try again."));
          return;
        }

        reject(new Error("Unable to capture current location. Please try again."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [signedByName, setSignedByName] = useState("");

  function point(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top
    };
  }

  function start(event) {
    event.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event) {
    if (!drawing.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = point(event);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stop() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  function save() {
    onSave({ signedByName, signatureData: canvasRef.current.toDataURL("image/png") });
    setSignedByName("");
    clear();
  }

  return (
    <div className="space-y-3">
      <Input label="Signed by" value={signedByName} onChange={(event) => setSignedByName(event.target.value)} />
      <canvas
        ref={canvasRef}
        width="720"
        height="220"
        className="h-44 w-full touch-none rounded-md border border-slate-300 bg-white"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={stop}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={!signedByName.trim()}>Save Signature</Button>
        <Button variant="secondary" onClick={clear}>Clear</Button>
      </div>
    </div>
  );
}

export default function TechnicianJobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [note, setNote] = useState("");
  const [attachmentType, setAttachmentType] = useState("BEFORE_PHOTO");
  const [error, setError] = useState("");
  const [gpsMessage, setGpsMessage] = useState("");
  const [gpsLoading, setGpsLoading] = useState("");
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const canUseGps = currentUser?.role === "SYSTEM_ADMIN" || currentUser?.features?.includes("GPS_TRACKING");

  async function loadJob() {
    try {
      setLoading(true);
      setError("");
      setJob(await getTechnicianJob(id));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load job");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJob();
  }, [id]);

  async function runAction(action) {
    try {
      setError("");
      if (action === "start") await startTechnicianJob(id);
      if (action === "pause") await pauseTechnicianJob(id, { notes: "Paused from technician workspace" });
      if (action === "resume") await resumeTechnicianJob(id);
      if (action === "complete") await completeTechnicianJob(id, { remarks: "Completed from technician workspace" });
      await loadJob();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update job");
    }
  }

  async function runGpsAction(type) {
    try {
      setError("");
      setGpsMessage("");
      setGpsLoading(type);
      const location = await getBrowserLocation();
      if (type === "check-in") {
        await checkInTechnicianJob(id, { ...location, notes: "Captured from technician workspace" });
        setGpsMessage("Check-in location captured successfully.");
      } else {
        await checkOutTechnicianJob(id, { ...location, notes: "Captured from technician workspace" });
        setGpsMessage("Check-out location captured successfully.");
      }
      await loadJob();
    } catch (err) {
      setGpsMessage(err.response?.data?.message || err.message || "Unable to capture GPS location");
    } finally {
      setGpsLoading("");
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    try {
      await addTechnicianNote(id, note);
      setNote("");
      await loadJob();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add note");
    }
  }

  async function uploadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileData = await readFileAsDataUrl(file);
      await uploadTechnicianAttachment(id, { attachmentType, fileName: file.name, fileData });
      event.target.value = "";
      await loadJob();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload attachment");
    }
  }

  async function saveSignature(payload) {
    try {
      await captureTechnicianSignature(id, payload);
      await loadJob();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save signature");
    }
  }

  async function toggleChecklist(item) {
    try {
      await updateTechnicianChecklistItem(id, item.id, !item.completed);
      await loadJob();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update checklist");
    }
  }

  if (loading) return <Alert type="info">Loading job...</Alert>;
  if (error && !job) return <Alert>{error}</Alert>;
  if (!job) return <Alert>Job not found</Alert>;

  const contractLink = job.contractLinks?.[0];
  const checkInLog = (job.locationLogs || []).find((log) => log.eventType === "CHECK_IN");
  const checkOutLog = (job.locationLogs || []).find((log) => log.eventType === "CHECK_OUT");
  const customerMap = mapLink(job.customer?.latitude, job.customer?.longitude);

  return (
    <>
      <PageHeader
        title={job.customer?.name || "Job Detail"}
        description={`${formatDate(job.scheduledDate)} at ${job.scheduledTime}`}
        action={<Link to="/technician/jobs"><Button variant="secondary">Back</Button></Link>}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="mb-4 flex flex-wrap gap-2">
        {["SCHEDULED", "RESCHEDULED"].includes(job.status) && <Button onClick={() => runAction("start")}>Start Job</Button>}
        {job.status === "IN_PROGRESS" && <Button variant="warning" onClick={() => runAction("pause")}>Pause Job</Button>}
        {job.status === "PAUSED" && <Button variant="success" onClick={() => runAction("resume")}>Resume Job</Button>}
        {job.status === "IN_PROGRESS" && <Button variant="success" onClick={() => runAction("complete")}>Complete Job</Button>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Job Information</h2>
            <StatusBadge status={job.status} />
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Customer</dt><dd className="font-medium text-slate-950">{job.customer?.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-950">{job.customer?.phone || "N/A"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Address</dt><dd className="text-right font-medium text-slate-950">{job.customer?.address || `${job.customer?.area || ""} ${job.customer?.city || ""}`}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Contract</dt><dd className="font-medium text-slate-950">{contractLink?.contract?.contractNumber || "N/A"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Service</dt><dd className="font-medium text-slate-950">{contractLink?.contractService?.serviceName || "N/A"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Location</dt><dd className="font-medium text-slate-950">{customerMap ? <a className="text-[var(--brand-blue)]" href={customerMap} target="_blank" rel="noreferrer">Open Map</a> : "N/A"}</dd></div>
          </dl>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-950">Checklist</h2>
          <div className="space-y-2">
            {(job.completionChecklist || []).map((item) => (
              <label key={item.id} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm">
                <input type="checkbox" checked={item.completed} onChange={() => toggleChecklist(item)} />
                <span className={item.completed ? "text-slate-400 line-through" : "text-slate-700"}>{item.itemName}</span>
              </label>
            ))}
            {!job.completionChecklist?.length && <Alert type="info">No checklist items for this job.</Alert>}
          </div>
        </section>
      </div>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">GPS Verification</h2>
            <p className="mt-1 text-sm text-slate-500">Check in and check out using browser location permission.</p>
          </div>
          <StatusBadge status={job.locationVerificationStatus || "NOT_CHECKED"} />
        </div>
        {gpsMessage && <div className="mb-4"><Alert type={gpsMessage.includes("successfully") ? "success" : "info"}>{gpsMessage}</Alert></div>}
        {canUseGps ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <Button onClick={() => runGpsAction("check-in")} disabled={Boolean(job.checkedInAt) || gpsLoading === "check-in"}>
              {gpsLoading === "check-in" ? "Capturing..." : "Check-In"}
            </Button>
            <Button variant="success" onClick={() => runGpsAction("check-out")} disabled={!job.checkedInAt || Boolean(job.checkedOutAt) || gpsLoading === "check-out"}>
              {gpsLoading === "check-out" ? "Capturing..." : "Check-Out"}
            </Button>
          </div>
        ) : (
          <Alert type="info">GPS tracking is not available in your current plan.</Alert>
        )}
        <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-slate-500">Check-in Time</div>
            <div className="font-semibold text-slate-950">{formatDate(job.checkedInAt)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-slate-500">Check-out Time</div>
            <div className="font-semibold text-slate-950">{formatDate(job.checkedOutAt)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-slate-500">Check-in Distance</div>
            <div className="font-semibold text-slate-950">{formatMeters(checkInLog?.distanceFromJobLocation)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-slate-500">Accuracy</div>
            <div className="font-semibold text-slate-950">{formatMeters(checkInLog?.accuracy || checkOutLog?.accuracy)}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {customerMap && <a className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-[var(--brand-blue)]" href={customerMap} target="_blank" rel="noreferrer">Open Customer Location</a>}
          {checkInLog && <a className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-[var(--brand-blue)]" href={mapLink(checkInLog.latitude, checkInLog.longitude)} target="_blank" rel="noreferrer">Open Check-In Location</a>}
          {checkOutLog && <a className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-[var(--brand-blue)]" href={mapLink(checkOutLog.latitude, checkOutLog.longitude)} target="_blank" rel="noreferrer">Open Check-Out Location</a>}
        </div>
        <div className="mt-4 space-y-2">
          {(job.locationLogs || []).map((log) => (
            <article key={log.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-950">{log.eventType}</div>
                <StatusBadge status={log.isVerified ? "VERIFIED" : "OUT_OF_RANGE"} />
              </div>
              <div className="mt-1 text-slate-500">
                {log.technician?.name || "Technician"} - {formatDate(log.capturedAt)} - {formatMeters(log.distanceFromJobLocation)}
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-950">Notes</h2>
          <form className="mb-4 space-y-3" onSubmit={saveNote}>
            <textarea className="interactive-field min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add field note" />
            <Button type="submit" disabled={!note.trim()}>Add Note</Button>
          </form>
          <div className="space-y-3">
            {(job.notes || []).map((entry) => (
              <article key={entry.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-950">{entry.note}</div>
                <div className="mt-1 text-xs text-slate-500">{entry.technician?.name || "Technician"} - {formatDate(entry.createdAt)}</div>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-950">Attachments</h2>
          <div className="mb-4 grid gap-3 sm:grid-cols-[180px_1fr]">
            <select className="interactive-field h-10 rounded-md border border-slate-300 px-3 text-sm" value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)}>
              <option value="BEFORE_PHOTO">Before Photo</option>
              <option value="AFTER_PHOTO">After Photo</option>
              <option value="GENERAL_ATTACHMENT">Attachment</option>
            </select>
            <input className="interactive-field h-10 rounded-md border border-slate-300 px-3 py-2 text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadFile} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(job.attachments || []).map((attachment) => (
              <a key={attachment.id} href={absoluteFileUrl(attachment.filePath)} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 p-2">
                <img src={absoluteFileUrl(attachment.filePath)} alt={attachment.fileName} className="h-36 w-full rounded object-cover" />
                <div className="mt-2 text-xs font-medium text-slate-600">{attachment.attachmentType}</div>
              </a>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-950">Customer Signature</h2>
          <SignaturePad onSave={saveSignature} />
          <div className="mt-4 space-y-3">
            {(job.signatures || []).map((signature) => (
              <article key={signature.id} className="rounded-md border border-slate-200 p-3">
                <img src={absoluteFileUrl(signature.signatureImagePath)} alt={signature.signedByName} className="h-24 w-full rounded bg-white object-contain" />
                <div className="mt-2 text-sm font-medium text-slate-950">{signature.signedByName}</div>
                <div className="text-xs text-slate-500">{formatDate(signature.signedAt)}</div>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-950">Activity Timeline</h2>
          <div className="space-y-3">
            {(job.activityLogs || []).map((activity) => (
              <article key={activity.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-semibold text-slate-950">{activity.activityType}</div>
                <div className="mt-1 text-slate-600">{activity.notes || "No notes"}</div>
                <div className="mt-1 text-xs text-slate-500">{activity.user?.name || "System"} - {formatDate(activity.createdAt)}</div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
