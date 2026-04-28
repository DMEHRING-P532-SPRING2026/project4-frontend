import { useState, useEffect } from 'react'
import api from '../api'

const kindColors = {
    POOL:       'bg-blue-800 text-blue-200',
    USAGE:      'bg-green-800 text-green-200',
    ALERT_MEMO: 'bg-amber-800 text-amber-200',
}

function Accounts() {
    const [accounts, setAccounts] = useState([])
    const [selectedAccount, setSelectedAccount] = useState(null)
    const [entries, setEntries] = useState([])
    const [entriesLoading, setEntriesLoading] = useState(false)

    useEffect(() => {
        api.get('/api/accounts')
            .then(r => r.json())
            .then(d => setAccounts(Array.isArray(d) ? d : []))
            .catch(err => console.error('Failed to load accounts', err))
    }, [])

    const handleSelectAccount = async (account) => {
        setSelectedAccount(account)
        setEntries([])
        setEntriesLoading(true)
        try {
            const res = await api.get(`/api/accounts/${account.id}/entries`)
            if (!res.ok) return
            const data = await res.json()
            setEntries(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load entries', err)
        } finally {
            setEntriesLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-3 w-full h-full gap-8 px-8 py-8 bg-neutral-800 overflow-hidden">

            {/* Accounts list */}
            <div className="bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                    <h1 className="text-white font-bold text-xl tracking-wide">Accounts</h1>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-4 flex flex-col gap-2">
                    {accounts.length === 0
                        ? <p className="text-neutral-400 p-2">No accounts found</p>
                        : accounts.map(a => (
                            <div
                                key={a.id}
                                onClick={() => handleSelectAccount(a)}
                                className={`bg-neutral-700 rounded border p-3 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-neutral-650
                                    ${selectedAccount?.id === a.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-neutral-500'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-sm flex-1">{a.name}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${kindColors[a.accountKind] ?? 'bg-neutral-600 text-neutral-200'}`}>
                                        {a.accountKind}
                                    </span>
                                </div>
                                {a.resourceTypeName && (
                                    <p className="text-neutral-400 text-xs">{a.resourceTypeName}</p>
                                )}
                                {a.balance != null && (
                                    <p className="text-neutral-300 text-xs font-medium">Balance: {a.balance}</p>
                                )}
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* Ledger entries */}
            <div className="col-span-2 bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                    <h1 className="text-white font-bold text-xl tracking-wide">
                        {selectedAccount ? `${selectedAccount.name} — Entries` : 'Ledger Entries'}
                    </h1>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-4 flex flex-col gap-2">
                    {!selectedAccount && (
                        <p className="text-neutral-400 p-2">Select an account to view its ledger entries</p>
                    )}
                    {selectedAccount && entriesLoading && (
                        <p className="text-neutral-400 p-2">Loading...</p>
                    )}
                    {selectedAccount && !entriesLoading && entries.length === 0 && (
                        <p className="text-neutral-400 p-2">No entries found</p>
                    )}
                    {entries.map(e => (
                        <div key={e.id} className="bg-neutral-700 rounded border border-neutral-500 p-3 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <span className={`text-base font-bold ${e.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {e.amount > 0 ? '+' : ''}{e.amount}
                                </span>
                                <span className="text-xs bg-neutral-600 text-neutral-300 px-2 py-0.5 rounded">
                                    txn #{e.transactionId}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <p className="text-neutral-400 text-xs">
                                    Charged: <span className="text-neutral-300">{e.whenCharged ? new Date(e.whenCharged).toLocaleString() : '—'}</span>
                                </p>
                                <p className="text-neutral-400 text-xs">
                                    Booked: <span className="text-neutral-300">{e.whenBooked ? new Date(e.whenBooked).toLocaleString() : '—'}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Accounts
