import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  linkWithCredential,
  EmailAuthProvider,
  User,
} from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()

export async function adminSignIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (adminEmail && credential.user.email !== adminEmail) {
    await firebaseSignOut(auth)
    throw new Error('Not authorized as admin')
  }
  return credential.user
}

export async function clientSignIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (adminEmail && credential.user.email === adminEmail) {
    await firebaseSignOut(auth)
    throw new Error('Use the admin login page')
  }
  return credential.user
}

export async function clientSignUp(email: string, password: string, displayName?: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) await updateProfile(credential.user, { displayName })
  await sendEmailVerification(credential.user)
  return credential.user
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser
  if (user) await sendEmailVerification(user)
}

export async function updateDisplayName(name: string): Promise<void> {
  const user = auth.currentUser
  if (user) await updateProfile(user, { displayName: name })
}

export async function linkEmailPassword(password: string): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('No user signed in')
  const credential = EmailAuthProvider.credential(user.email, password)
  await linkWithCredential(user, credential)
}

export async function googleSignIn(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function isAdminUser(user: User): boolean {
  return !!process.env.NEXT_PUBLIC_ADMIN_EMAIL && user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}
