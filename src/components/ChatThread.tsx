import { ACTOR_LABEL, type WorkLog } from '../types'

export function WorkLogPanel({
  title,
  logs,
  tone,
}: {
  title: string
  logs: WorkLog[]
  tone?: 'radio' | 'default'
}) {
  return (
    <section className={`panel log-panel ${tone === 'radio' ? 'radio' : ''}`}>
      <header className="panel-hd">
        <h2>{title}</h2>
        {tone === 'radio' && <span className="chip">门岗频道</span>}
      </header>
      <div className="log-list">
        {logs.length === 0 && <p className="empty">暂无记录</p>}
        {logs.map((l) => (
          <article key={l.id} className={`log-item kind-${l.kind}`}>
            <div className="log-meta">
              <strong>{ACTOR_LABEL[l.from]}</strong>
              <time>{l.at}</time>
            </div>
            <p>{l.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
