export type GuestAuthMode = "signin" | "signup" | "reset" | "updatePassword";

export function buildGuestPasswordResetRedirect(origin: string) {
  return `${origin.replace(/\/$/, "")}/account?mode=reset`;
}

export function getGuestAuthSubmitLabel(
  mode: GuestAuthMode,
  isLoading: boolean,
) {
  if (isLoading) {
    switch (mode) {
      case "signup":
        return "Creating...";
      case "reset":
        return "Sending...";
      case "updatePassword":
        return "Saving...";
      default:
        return "Signing in...";
    }
  }

  switch (mode) {
    case "signup":
      return "Create guest account";
    case "reset":
      return "Send reset email";
    case "updatePassword":
      return "Save new password";
    default:
      return "Sign in";
  }
}

export function getGuestSignOutLabel(isSigningOut: boolean) {
  return isSigningOut ? "Signing out..." : "Sign out";
}
