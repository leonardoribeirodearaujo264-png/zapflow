interface AsaasConfig {
  apiKey: string
  sandbox?: boolean
}

export class AsaasClient {
  private baseUrl: string
  private apiKey: string

  constructor(config: AsaasConfig) {
    this.baseUrl = config.sandbox
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/v3"
    this.apiKey = config.apiKey
  }

  private async request<T>(method: string, path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }

    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Asaas ${method} ${path}: ${res.status} - ${error}`)
    }

    return res.json() as Promise<T>
  }

  async createCustomer(data: {
    name: string
    email?: string
    phone?: string
    cpfCnpj?: string
    address?: string
    addressNumber?: string
    province?: string
    postalCode?: string
  }) {
    return this.request("POST", "/customers", data)
  }

  async getCustomers(params?: Record<string, string>) {
    return this.request("GET", "/customers", undefined, params)
  }

  async getCustomer(id: string) {
    return this.request("GET", `/customers/${id}`)
  }

  async updateCustomer(id: string, data: Partial<{ name: string; email: string; phone: string }>) {
    return this.request("PUT", `/customers/${id}`, data)
  }

  async deleteCustomer(id: string) {
    return this.request("DELETE", `/customers/${id}`)
  }

  async createPayment(data: {
    customer: string
    billingType: string
    value: number
    dueDate: string
    description?: string
    externalReference?: string
  }) {
    return this.request("POST", "/payments", data)
  }

  async getPayments(params?: Record<string, string>) {
    return this.request("GET", "/payments", undefined, params)
  }

  async getPayment(id: string) {
    return this.request("GET", `/payments/${id}`)
  }

  async deletePayment(id: string) {
    return this.request("DELETE", `/payments/${id}`)
  }

  async refundPayment(id: string) {
    return this.request("POST", `/payments/${id}/refund`)
  }

  async getPixQrCode(id: string) {
    return this.request("GET", `/payments/${id}/pixQrCode`)
  }

  async createSubscription(data: {
    customer: string
    billingType: string
    value: number
    nextDueDate: string
    cycle: string
    description?: string
  }) {
    return this.request("POST", "/subscriptions", data)
  }

  async getSubscriptions(params?: Record<string, string>) {
    return this.request("GET", "/subscriptions", undefined, params)
  }

  async createPaymentLink(data: {
    name: string
    billingType?: string
    chargeType?: string
    value?: number
    description?: string
  }) {
    return this.request("POST", "/paymentLinks", data)
  }

  async getPaymentLinks() {
    return this.request("GET", "/paymentLinks")
  }
}
