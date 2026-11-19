import { api } from "@/lib/api";
import { getQueryClient } from "@/providers/getQueryClient";
import type { Profile, ProfileUpdate } from "@/types";
import { profileKeys } from "./keys";

// All reads of GET /profile go through the shared query cache: callers that
// mount together share one request, and a read within 30s of the last one is
// served from cache. Every write invalidates the cache, so no screen (another
// tab, the header card, the avatar on /logout) keeps showing pre-save data.

const fetchProfile = () => api.get<Profile>("/profile");

export const profileService = {
  /** The current user's profile — from cache when fresh, otherwise fetched. */
  getProfile: async () => {
    return getQueryClient().fetchQuery({ queryKey: profileKeys.me, queryFn: fetchProfile });
  },

  /** Always fetch from the backend (after a save), and update the cache. */
  refreshProfile: async () => {
    return getQueryClient().fetchQuery({ queryKey: profileKeys.me, queryFn: fetchProfile, staleTime: 0 });
  },

  /** Mark the cached profile stale after a write made outside this service. */
  invalidateProfile: async () => {
    await getQueryClient().invalidateQueries({ queryKey: profileKeys.me });
  },

  // Update profile
  updateProfile: async (data: ProfileUpdate) => {
    const result = await api.put<Profile>("/profile", data);
    await profileService.invalidateProfile();
    return result;
  },

  // Upload documents to one of the PATCH /profile/docs/* endpoints, e.g.
  // uploadDocuments("/profile/docs/id", formData) with fields idFront / idBack.
  uploadDocuments: async (endpoint: string, formData: FormData) => {
    const result = await api.patchForm<{ documents: { name: string; filename: string }[] }>(
      endpoint,
      formData,
    );
    await profileService.invalidateProfile();
    return result;
  },
};
