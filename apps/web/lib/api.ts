import {
  CreateDocumentUploadDto,
  DocumentRecord,
  DocumentProcessingState,
  OtpDeliveryChannel,
  UserRole,
} from '@repo/contracts';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('certischolar_token', token);
      } else {
        localStorage.removeItem('certischolar_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('certischolar_token');
    }
    return this.token;
  }

  private async fetchBff<T>(path: string, options: RequestInit = {}): Promise<T> {
    // All requests strictly go to same-origin /api/bff
    const url = `/api/bff${path}`;
    const headers = new Headers(options.headers || {});

    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
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
      data: { token: string; user: { userId: string; roles: UserRole[]; instituteId?: string } };
    }>('/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, code, instituteId }),
    });

    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res.data;
  }

  async getMe() {
    return this.fetchBff<{ success: boolean; data: any }>('/v1/auth/me');
  }

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
}

export const apiClient = new ApiClient();

