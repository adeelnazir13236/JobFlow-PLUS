import ApiError from "../utils/ApiError.js";

export class MockWhatsAppProvider {
  constructor(settings) {
    this.settings = settings;
  }

  async testConnection() {
    return { ok: true, provider: "MOCK", message: "Mock WhatsApp provider is ready" };
  }

  async sendMessage({ to, body }) {
    if (!to || !body) {
      throw new ApiError(400, "Phone number and message body are required");
    }

    return {
      providerMessageId: `mock-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: "SENT"
    };
  }
}

export class MetaWhatsAppProvider {
  constructor(settings) {
    this.settings = settings;
  }

  validate() {
    if (!this.settings.accessToken || !this.settings.phoneNumberId) {
      throw new ApiError(400, "Meta WhatsApp access token and phone number ID are required");
    }
  }

  async testConnection() {
    this.validate();
    return { ok: true, provider: "META", message: "Meta WhatsApp credentials are configured" };
  }

  async sendMessage({ to, body }) {
    this.validate();

    const response = await fetch(`https://graph.facebook.com/v19.0/${this.settings.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.settings.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: true, body }
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(400, data.error?.message || "Meta WhatsApp message failed");
    }

    return {
      providerMessageId: data.messages?.[0]?.id || null,
      status: "SENT"
    };
  }
}

export function getWhatsAppProvider(settings) {
  const providerType = settings?.providerType || "MOCK";

  if (providerType === "META") {
    return new MetaWhatsAppProvider(settings);
  }

  return new MockWhatsAppProvider(settings);
}
