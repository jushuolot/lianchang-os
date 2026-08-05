/** 账号中心 SSO（与硕泰/企账同一套一键进入） */

const ACCOUNTS_API =
  (import.meta.env.VITE_ACCOUNTS_API as string | undefined)?.replace(/\/$/, '') ||
  'https://www.v2way.com/accounts/api'

const ACCOUNTS_HOME =
  (import.meta.env.VITE_ACCOUNTS_URL as string | undefined)?.replace(/\/?$/, '/') ||
  'https://www.v2way.com/accounts/'

const SESSION_KEY = 'lianchang-os-auth-v1'

export type OsSession = {
  id: string
  name: string
  phone: string
  role: string
  at: string
}

export function accountsHomeUrl() {
  return ACCOUNTS_HOME
}

export function loadSession(): OsSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as OsSession
    if (!s?.id || !s?.phone) return null
    return s
  } catch {
    return null
  }
}

export function saveSession(s: OsSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function redeemSsoCode(code: string): Promise<
  { ok: true; session: OsSession } | { ok: false; message: string }
> {
  try {
    const res = await fetch(`${ACCOUNTS_API}/sso/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ code }),
    })
    const data = (await res.json()) as {
      ok?: boolean
      message?: string
      appId?: string
      user?: { id: string; name: string; phone: string; role: string }
    }
    if (!res.ok || !data.ok || !data.user) {
      return { ok: false, message: data.message || '统一登录失败' }
    }
    if (data.appId && data.appId !== 'os') {
      return { ok: false, message: '登录码不属于链场 OS' }
    }
    const session: OsSession = {
      id: data.user.id,
      name: data.user.name,
      phone: data.user.phone,
      role: data.user.role,
      at: new Date().toISOString(),
    }
    saveSession(session)
    return { ok: true, session }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '无法连接账号中心' }
  }
}
