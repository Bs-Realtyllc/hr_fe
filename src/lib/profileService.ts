import { api } from "@/lib/api";

export interface Profile {
  id: number;
  name: string;
  email: string;
  phone: string;
  secondary_email: string;
  designation_id: number;
  designation: string;
  department_id: number;
  department: string;
  manager_id: number;
  start_date: string;
  dob: string;
  gender: string;
  github_url: string;
  address: string;
  discord_username: string;
  panNo: string;
  role: string;
  status: string;
  profile_picture: string;
  id_front: string;
  id_back: string;
  nationality: string;
  
}

export const profileService = {
  // Fetch the current user's profile
  getProfile: async () => {
    return api.get<Profile>("/profile");
  },

  // Update profile
  updateProfile: async (data: Partial<Profile>) => {
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
