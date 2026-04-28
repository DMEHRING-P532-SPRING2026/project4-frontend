import { useState, useEffect } from 'react'
import api from '../api'

function Ledger() {
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

    const poolAccounts = accounts.filter(a => a.accountKind === 'POOL')

    return (
        <div className="grid grid-cols-3 w-full h-full gap-8 px-8 py-8 bg-neutral-800 overflow-hidden">

            {/* Left: pool balances + account list */}
            <div className="flex flex-col min-h-0 gap-4">

                {/* Pool balances */}
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

                {/* Account selector */}
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
                                            a.accountKind === 'POOL'  ? 'bg-blue-800 text-blue-200' :
                                            a.accountKind === 'USAGE' ? 'bg-green-800 text-green-200' :
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
            </div>

            {/* Entries */}
            <div className="col-span-2 bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                    <h1 className="text-white font-bold text-xl tracking-wide">
                        {selectedAccount ? `${selectedAccount.name} — Entries` : 'Entries'}
                    </h1>
                </div>

                {!selectedAccount && (
                    <p className="text-neutral-400 p-4">Select an account to view its entries</p>
                )}
                {selectedAccount && entriesLoading && (
                    <p className="text-neutral-400 p-4">Loading...</p>
                )}
                {selectedAccount && !entriesLoading && (
                    <div className="overflow-y-auto flex-1 min-h-0">
                        {entries.length === 0
                            ? <p className="text-neutral-400 p-4">No entries found</p>
                            : (
                                <table className="w-full text-sm">
                                    <thead className="bg-neutral-700 sticky top-0">
                                        <tr>
                                            <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Amount</th>
                                            <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Charged</th>
                                            <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Booked</th>
                                            <th className="text-left text-neutral-400 text-xs font-bold px-4 py-2">Transaction</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((e, i) => (
                                            <tr key={e.id} className={i % 2 === 0 ? 'bg-neutral-700' : 'bg-neutral-600'}>
                                                <td className="px-4 py-2">
                                                    <span className={`font-bold ${e.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                        {e.amount > 0 ? '+' : ''}{e.amount}
                                                    </span>
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
                                        ))}
                                    </tbody>
                                </table>
                            )
                        }
                    </div>
                )}
            </div>
        </div>
    )
}

export default Ledger
