import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { accountsHomeUrl, redeemSsoCode } from '../auth/accounts'

export function SsoPage() {
  const { user, setUser } = useAuth()
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const code = params.get('code') || ''

  useEffect(() => {
    if (!code) {
      setError('缺少登录码')
      return
    }
    let cancelled = false
    void (async () => {
      const r = await redeemSsoCode(code)
      if (cancelled) return
      if (!r.ok) {
        setError(r.message)
        return
      }
      setUser(r.session)
      setDone(true)
    })()
    return () => {
      cancelled = true
    }
  }, [code, setUser])

  if (done || (user && !code)) return <Navigate to="/" replace />

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="brand">链场 OS</p>
        <h1>统一登录</h1>
        {error ? (
          <>
            <p className="auth-err">{error}</p>
            <div className="auth-links">
              <a href={accountsHomeUrl()}>返回账号中心</a>
              <a href="/login">重新登录</a>
            </div>
          </>
        ) : (
          <p className="auth-hint">正在通过账号中心进入…</p>
        )}
      </div>
    </div>
  )
}
