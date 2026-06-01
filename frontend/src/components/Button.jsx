import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  Settings,
  Trash2,
  UserPlus,
  X,
  XCircle
} from "lucide-react";

function buttonText(children) {
  return String(children)
    .replace("[object Object]", "")
    .trim()
    .toLowerCase();
}

function actionMeta(text, variant) {
  if (variant === "danger") return { tone: "danger", icon: XCircle };
  if (variant === "success") return { tone: "success", icon: CheckCircle2 };

  const rules = [
    [/saving|creating|recording|completing|signing/i, "primary", Loader2, true],
    [/cancel|close panel/i, "secondary", X],
    [/back/i, "secondary", ArrowLeft],
    [/logout/i, "secondary", LogOut],
    [/login|sign in/i, "primary", LogIn],
    [/add|create|schedule new/i, "create", Plus],
    [/save|update/i, "primary", Save],
    [/edit/i, "edit", Edit3],
    [/delete|remove/i, "danger", Trash2],
    [/download/i, "info", Download],
    [/print/i, "secondary", Printer],
    [/send whatsapp/i, "whatsapp", MessageCircle],
    [/send|sent|mark as sent/i, "info", Send],
    [/approve|accept|complete|mark as accepted/i, "success", CheckCircle2],
    [/reject|cancel request|mark as rejected/i, "danger", XCircle],
    [/review|open/i, "review", Eye],
    [/convert|to job|to contract/i, "convert", RotateCcw],
    [/payment|record payment/i, "finance", CreditCard],
    [/quotation|invoice|pdf|receipt/i, "info", FileText],
    [/contract|organization/i, "create", Building2],
    [/admin user|add user/i, "create", UserPlus],
    [/password/i, "warning", KeyRound],
    [/settings|features|overrides/i, "secondary", Settings],
    [/pause/i, "warning", Pause],
    [/activate|resume/i, "success", Play],
    [/close request|cancel/i, "secondary", Ban],
    [/job|service request|call log/i, "create", ClipboardCheck]
  ];

  const matched = rules.find(([pattern]) => pattern.test(text));
  if (matched) {
    const [, tone, icon, spin] = matched;
    return { tone, icon, spin };
  }

  return { tone: variant || "primary", icon: null };
}

export default function Button({
  children,
  className = "",
  variant = "primary",
  type = "button",
  icon: IconProp,
  hideIcon = false,
  ...props
}) {
  const text = buttonText(children);
  const { tone, icon: InferredIcon, spin } = actionMeta(text, variant);
  const Icon = IconProp || InferredIcon;

  const tones = {
    primary: "bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-dark)] shadow-sm shadow-blue-900/10",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-900/10",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-900/10",
    create: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-900/10",
    edit: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-900/10",
    info: "bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-900/10",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-900/10",
    review: "bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-900/10",
    convert: "bg-cyan-700 text-white hover:bg-cyan-800 shadow-sm shadow-cyan-900/10",
    finance: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm shadow-emerald-900/10",
    whatsapp: "bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-900/10"
  };

  return (
    <button
      type={type}
      className={`interactive-button inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone] || tones.primary} ${className}`}
      {...props}
    >
      {Icon && !hideIcon && <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${spin ? "animate-spin" : ""}`} />}
      <span>{children}</span>
    </button>
  );
}
