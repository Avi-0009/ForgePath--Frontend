export const revokeAndClearSession = async (
  revokeRefreshSession: () => Promise<void>,
  clearLocalSession: () => void,
): Promise<void> => {
  try {
    await revokeRefreshSession();
  } catch (error) {
    throw new Error(
      "Signed out locally, but the server could not confirm refresh-session revocation.",
      { cause: error },
    );
  } finally {
    clearLocalSession();
  }
};
