/** URL for an employee's profile photo (absolute URLs pass through). */
export function profilePhotoUrl(profilePicture?: string | null): string | undefined {
    if (!profilePicture) return undefined;
    if (profilePicture.startsWith('http')) return profilePicture;
    return `${(process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '')}/uploads/profile/photo/${profilePicture}`;
}
