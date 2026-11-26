export type ProfileUpdatePayload = {
  full_name: string;
  username: string;
};

type CurrentProfile = {
  name: string;
  username: string;
};

type ProfileResponse = {
  full_name: string;
  username: string;
  email: string;
  is_email_verified: boolean;
};

export const buildProfileUpdatePayload = (
  name: string,
  username: string,
): ProfileUpdatePayload => {
  const fullName = name.trim();
  const normalizedUsername = username.trim().toLowerCase();
  if (!fullName) throw new Error("Full name is required.");
  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    throw new Error(
      "Username must use 3-20 lowercase letters, numbers, or underscores.",
    );
  }
  return {
    full_name: fullName,
    username: normalizedUsername,
  };
};

export const profileDraftHasChanges = (
  name: string,
  username: string,
  current: CurrentProfile | null | undefined,
): boolean => {
  if (!current) return false;
  return name.trim() !== current.name ||
    username.trim().toLowerCase() !== current.username;
};

export const profileStoreUpdate = (
  expectedUserId: string,
  currentUserId: string | null | undefined,
  response: ProfileResponse,
) => currentUserId === expectedUserId
  ? {
      name: response.full_name,
      username: response.username,
      email: response.email,
      is_email_verified: response.is_email_verified,
    }
  : null;
