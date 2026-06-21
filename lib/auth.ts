import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
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

export async function clientSignUp(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  return credential.user
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
