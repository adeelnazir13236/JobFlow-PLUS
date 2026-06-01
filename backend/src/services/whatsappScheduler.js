import {
  runContractRenewalReminders,
  runJobReminders,
  runPaymentReminders
} from "./whatsapp.service.js";

let schedulerStarted = false;

async function runAll() {
  await runJobReminders();
  await runContractRenewalReminders();
  await runPaymentReminders();
}

export function startWhatsAppSchedulers() {
  if (schedulerStarted || process.env.WHATSAPP_SCHEDULER_ENABLED === "false") {
    return;
  }

  schedulerStarted = true;
  const intervalMinutes = Number(process.env.WHATSAPP_SCHEDULER_INTERVAL_MINUTES || 60);
  const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;

  setTimeout(() => {
    runAll().catch((error) => console.warn(`WhatsApp scheduler failed: ${error.message}`));
  }, 30 * 1000);

  setInterval(() => {
    runAll().catch((error) => console.warn(`WhatsApp scheduler failed: ${error.message}`));
  }, intervalMs);
}
