import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

type AppHeaderProps = {
  title: string
  subtitle: string
  actions?: ReactNode
}

const navClassName = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

export const AppHeader = ({ title, subtitle, actions }: AppHeaderProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (location.pathname === '/search') {
      setQuery(searchParams.get('q') ?? '')
      return
    }

    setQuery('')
  }, [location.pathname, searchParams])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = query.trim()
    const nextParams = new URLSearchParams()

    if (nextQuery) {
      nextParams.set('q', nextQuery)
    }

    navigate({ pathname: '/search', search: nextParams.toString() })
  }

  return (
    <header className="border-b border-slate-200 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link to="/" className="text-lg font-semibold text-slate-900">
              ImmichExt
            </Link>
            <nav className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
              <NavLink to="/" end className={navClassName}>
                Timeline
              </NavLink>
              <NavLink to="/albums" className={navClassName}>
                Albums
              </NavLink>
              <NavLink to="/people" className={navClassName}>
                People
              </NavLink>
              <NavLink to="/search" className={navClassName}>
                Search
              </NavLink>
              <NavLink to="/tags" className={navClassName}>
                Tags
              </NavLink>
              <NavLink to="/sharing" className={navClassName}>
                Sharing
              </NavLink>
              <NavLink to="/trash" className={navClassName}>
                Trash
              </NavLink>
              <NavLink to="/memories" className={navClassName}>
                Memories
              </NavLink>
              <NavLink to="/duplicates" className={navClassName}>
                Duplicates
              </NavLink>
              <NavLink to="/settings" className={navClassName}>
                Settings
              </NavLink>
            </nav>
            <form onSubmit={handleSubmit} className="ml-0 flex items-center gap-2 sm:ml-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search photos, places, camera..."
                className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 sm:w-72"
              />
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              >
                Search
              </button>
            </form>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
