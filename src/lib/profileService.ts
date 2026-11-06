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
  citizenship_front: string;
  citizenship_back: string;
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

  uploadCitizenship: async (side: "front" | "back", file: File) => {
    const formData = new FormData();
    formData.append("doc", file);
    return api.postForm<{ filename: string }>(
      `/profile/citizenship/${side}`,
      formData,
    );
  },
};
