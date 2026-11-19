import { api } from "@/lib/api";
import type { Profile, ProfileUpdate } from "@/types";


export const profileService = {
  // Fetch the current user's profile
  getProfile: async () => {
    return api.get<Profile>("/profile");
  },

  // Update profile
  updateProfile: async (data: ProfileUpdate) => {
    return api.put<Profile>("/profile", data);
  },

  // Upload documents to one of the PATCH /profile/docs/* endpoints, e.g.
  // uploadDocuments("/profile/docs/id", formData) with fields idFront / idBack.
  uploadDocuments: async (endpoint: string, formData: FormData) => {
    return api.patchForm<{ documents: { name: string; filename: string }[] }>(
      endpoint,
      formData,
    );
  },

};
