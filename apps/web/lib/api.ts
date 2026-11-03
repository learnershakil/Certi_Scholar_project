import {
  CreateDocumentUploadDto,
  DocumentRecord,
  DocumentProcessingState,
  UserRole,
} from '@repo/contracts';

class ApiClient {
  private inMemoryToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.inMemoryToken = localStorage.getItem('certischolar_token');
    }
  }

  setToken(token: string | null) {
    this.inMemoryToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('certischolar_token', token);
      } else {
        localStorage.removeItem('certischolar_token');
      }
    }
  }

  getToken(): string | null {
    return this.inMemoryToken;
  }

  private async fetchBff<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `/api/bff${path}`;
    const headers = new Headers(options.headers || {});

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
  async requestOtp(email: string) {
    return this.fetchBff<{ success: boolean; data: { message: string; cooldownSeconds: number } }>(
      '/v1/auth/otp/request',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  }

  async verifyOtp(email: string, code: string) {
    const res = await this.fetchBff<{
      success: boolean;
      data: {
        token: string;
        user: { userId: string; email: string; name: string; role: UserRole; roles: UserRole[] };
      };
    }>('/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    if (res.data?.token) {
      this.setToken(res.data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('certischolar_token', res.data.token);
        localStorage.setItem('certischolar_user', JSON.stringify(res.data.user));
        document.cookie = `certischolar_token=${res.data.token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `certischolar_role=${res.data.user.role}; path=/; max-age=604800; SameSite=Lax`;
      }
    }
    return res.data;
  }

  async logout() {
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('certischolar_token');
      localStorage.removeItem('certischolar_user');
      document.cookie = 'certischolar_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'certischolar_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'certischolar_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    try {
      await this.fetchBff<{ success: boolean }>('/v1/auth/logout', { method: 'POST' });
    } catch (_) {}
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  async getMe() {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/auth/me');
  }

  // --- User Management (Admin) ---
  async listUsers() {
    return this.fetchBff<{ success: boolean; data: any[] }>('/v1/auth/users');
  }

  async createOrUpdateUser(dto: { email: string; name?: string; role: string; isActive?: boolean }) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/auth/users', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async createUser(dto: { email: string; name?: string; role: string; isActive?: boolean }) {
    return this.createOrUpdateUser(dto);
  }

  // --- Documents & Ingestion (M1-M4) ---
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

  async classifyDocument(documentId: string) {
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/documents/${documentId}/classify`, {
      method: 'POST',
    });
  }

  async extractFields(documentId: string) {
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/documents/${documentId}/extract`, {
      method: 'POST',
    });
  }

  async runConsistencyCheck(documentId: string, options?: { profileKey?: string }) {
    return this.fetchBff<{ success: boolean; data: any }>(
      `/v1/documents/${documentId}/consistency`,
      {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }
    );
  }

  // --- Review & Verification (M5, M6, M7) ---
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

  async submitCorrection(dto: {
    documentId: string;
    fieldKey: string;
    previousValue?: any;
    correctedValue: string | number;
    reason: string;
  }) {
    return this.submitReviewAction(dto.documentId, {
      actionType: 'CORRECT',
      fieldKey: dto.fieldKey,
      correctedValue: dto.correctedValue,
      reason: dto.reason,
    });
  }

  async submitReviewDecision(dto: {
    documentId: string;
    decision: 'APPROVED' | 'REJECTED';
    notes: string;
  }) {
    return this.submitReviewAction(dto.documentId, {
      actionType: dto.decision === 'APPROVED' ? 'APPROVE' : 'MARK_UNREADABLE',
      reason: dto.notes,
    });
  }

  async getExtraction(documentId: string) {
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/documents/${documentId}`);
  }

  // --- Case Assignments ---
  async getMyAssignments() {
    return this.fetchBff<{ success: boolean; data: any[] }>('/v1/cases/my-assignments');
  }

  async getAllAssignments() {
    return this.fetchBff<{ success: boolean; data: any[] }>('/v1/cases');
  }

  async assignCase(dto: {
    applicationId: string;
    officerId: string;
    documentId?: string;
    notes?: string;
  }) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/cases/assign', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // --- Scholarships & AST Rules (M8) ---
  async listScholarships() {
    return this.fetchBff<{ success: boolean; data: any[] }>('/v1/scholarships');
  }

  async createScholarship(dto: any) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/scholarships', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateScholarship(id: string, updates: any) {
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/scholarships/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async testScholarshipRules(ruleAst: any, applicantFacts: any) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/scholarships/rules/test', {
      method: 'POST',
      body: JSON.stringify({ ruleAst, applicantFacts }),
    });
  }

  async testRules(dto: { rules: any; applicantData: any }) {
    return this.testScholarshipRules(dto.rules, dto.applicantData);
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

  // --- Explainable Recommendations (M9) ---
  async generateRecommendation(scholarshipId: string, applicationId: string) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/recommendations/generate', {
      method: 'POST',
      body: JSON.stringify({ scholarshipId, applicationId }),
    });
  }

  async getRecommendation(applicationId: string) {
    return this.fetchBff<{ success: boolean; data: any[] }>(
      `/v1/recommendations/application/${applicationId}`
    );
  }

  // --- Consent & Verification Adapters (M7) ---
  async getConsentGrants() {
    return this.fetchBff<{ success: boolean; data: any[] }>('/v1/verification/consent');
  }

  async createConsentGrant(dto: {
    applicationId?: string;
    selectedDocumentIds: string[];
    purpose?: string;
    durationDays?: number;
    provider?: string;
  }) {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/verification/consent', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: dto.applicationId || 'APP-DEFAULT',
        purpose: dto.purpose || 'Scholarship Verification',
        durationDays: dto.durationDays || 30,
        ...dto,
      }),
    });
  }

  async revokeConsentGrant(grantId: string, reason?: string) {
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/verification/consent/${grantId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async verifyDocument(
    documentId: string,
    provider: string,
    options?: {
      consentGrantId?: string;
      manualEvidence?: string;
      simulatedScenario?: string;
    }
  ) {
    return this.fetchBff<{ success: boolean; data: any }>(`/v1/documents/${documentId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ provider, ...options }),
    });
  }

  async executeVerification(dto: {
    applicationId?: string;
    documentId: string;
    provider: string;
  }) {
    return this.verifyDocument(dto.documentId, dto.provider);
  }

  async getVerificationResults(documentId: string) {
    return this.fetchBff<{ success: boolean; data: any[] }>(
      `/v1/documents/${documentId}/verification`
    );
  }

  // --- Reporting & Dashboard (M10) ---
  async getDashboardMetrics() {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/reporting/dashboard');
  }

  async getAuditLogs(params?: { resourceType?: string; action?: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.resourceType) searchParams.set('resourceType', params.resourceType);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.fetchBff<{ success: boolean; data: any[] }>(`/v1/reporting/audit${query}`);
  }

  getExportCsvUrl(): string {
    return '/api/bff/v1/reporting/export/applications';
  }
}

export const apiClient = new ApiClient();
