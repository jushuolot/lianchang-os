import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { accountsHomeUrl } from '../auth/accounts'

export function LoginPage() {
  const { user } = useAuth()
  const home = accountsHomeUrl()
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  if (user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="brand">链场 OS</p>
          <h1>已登录</h1>
          <p className="auth-hint">
            {user.name} · {user.phone}
          </p>
          <Link className="btn primary guide-cta" to="/">
            进入系统
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="brand">链场 OS</p>
        <h1>账号中心登录</h1>
        <p className="auth-hint">
        使用 V2Way 统一账号一键进入。支持<strong>密码</strong>或<strong>手机验证码</strong>登录，再点击「链场 OS」卡片。
        </p>
        <a className="btn primary guide-cta" href={home}>
          打开账号中心
        </a>
        {isLocal ? (
          <p className="auth-local">
            本地开发可先{' '}
            <button
              type="button"
              className="linkish"
              onClick={() => {
                const demo = {
                  id: 'demo',
                  name: '本地演示',
                  phone: '13800000000',
                  role: 'operator',
                  at: new Date().toISOString(),
                }
                localStorage.setItem('lianchang-os-auth-v1', JSON.stringify(demo))
                window.location.href = '/'
              }}
            >
              演示进入
            </button>
          </p>
        ) : null}
      </div>
    </div>
  )
}
