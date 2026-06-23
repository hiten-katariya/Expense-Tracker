import { apiClient } from './client';
import { ApiResponse, Family, FamilyMember } from '@/types/api';

export const familiesApi = {
  createFamily: async (data: { name: string }): Promise<ApiResponse<Family>> => {
    const response = await apiClient.post('/families', data);
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
