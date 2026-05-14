interface UazAPIConfig {
  baseUrl: string
  token: string
}

export class UazAPIClient {
  private baseUrl: string
  private token: string

  constructor(config: UazAPIConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    this.token = config.token
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        token: this.token,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`UazAPI ${method} ${path}: ${res.status} - ${error}`)
    }

    return res.json() as Promise<T>
  }

  async fetchInstances() {
    return this.request("GET", "/instance/fetchInstances")
  }

  async createInstance(instanceName: string) {
    return this.request("POST", "/instance/create", { instanceName })
  }

  async deleteInstance(instanceName: string) {
    return this.request("DELETE", `/instance/delete/${instanceName}`)
  }

  async connectionState(instanceName: string) {
    return this.request("GET", `/instance/connectionState/${instanceName}`)
  }

  async connect(instanceName: string) {
    return this.request("GET", `/instance/connect/${instanceName}`)
  }

  async logout(instanceName: string) {
    return this.request("POST", `/instance/logout/${instanceName}`)
  }

  async restart(instanceName: string) {
    return this.request("POST", `/instance/restart/${instanceName}`)
  }

  async sendText(instanceName: string, payload: { number: string; text: string; delay?: number }) {
    return this.request("POST", `/message/sendText/${instanceName}`, payload)
  }

  async sendMedia(instanceName: string, payload: {
    number: string
    mediatype: string
    mimetype: string
    caption?: string
    media: string
    delay?: number
  }) {
    return this.request("POST", `/message/sendMedia/${instanceName}`, payload)
  }

  async sendButtons(instanceName: string, payload: {
    number: string
    title: string
    description: string
    footer?: string
    buttons: { buttonId: string; buttonText: { displayText: string } }[]
    delay?: number
  }) {
    return this.request("POST", `/message/sendButtons/${instanceName}`, payload)
  }

  async setWebhook(instanceName: string, url: string, events: string[]) {
    return this.request("POST", `/webhook/set/${instanceName}`, { url, events })
  }

  async getWebhook(instanceName: string) {
    return this.request("GET", `/webhook/find/${instanceName}`)
  }

  async fetchContacts(instanceName: string) {
    return this.request("GET", `/contact/fetchContacts/${instanceName}`)
  }

  async checkNumber(instanceName: string, number: string) {
    return this.request("POST", `/contact/check/${instanceName}`, { number })
  }
}
