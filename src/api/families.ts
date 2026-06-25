import { apiClient } from './client';
import { ApiResponse } from '@/types/api';
import { Family, FamilyMember } from '@/types';

export const familiesApi = {
  createFamily: async (data: {
    name: string;
    monthly_budget?: number | null;
    currency_code?: string;
  }): Promise<ApiResponse<Family>> => {
    const response = await apiClient.post('/families', data);
    return response.data;
  },

  joinFamilyByCode: async (data: { inviteCode: string }): Promise<ApiResponse<{ familyId: string }>> => {
    const response = await apiClient.post('/families/join-by-code', data);
    return response.data;
  },

  inviteMember: async (data: { familyId: string; email: string; role: 'admin' | 'member' }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/families/invite', data);
    return response.data;
  },

  acceptInvite: async (token: string): Promise<ApiResponse<FamilyMember>> => {
    const response = await apiClient.post(`/families/invites/${token}/accept`);
    return response.data;
  },

  declineInvite: async (token: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(`/families/invites/${token}/decline`);
    return response.data;
  },

  getFamilyDetails: async (id: string): Promise<ApiResponse<Family>> => {
    const response = await apiClient.get(`/families/${id}`);
    return response.data;
  },

  getFamilyMembers: async (id: string): Promise<ApiResponse<FamilyMember[]>> => {
    const response = await apiClient.get(`/families/${id}/members`);
    return response.data;
  },

  removeMember: async (familyId: string, memberId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/families/${familyId}/members/${memberId}`);
    return response.data;
  },

  leaveFamily: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(`/families/${id}/leave`);
    return response.data;
  },
};
