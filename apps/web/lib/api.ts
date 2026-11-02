import {
  CreateDocumentUploadDto,
  DocumentRecord,
  DocumentProcessingState,
  OtpDeliveryChannel,
  UserRole,
} from '@repo/contracts';

class ApiClient {
  private inMemoryToken: string | null = null;

  setToken(token: string | null) {
    this.inMemoryToken = token;
  }

  getToken(): string | null {
    return this.inMemoryToken;
  }

  private async fetchBff<T>(path: string, options: RequestInit = {}): Promise<T> {
    // All requests strictly route through same-origin BFF proxy
    const url = `/api/bff${path}`;
    const headers = new Headers(options.headers || {});

    // Always include credentials to send HttpOnly session cookie
    if (this.inMemoryToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.inMemoryToken}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  async getHealth() {
    return this.fetchBff<{ status: string; service: string }>('/v1/health');
  }

  // --- Auth & Session ---
  async requestOtp(identifier: string, channel: OtpDeliveryChannel, instituteId?: string) {
    return this.fetchBff<{ success: boolean; data: { message: string; cooldownSeconds: number } }>(
      '/v1/auth/otp/request',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, channel, instituteId }),
      }
    );
  }

  async verifyOtp(identifier: string, code: string, instituteId?: string) {
    const res = await this.fetchBff<{
      success: boolean;
      data: { token: string; user: { userId: string; email?: string; roles: UserRole[]; instituteId?: string } };
    }>('/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, code, instituteId }),
    });

    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res.data;
  }

  async logout() {
    this.setToken(null);
    return this.fetchBff<{ success: boolean }>('/v1/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/auth/me');
  }

  // --- Documents & Ingestion ---
  async initiateUpload(dto: CreateDocumentUploadDto) {
    return this.fetchBff<{
      success: boolean;
      data: { document: DocumentRecord; uploadUrl: string; objectKey: string };
    }>('/v1/documents', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async uploadFileBuffer(documentId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.fetchBff<{ success: boolean; data: DocumentRecord }>(
      `/v1/documents/${documentId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  }

  async getDocument(id: string) {
    return this.fetchBff<{ success: boolean; data: DocumentRecord }>(`/v1/documents/${id}`);
  }

  async getViewUrl(id: string, reason?: string) {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return this.fetchBff<{ success: boolean; data: { viewUrl: string; expiresInSeconds: number } }>(
      `/v1/documents/${id}/view-url${query}`
    );
  }

  async getTimeline(documentId: string) {
    return this.fetchBff<{ success: boolean; data: any[] }>(`/v1/documents/${documentId}/timeline`);
  }

  async listDocuments(params?: { applicationId?: string; status?: DocumentProcessingState }) {
    const searchParams = new URLSearchParams();
    if (params?.applicationId) searchParams.set('applicationId', params.applicationId);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.fetchBff<{ success: boolean; data: DocumentRecord[] }>(`/v1/documents${query}`);
  }

  // --- Review & Verification ---
  async getReviewQueue(params?: { category?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.fetchBff<{ success: boolean; data: { items: any[]; total: number; totalPages: number } }>(
      `/v1/review/queue${query}`
    );
  }

  async getReviewDetails(documentId: string) {
    return this.fetchBff<{
      success: boolean;
      data: {
        document: DocumentRecord;
        viewUrl: string;
        ocrResult: any;
        extraction: any;
        corrections: any[];
      };
    }>(`/v1/review/${documentId}`);
  }

  async submitReviewAction(
    documentId: string,
    action: {
      actionType: 'APPROVE' | 'CORRECT' | 'MARK_UNREADABLE' | 'REQUEST_REUPLOAD';
      fieldKey?: string;
      correctedValue?: string | number;
      reason: string;
      expectedVersion?: number;
    }
  ) {
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/review/${documentId}/action`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  // --- Case Assignments ---
  async getMyAssignments() {
    return this.fetchBff<{ success: boolean; data: any[] }>('/v1/cases/my-assignments');
  }

  async assignCase(dto: {
    instituteId: string;
    applicationId: string;
    documentId?: string;
    officerId: string;
    notes?: string;
  }) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/cases/assign', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // --- Scholarships & Eligibility ---
  async listScholarships(instituteId?: string) {
    const query = instituteId ? `?instituteId=${encodeURIComponent(instituteId)}` : '';
    return this.fetchBff<{ success: boolean; data: any[] }>(`/v1/scholarships${query}`);
  }

  async createScholarship(dto: any) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/scholarships', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async evaluateScholarship(scholarshipId: string, applicationId: string) {
    return this.fetchBff<{ success: boolean; data: any }>(
      `/v1/scholarships/${scholarshipId}/evaluate`,
      {
        method: 'POST',
        body: JSON.stringify({ applicationId }),
      }
    );
  }

  async getRecommendation(applicationId: string) {
    return this.fetchBff<{ success: boolean; data: any }>(
      `/v1/recommendations/application/${applicationId}`
    );
  }

  // --- Consent & Verification Adapters ---
  async getConsentGrants() {
    return this.fetchBff<{ success: boolean; data: any[] }>('/v1/verification/consent');
  }

  async createConsentGrant(dto: {
    instituteId: string;
    provider: string;
    selectedDocumentIds: string[];
    durationDays?: number;
  }) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/verification/consent', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async revokeConsentGrant(grantId: string) {
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/verification/consent/${grantId}/revoke`, {
      method: 'POST',
    });
  }

  // --- Reporting & Dashboard ---
  async getDashboardMetrics(instituteId?: string) {
    const query = instituteId ? `?instituteId=${encodeURIComponent(instituteId)}` : '';
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/reporting/dashboard${query}`);
  }

  async getAuditLogs(instituteId?: string, page = 1) {
    const query = `?page=${page}${instituteId ? `&instituteId=${encodeURIComponent(instituteId)}` : ''}`;
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/reporting/audit${query}`);
  }
}

export const apiClient = new ApiClient();
