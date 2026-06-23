import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familiesApi } from '@/api/families';
import { toast } from 'sonner';

export const useFamilies = (familyId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['families', familyId],
    queryFn: () => familiesApi.getFamilyDetails(familyId!),
    enabled: !!familyId,
  });

  const membersQuery = useQuery({
    queryKey: ['families', familyId, 'members'],
    queryFn: () => familiesApi.getFamilyMembers(familyId!),
    enabled: !!familyId,
  });

  const createMutation = useMutation({
    mutationFn: familiesApi.createFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Family created');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: familiesApi.inviteMember,
    onSuccess: () => {
      toast.success('Invitation sent');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => familiesApi.removeMember(familyId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'members'] });
      toast.success('Member removed');
    },
  });

  return {
    family: query.data?.data,
    members: membersQuery.data?.data,
    isLoading: query.isPending || membersQuery.isPending,
    createFamily: createMutation.mutateAsync,
    inviteMember: inviteMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
  };
};
