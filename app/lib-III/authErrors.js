const AUTH_ERRORS = {
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/user-not-found': 'No account exists with that email.',
  'auth/wrong-password': 'Incorrect password. Try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with that email already exists — try signing in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/popup-closed-before-sign-in': 'The sign-in window was closed before finishing.',
  'auth/cancelled-popup-request': 'The sign-in window was closed before finishing.',
  'auth/popup-blocked': 'Your browser blocked the pop-up — allow pop-ups and try again.',
  'auth/unauthorized-domain': 'This domain is not authorised in Firebase. (Needs adding in the Firebase console.)',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
}

export function authErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return AUTH_ERRORS[err?.code] ?? fallback
}