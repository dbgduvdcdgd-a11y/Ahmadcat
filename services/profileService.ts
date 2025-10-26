const PROFILES_KEY = 'chat-app-user-profiles';

// This stores profile data as { username: { avatar: 'data:image/...' } }
const getStoredProfiles = (): Record<string, { avatar: string }> => {
    try {
        const profiles = localStorage.getItem(PROFILES_KEY);
        return profiles ? JSON.parse(profiles) : {};
    } catch {
        return {};
    }
};

const setStoredProfiles = (profiles: Record<string, { avatar: string }>) => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
};

/**
 * Retrieves the Base64 data URL for a user's profile picture.
 * @param username The username to look up.
 * @returns The data URL string or null if not found.
 */
export const getProfilePicture = (username: string): string | null => {
    const profiles = getStoredProfiles();
    return profiles[username]?.avatar || null;
};

/**
 * Saves a Base64 data URL as a user's profile picture.
 * @param username The username to associate the picture with.
 * @param imageDataUrl The Base64 data URL of the image.
 */
export const setProfilePicture = (username: string, imageDataUrl: string): void => {
    const profiles = getStoredProfiles();
    profiles[username] = { avatar: imageDataUrl };
    setStoredProfiles(profiles);
};

/**
 * Renames a user's profile key.
 * @param oldUsername The current username.
 * @param newUsername The new username.
 */
export const renameUserProfile = (oldUsername: string, newUsername: string): void => {
    const profiles = getStoredProfiles();
    if (profiles[oldUsername]) {
        profiles[newUsername] = profiles[oldUsername];
        delete profiles[oldUsername];
        setStoredProfiles(profiles);
    }
};

/**
 * Deletes a user's profile.
 * @param username The username of the profile to delete.
 */
export const deleteUserProfile = (username: string): void => {
    const profiles = getStoredProfiles();
    if (profiles[username]) {
        delete profiles[username];
        setStoredProfiles(profiles);
    }
};
