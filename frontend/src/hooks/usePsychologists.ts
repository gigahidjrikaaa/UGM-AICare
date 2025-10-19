// hooks/usePsychologists.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/appointments-api';
import { toast } from 'react-hot-toast';

// ========================================
// ADMIN HOOKS
// ========================================

/**
 * Hook to list all psychologists with filters
 */
export function usePsychologists(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  is_available?: boolean;
  specialization?: string;
}) {
  return useQuery({
    queryKey: ['psychologists', params],
    queryFn: () => api.listPsychologists(params),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get single psychologist
 */
export function usePsychologist(id: number | null) {
  return useQuery({
    queryKey: ['psychologist', id],
    queryFn: () => api.getAdminPsychologist(id!),
    enabled: !!id,
  });
}

/**
 * Hook to get psychologist statistics
 */
export function usePsychologistStats(id: number | null) {
  return useQuery({
    queryKey: ['psychologist-stats', id],
    queryFn: () => api.getPsychologistStats(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create psychologist
 */
export function useCreatePsychologist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createPsychologist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psychologists'] });
      toast.success('Psychologist profile created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create psychologist profile');
    },
  });
}

/**
 * Hook to update psychologist
 */
export function useUpdatePsychologist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: api.PsychologistUpdate }) =>
      api.updatePsychologist(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['psychologists'] });
      queryClient.invalidateQueries({ queryKey: ['psychologist', variables.id] });
      toast.success('Psychologist profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update psychologist profile');
    },
  });
}

/**
 * Hook to toggle psychologist availability
 */
export function useTogglePsychologistAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_available }: { id: number; is_available: boolean }) =>
      api.togglePsychologistAvailability(id, is_available),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['psychologists'] });
      queryClient.invalidateQueries({ queryKey: ['psychologist', variables.id] });
      toast.success('Availability updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update availability');
    },
  });
}

/**
 * Hook to delete psychologist
 */
export function useDeletePsychologist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deletePsychologist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psychologists'] });
      toast.success('Psychologist profile deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete psychologist profile');
    },
  });
}

// ========================================
// COUNSELOR HOOKS
// ========================================

/**
 * Hook to get own profile (Counselor)
 */
export function useCounselorProfile() {
  return useQuery({
    queryKey: ['counselor-profile'],
    queryFn: api.getCounselorProfile,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to update own profile (Counselor)
 */
export function useUpdateCounselorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.updateCounselorProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counselor-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
}

/**
 * Hook to toggle own availability (Counselor)
 */
export function useToggleCounselorAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (is_available: boolean) =>
      api.toggleCounselorAvailability(is_available),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counselor-profile'] });
      toast.success('Availability updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update availability');
    },
  });
}

/**
 * Hook to get own appointments (Counselor)
 */
export function useCounselorAppointments(params?: {
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['counselor-appointments', params],
    queryFn: () => api.getCounselorAppointments(params),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get single appointment (Counselor)
 */
export function useCounselorAppointment(id: number | null) {
  return useQuery({
    queryKey: ['counselor-appointment', id],
    queryFn: () => api.getCounselorAppointment(id!),
    enabled: !!id,
  });
}

/**
 * Hook to get dashboard statistics (Counselor)
 */
export function useCounselorStats() {
  return useQuery({
    queryKey: ['counselor-stats'],
    queryFn: api.getCounselorStats,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get today's appointments (Counselor)
 */
export function useTodayAppointments() {
  return useQuery({
    queryKey: ['today-appointments'],
    queryFn: api.getTodayAppointments,
    refetchInterval: 60000, // Refetch every minute
  });
}
