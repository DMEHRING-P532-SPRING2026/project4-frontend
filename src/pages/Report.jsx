import { useState, useEffect } from 'react'
import api from '../api'

const statusColors = {
    PROPOSED:         'bg-neutral-600 text-neutral-200',
    PENDING_APPROVAL: 'bg-yellow-800 text-yellow-200',
    IN_PROGRESS:      'bg-blue-800 text-blue-200',
    SUSPENDED:        'bg-amber-800 text-amber-200',
    COMPLETED:        'bg-green-800 text-green-200',
    ABANDONED:        'bg-red-800 text-red-200',
    REOPENED:         'bg-cyan-800 text-cyan-200',
}

const STATUS_FILTERS = [
    'ALL', 'PROPOSED', 'PENDING_APPROVAL', 'IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'ABANDONED', 'REOPENED',
]

const typeColors = {
    PLAN:   'bg-purple-800 text-purple-200',
    ACTION: 'bg-neutral-500 text-neutral-200',
}

function Report() {
    const [plans, setPlans] = useState([])
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(false)
    const [statusFilter, setStatusFilter] = useState('ALL')

    useEffect(() => {
        api.get('/api/plans')
            .then(r => r.json())
            .then(d => setPlans(Array.isArray(d) ? d : []))
            .catch(err => console.error('Failed to load plans', err))
    }, [])

    const fetchReport = async (planId, status) => {
        setReport(null)
        setLoading(true)
        try {
            const query = status !== 'ALL' ? `?status=${status}` : ''
            const res = await api.get(`/api/plans/${planId}/report${query}`)
            if (!res.ok) return
            const data = await res.json()
            setReport(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load report', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan)
        setStatusFilter('ALL')
        fetchReport(plan.id, 'ALL')
    }

    const handleStatusFilterChange = (status) => {
        setStatusFilter(status)
        if (selectedPlan) fetchReport(selectedPlan.id, status)
    }

    return (
        <div className="grid grid-cols-3 w-full h-full gap-8 px-8 py-8 bg-neutral-800 overflow-hidden">

            {/* Plan selector */}
            <div className="bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                    <h1 className="text-white font-bold text-xl tracking-wide">Plans</h1>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-3 flex flex-col gap-1.5">
                    {plans.length === 0
                        ? <p className="text-neutral-400 text-sm p-1">No plans found</p>
                        : plans.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleSelectPlan(p)}
                                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                                    selectedPlan?.id === p.id
                                        ? 'bg-blue-700 text-white'
                                        : 'text-neutral-300 hover:bg-neutral-500'
                                }`}
                            >
                                <span className="font-medium">{p.name}</span>
                                {p.targetStartDate && (
                                    <span className="text-xs text-neutral-400 ml-2">{p.targetStartDate}</span>
                                )}
                            </button>
                        ))
                    }
                </div>
            </div>

            {/* Report output */}
            <div className="col-span-2 bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex flex-col gap-2">
                    <h1 className="text-white font-bold text-xl tracking-wide">
                        {selectedPlan ? `${selectedPlan.name} — Summary Report` : 'Summary Report'}
                    </h1>
                    {selectedPlan && (
                        <div className="flex flex-wrap gap-1">
                            {STATUS_FILTERS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleStatusFilterChange(s)}
                                    className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
                                        statusFilter === s
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-neutral-600 text-neutral-300 hover:bg-neutral-500'
                                    }`}
                                >
                                    {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-4 flex flex-col gap-2">
                    {!selectedPlan && (
                        <p className="text-neutral-400">Select a plan to generate its report</p>
                    )}
                    {loading && <p className="text-neutral-400">Loading...</p>}
                    {!loading && report?.length === 0 && (
                        <p className="text-neutral-400">No nodes found</p>
                    )}
                    {!loading && report?.map((node, i) => {
                        const allocEntries = Object.entries(node.allocatedQuantityByResourceType ?? {})
                        return (
                            <div key={node.id ?? i} className="bg-neutral-700 rounded border border-neutral-500 p-3 flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${typeColors[node.type] ?? 'bg-neutral-600 text-neutral-200'}`}>
                                        {node.type}
                                    </span>
                                    <span className="text-white font-bold text-sm flex-1">{node.name}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${statusColors[node.status] ?? 'bg-neutral-600 text-neutral-200'}`}>
                                        {node.status}
                                    </span>
                                </div>
                                {allocEntries.length > 0 && (
                                    <div className="flex flex-col gap-0.5 pl-3 border-l border-neutral-500">
                                        {allocEntries.map(([rt, qty]) => (
                                            <p key={rt} className="text-neutral-400 text-xs">
                                                {rt}: <span className="text-neutral-200">{qty}</span>
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default Report
