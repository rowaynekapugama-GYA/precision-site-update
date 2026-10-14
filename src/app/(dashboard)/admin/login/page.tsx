import { redirect } from 'next/navigation'
import { currentUser } from '@/dashboard/lib/server'
import { LoginForm } from '@/dashboard/editors/AuthForms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sign in' }

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const u = await currentUser()
  if (u) redirect(u.mustChangePassword ? '/admin/change-password' : '/admin')
  const { next } = await searchParams
  return (
    <div className="login">
      <div>
        <div className="card">
          <img className="logo" src="/assets/img/logo.png" alt="Precision Dental" />
          <h1>Website dashboard</h1>
          <p className="sub">Sign in to update the Precision Dental website.</p>
          <LoginForm next={next} />
        </div>
        <p className="foot">Built and supported by GYA</p>
      </div>
    </div>
  )
}
