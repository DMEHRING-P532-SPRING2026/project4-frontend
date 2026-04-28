import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import Catalogue from './pages/Catalogue'
import ResourceTypes from './pages/ResourceTypes'
import Plans from './pages/Plans'
import Report from './pages/Report'
import Accounts from './pages/Accounts'
import Ledger from './pages/Ledger'

function App() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-950">
      <nav className="bg-neutral-900 px-8 py-3 flex gap-1 items-center shrink-0 border-b border-neutral-800">
        <span className="text-white font-semibold text-sm mr-6 tracking-wide">
          Project 4
        </span>
        {[
          { to: '/catalogue', label: 'Protocols' },
          { to: '/resource-types', label: 'Resource Types' },
          { to: '/plans', label: 'Plans' },
          { to: '/report', label: 'Report' },
          { to: '/accounts', label: 'Accounts' },
          { to: '/ledger', label: 'Ledger' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/catalogue" replace />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/resource-types" element={<ResourceTypes />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/report" element={<Report />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/ledger" element={<Ledger />} />
        </Routes>
      </div>
    </div>
  )
}

export default App