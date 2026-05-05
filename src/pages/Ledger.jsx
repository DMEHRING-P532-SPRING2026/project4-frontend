import { useState, useEffect } from 'react'
import api from '../api'

const FILTERS = [
    { value: 'ALL',        label: 'All' },
    { value: 'CONSUMABLE', label: 'Consumable' },
    { value: 'ASSET',      label: 'Asset' },
]

const typeBadgeColors = {
    CONSUMABLE: 'bg-blue-800 text-blue-200',
    ASSET:      'bg-green-800 text-green-200',
    ALERT:      'bg-amber-800 text-amber-200',
}

function Ledger() {
    const [accounts, setAccounts] = useState([])
    const [selectedAccount, setSelectedAccount] = useState(null)
    const [entries, setEntries] = useState([])
    const [entriesLoading, setEntriesLoading] = useState(false)
    const [filter, setFilter] = useState('ALL')
    const [auditLog, setAuditLog] = useState([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditError, setAuditError] = useState('')
    const [showAudit, setShowAudit] = useState(false)

    useEffect(() => {
        api.get('/api/accounts')
            .then(r => r.json())
            .then(d => setAccounts(Array.isArray(d) ? d : []))
            .catch(err => console.error('Failed to load accounts', err))
        loadAuditLog()
    }, [])

    const fetchEntries = async (accountId, activeFilter) => {
        setEntriesLoading(true)
        try {
            const query = activeFilter !== 'ALL' ? `?filter=${activeFilter}` : ''
            const res = await api.get(`/api/accounts/${accountId}/entries${query}`)
            if (!res.ok) return
            const data = await res.json()
            setEntries(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load entries', err)
        } finally {
            setEntriesLoading(false)
        }
    }

    const handleSelectAccount = (account) => {
        setSelectedAccount(account)
        setEntries([])
        setFilter('ALL')
        fetchEntries(account.id, 'ALL')
    }

    const handleFilterChange = (value) => {
        setFilter(value)
        if (selectedAccount) fetchEntries(selectedAccount.id, value)
    }

    const loadAuditLog = async () => {
        setAuditLoading(true)
        setAuditError('')
        try {
            const res = await api.get('/api/audit-log')
            if (!res.ok) {
                setAuditError(`Error ${res.status}: ${await res.text()}`)
                return
            }
            const data = await res.json()
            setAuditLog(Array.isArray(data) ? data : [])
        } catch (err) {
            setAuditError(err.message)
        } finally {
            setAuditLoading(false)
        }
    }

    const poolAccounts = accounts.filter(a => a.accountKind === 'POOL')

    const netAmount = entries.reduce((sum, e) => sum + (e.amount ?? 0), 0)

    return (
        <div className="grid grid-cols-3 w-full h-full gap-8 px-8 py-8 bg-neutral-800 overflow-hidden">

            {/* Left: pool balances + account list + audit log */}
            <div className="flex flex-col min-h-0 gap-4">

                {poolAccounts.length > 0 && (
                    <div className="bg-neutral-600 rounded overflow-hidden shrink-0">
                        <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                            <h2 className="text-white font-bold text-base tracking-wide">Pool Balances</h2>
                        </div>
                        <div className="p-3 flex flex-col gap-2">
                            {poolAccounts.map(a => (
                                <div key={a.id} className="flex items-center justify-between">
                                    <div>
                                        <span className="text-white text-sm font-medium">{a.name}</span>
                                        {a.resourceTypeName && (
                                            <span className="text-neutral-400 text-xs ml-2">{a.resourceTypeName}</span>
                                        )}
                                    </div>
                                    <span className={`text-sm font-bold ${
                                        a.balance == null ? 'text-neutral-400'
                                        : a.balance < 0 ? 'text-red-400'
                                        : 'text-green-400'
                                    }`}>
                                        {a.balance ?? '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                    <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                        <h1 className="text-white font-bold text-xl tracking-wide">Accounts</h1>
                    </div>
                    <div className="overflow-y-auto flex-1 min-h-0 p-3 flex flex-col gap-1.5">
                        {accounts.length === 0
                            ? <p className="text-neutral-400 text-sm p-1">No accounts found</p>
                            : accounts.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => handleSelectAccount(a)}
                                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors
                                        ${selectedAccount?.id === a.id
                                            ? 'bg-blue-700 text-white'
                                            : 'text-neutral-300 hover:bg-neutral-500'}`}
                                >
                                    <span className="font-medium">{a.name}</span>
                                    {a.accountKind && (
                                        <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${
                                            a.accountKind === 'POOL'       ? 'bg-blue-800 text-blue-200' :
                                            a.accountKind === 'USAGE'      ? 'bg-green-800 text-green-200' :
                                            'bg-amber-800 text-amber-200'
                                        }`}>
                                            {a.accountKind}
                                        </span>
                                    )}
                                </button>
                            ))
                        }
                    </div>
                </div>

                <div className="bg-neutral-600 rounded overflow-hidden shrink-0">
                    <button
                        onClick={() => setShowAudit(v => !v)}
                        className="w-full bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex items-center justify-between"
                    >
                        <h2 className="text-white font-bold text-base tracking-wide">Audit Log</h2>
                        <span className="text-neutral-400 text-xs">{showAudit ? '▴ hide' : '▾ show'}</span>
                    </button>
                    {showAudit && (
                        <div className="max-h-48 overflow-y-auto p-3 flex flex-col gap-1.5">
                            {auditLoading
                                ? <p className="text-neutral-400 text-sm p-1">Loading...</p>
                                : auditError
                                    ? <p className="text-red-400 text-sm p-1">{auditError}</p>
                                : auditLog.length === 0
                                    ? <p className="text-neutral-400 text-sm p-1">No records</p>
                                    : auditLog.map((rec, i) => (
                                        <div key={rec.id ?? i} className="bg-neutral-700 rounded border border-neutral-500 px-3 py-2 flex flex-col gap-0.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white text-xs font-bold">{rec.event ?? '—'}</span>
                                                <span className="text-neutral-400 text-xs">{rec.durationHours != null ? `${rec.durationHours} hrs` : '—'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-neutral-400 text-xs font-mono">{rec.assetId ?? '—'}</span>
                                                <span className="text-neutral-400 text-xs">{rec.resourceTypeName ?? '—'}</span>
                                            </div>
                                            <span className="text-neutral-500 text-xs">{rec.actionName ?? '—'}</span>
                                        </div>
                                    ))
                            }
                        </div>
                    )}
                </div>
            </div>

            {/* Right: entries */}
            <div className="col-span-2 bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex items-center justify-between gap-4 shrink-0">
                    <h1 className="text-white font-bold text-xl tracking-wide">
                        {selectedAccount ? `${selectedAccount.name} — Entries` : 'Entries'}
                    </h1>
                    {selectedAccount && (
                        <div className="flex gap-1">
                            {FILTERS.map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => handleFilterChange(f.value)}
                                    className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
                                        filter === f.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-neutral-600 text-neutral-300 hover:bg-neutral-500'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {!selectedAccount && (
                    <p className="text-neutral-400 p-4">Select an account to view its entries</p>
                )}
                {selectedAccount && entriesLoading && (
                    <p className="text-neutral-400 p-4">Loading...</p>
                )}
                {selectedAccount && !entriesLoading && (
                    <>
                        <div className="overflow-y-auto flex-1 min-h-0">
                            {entries.length === 0
                                ? <p className="text-neutral-400 p-4">No entries found</p>
                                : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-neutral-700 sticky top-0">
                                            <tr>
                                                <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Amount</th>
                                                <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Type</th>
                                                <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Charged</th>
                                                <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Booked</th>
                                                <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Transaction</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entries.map((e, i) => {
                                                const typeKey = (e.entryType ?? '').toUpperCase()
                                                return (
                                                    <tr key={e.id ?? i} className={i % 2 === 0 ? 'bg-neutral-700' : 'bg-neutral-600'}>
                                                        <td className="px-4 py-2">
                                                            <span className={`font-bold ${e.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                                {e.amount > 0 ? '+' : ''}{e.amount}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {e.entryType ? (
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${typeBadgeColors[typeKey] ?? 'bg-neutral-600 text-neutral-200'}`}>
                                                                    {e.entryType.toLowerCase()}
                                                                </span>
                                                            ) : (
                                                                <span className="text-neutral-500 text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-neutral-300 text-xs">
                                                            {e.whenCharged ? new Date(e.whenCharged).toLocaleString() : '—'}
                                                        </td>
                                                        <td className="px-4 py-2 text-neutral-300 text-xs">
                                                            {e.whenBooked ? new Date(e.whenBooked).toLocaleString() : '—'}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <span className="text-xs bg-neutral-600 text-neutral-300 px-2 py-0.5 rounded">
                                                                txn #{e.transactionId}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )
                            }
                        </div>

                        <div className="bg-neutral-700 border-t border-neutral-500 px-4 py-2 flex items-center gap-6 shrink-0">
                            <span className="text-neutral-400 text-xs">
                                Showing <span className="text-white font-bold">{entries.length}</span> of <span className="text-white font-bold">{entries.length}</span> entries
                            </span>
                            <span className="text-neutral-400 text-xs">
                                Net: <span className={`font-bold ${netAmount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {netAmount > 0 ? '+' : ''}{Number(netAmount).toFixed(2)}
                                </span>
                            </span>
                        </div>
                    </>
                )}
            </div>

        </div>
    )
}

export default Ledger
