'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(requireAdmin ? '/admin/login' : '/login')
      return
    }
    if (requireAdmin && !isAdmin) {
      router.replace('/dashboard')
      return
    }
    if (!requireAdmin && isAdmin) {
      router.replace('/admin')
    }
  }, [user, loading, isAdmin, requireAdmin, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (requireAdmin && !isAdmin) return null
  if (!requireAdmin && isAdmin) return null

  return <>{children}</>
}
