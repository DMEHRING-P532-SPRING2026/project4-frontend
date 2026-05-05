import { useState, useEffect } from 'react'
import api from '../api'

const statusColors = {
    PROPOSED:          'bg-neutral-600 text-neutral-200',
    PENDING_APPROVAL:  'bg-yellow-800 text-yellow-200',
    IN_PROGRESS:       'bg-blue-800 text-blue-200',
    SUSPENDED:         'bg-amber-800 text-amber-200',
    COMPLETED:         'bg-green-800 text-green-200',
    ABANDONED:         'bg-red-800 text-red-200',
    REOPENED:          'bg-cyan-800 text-cyan-200',
}

const typeColors = {
    PLAN:   'bg-purple-800 text-purple-200',
    ACTION: 'bg-neutral-500 text-neutral-200',
}

const actionTransitions = {
    PROPOSED:         ['submitForApproval'],
    PENDING_APPROVAL: ['approve', 'reject'],
    IN_PROGRESS:      ['complete', 'suspend'],
    SUSPENDED:        ['resume'],
    COMPLETED:        ['reopen'],
    ABANDONED:        [],
    REOPENED:         ['complete'],
}

const transitionEndpoint = {
    submitForApproval: 'submit-for-approval',
}

const transitionLabel = {
    submitForApproval: 'Submit for Approval',
}

const transitionStyle = {
    submitForApproval: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    approve:           'bg-green-600 hover:bg-green-700 text-white',
    reject:            'bg-orange-600 hover:bg-orange-700 text-white',
    complete:          'bg-green-700 hover:bg-green-800 text-white',
    suspend:           'bg-amber-700 hover:bg-amber-800 text-white',
    resume:            'bg-blue-600 hover:bg-blue-700 text-white',
    reopen:            'bg-cyan-700 hover:bg-cyan-800 text-white',
    abandon:           'bg-red-700 hover:bg-red-800 text-white',
}

function DiffTable({ planned, actual }) {
    const keys = [...new Set([...Object.keys(planned), ...Object.keys(actual)])]
    return (
        <div className="flex flex-col gap-1">
            <div className="grid grid-cols-3 gap-2 text-xs text-neutral-500 pb-1 border-b border-neutral-600">
                <span className="font-bold">Field</span>
                <span>Planned</span>
                <span>Actual</span>
            </div>
            {keys.map(k => {
                const p = planned[k]
                const a = actual[k]
                if (p == null && a == null) return null
                const differs = String(p ?? '') !== String(a ?? '')
                return (
                    <div key={k} className="grid grid-cols-3 gap-2 text-xs items-start">
                        <span className="text-neutral-400 font-bold capitalize">{k}</span>
                        <span className="text-neutral-300">{p ?? <span className="text-neutral-600">—</span>}</span>
                        <span className={differs ? 'text-amber-400' : 'text-neutral-300'}>
                            {a ?? <span className="text-neutral-600">—</span>}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

function findNode(nodes, id) {
    for (const node of nodes) {
        if (node.type === 'ACTION' && node.id === id) return node
        if (node.children?.length) {
            const found = findNode(node.children, id)
            if (found) return found
        }
    }
    return null
}

function PlanNode({ node, depth = 0, selectedActionId, onSelectAction, onAdd }) {
    const [expanded, setExpanded] = useState(true)
    const hasChildren = node.children?.length > 0
    const isAction = node.type === 'ACTION'
    const isSelected = isAction && node.id === selectedActionId

    return (
        <div style={{ marginLeft: depth * 16 }}>
            <div
                onClick={isAction ? () => onSelectAction(node) : undefined}
                className={`flex items-center gap-2 py-1 px-1 rounded transition-colors
                    ${isAction ? 'cursor-pointer hover:bg-neutral-600' : ''}
                    ${isSelected ? 'bg-neutral-600 ring-1 ring-blue-500' : ''}`}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(x => !x) }}
                    className="text-neutral-400 text-xs w-3 shrink-0 text-left"
                >
                    {hasChildren ? (expanded ? '▾' : '▸') : ''}
                </button>
                <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${typeColors[node.type] ?? 'bg-neutral-600 text-neutral-200'}`}>
                    {node.type}
                </span>
                <span className="text-white text-sm flex-1">{node.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${statusColors[node.status] ?? 'bg-neutral-600 text-neutral-200'}`}>
                    {node.status}
                </span>
                {!isAction && (
                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onAdd(node, 'sub-plan')} className="text-xs text-neutral-400 hover:text-white transition-colors">+ Plan</button>
                        <button onClick={() => onAdd(node, 'action')} className="text-xs text-neutral-400 hover:text-white transition-colors">+ Action</button>
                    </div>
                )}
            </div>
            {expanded && hasChildren && (
                <div className="border-l border-neutral-500 ml-1.5">
                    {node.children.map(child => (
                        <PlanNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedActionId={selectedActionId}
                            onSelectAction={onSelectAction}
                            onAdd={onAdd}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function Plans() {
    const [plans, setPlans] = useState([])
    const [protocols, setProtocols] = useState([])
    const [resourceTypes, setResourceTypes] = useState([])
    const [expandedPlanIds, setExpandedPlanIds] = useState(new Set())
    const [treeDepth, setTreeDepth] = useState(null) // null = unlimited
    const [planTrees, setPlanTrees] = useState({})   // { [planId]: plan data from depth-limited fetch }
    const [selectedAction, setSelectedAction] = useState(null)
    const [addingTo, setAddingTo] = useState(null) // { planId, planName, mode: 'sub-plan'|'action' }
    const [metricsTarget, setMetricsTarget] = useState(null) // { planId }
    const [metrics, setMetrics] = useState(null)
    const [metricsLoading, setMetricsLoading] = useState(false)

    // add sub-plan form
    const [addPlanName, setAddPlanName] = useState('')
    const [addPlanSourceProtocolId, setAddPlanSourceProtocolId] = useState('')
    const [addPlanTargetStartDate, setAddPlanTargetStartDate] = useState('')

    // add action form
    const [addActionName, setAddActionName] = useState('')
    const [addActionParty, setAddActionParty] = useState('')
    const [addActionTimeRef, setAddActionTimeRef] = useState('')
    const [addActionLocation, setAddActionLocation] = useState('')

    const [addError, setAddError] = useState('')
    const [addLoading, setAddLoading] = useState(false)

    // new plan form
    const [planName, setPlanName] = useState('')
    const [sourceProtocolId, setSourceProtocolId] = useState('')
    const [targetStartDate, setTargetStartDate] = useState('')
    const [planError, setPlanError] = useState('')
    const [planLoading, setPlanLoading] = useState(false)

    // action panel
    const [actionError, setActionError] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [suspendReason, setSuspendReason] = useState('')
    const [showSuspendForm, setShowSuspendForm] = useState(false)
    const [actionDetails, setActionDetails] = useState(null)

    // allocation form
    const [allocResourceTypeId, setAllocResourceTypeId] = useState('')
    const [allocQuantity, setAllocQuantity] = useState('')
    const [allocKind, setAllocKind] = useState('GENERAL')
    const [allocAssetId, setAllocAssetId] = useState('')
    const [allocStartDate, setAllocStartDate] = useState('')
    const [allocStartTime, setAllocStartTime] = useState('')
    const [allocEndDate, setAllocEndDate] = useState('')
    const [allocEndTime, setAllocEndTime] = useState('')
    const [allocError, setAllocError] = useState('')
    const [allocLoading, setAllocLoading] = useState(false)

    const fetchPlans = async () => {
        try {
            const res = await api.get('/api/plans')
            if (!res.ok) return
            const data = await res.json()
            const list = Array.isArray(data) ? data : []
            setPlans(list)
            if (selectedAction) {
                const allChildren = list.flatMap(p => p.children ?? [])
                const updated = findNode(allChildren, selectedAction.id)
                if (updated) setSelectedAction(updated)
            }
        } catch (err) {
            console.error('Failed to load plans', err)
        }
    }

    useEffect(() => {
        fetchPlans()
        api.get('/api/protocols').then(r => r.json()).then(d => setProtocols(Array.isArray(d) ? d : [])).catch(() => {})
        api.get('/api/resource-types').then(r => r.json()).then(d => setResourceTypes(Array.isArray(d) ? d : [])).catch(() => {})
    }, [])

    const fetchPlanTree = async (planId, depth) => {
        try {
            const res = await api.get(`/api/plans/${planId}?depth=${depth}`)
            if (!res.ok) return
            const data = await res.json()
            setPlanTrees(prev => ({ ...prev, [planId]: data }))
        } catch (err) {
            console.error('Failed to load plan tree', err)
        }
    }

    const togglePlan = (id) => {
        const isExpanding = !expandedPlanIds.has(id)
        setExpandedPlanIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
        if (isExpanding && treeDepth !== null) fetchPlanTree(id, treeDepth)
    }

    const handleDepthChange = (depth) => {
        setTreeDepth(depth)
        if (depth !== null) {
            expandedPlanIds.forEach(id => fetchPlanTree(id, depth))
        }
    }

    const fetchMetrics = async (planId) => {
        setMetricsLoading(true)
        setMetrics(null)
        try {
            const res = await api.get(`/api/plans/${planId}/metrics`)
            if (!res.ok) return
            setMetrics(await res.json())
        } catch (err) {
            console.error('Failed to load metrics', err)
        } finally {
            setMetricsLoading(false)
        }
    }

    const handleShowMetrics = (plan) => {
        setSelectedAction(null)
        setAddingTo(null)
        setMetricsTarget({ planId: plan.id, planName: plan.name })
        fetchMetrics(plan.id)
    }

    const handleAdd = (node, mode) => {
        setSelectedAction(null)
        setAddError('')
        setAddPlanName(''); setAddPlanSourceProtocolId(''); setAddPlanTargetStartDate('')
        setAddActionName(''); setAddActionParty(''); setAddActionTimeRef(''); setAddActionLocation('')
        setAddingTo({ planId: node.id, planName: node.name, mode })
    }

    const handleAddSubPlanSubmit = async (e) => {
        e.preventDefault()
        setAddLoading(true)
        setAddError('')
        try {
            const body = {
                name: addPlanName,
                ...(addPlanTargetStartDate ? { targetStartDate: addPlanTargetStartDate } : {}),
                ...(addPlanSourceProtocolId ? { sourceProtocolId: parseInt(addPlanSourceProtocolId) } : {}),
            }
            const res = await api.post(`/api/plans/${addingTo.planId}/plans`, body)
            if (!res.ok) throw new Error(await res.text())
            setAddingTo(null)
            fetchPlans()
        } catch (err) {
            setAddError(err.message)
        } finally {
            setAddLoading(false)
        }
    }

    const handleAddActionSubmit = async (e) => {
        e.preventDefault()
        setAddLoading(true)
        setAddError('')
        try {
            const body = {
                name: addActionName,
                ...(addActionParty ? { party: addActionParty } : {}),
                ...(addActionTimeRef ? { timeRef: addActionTimeRef } : {}),
                ...(addActionLocation ? { location: addActionLocation } : {}),
            }
            const res = await api.post(`/api/plans/${addingTo.planId}/actions`, body)
            if (!res.ok) throw new Error(await res.text())
            setAddingTo(null)
            fetchPlans()
        } catch (err) {
            setAddError(err.message)
        } finally {
            setAddLoading(false)
        }
    }

    const fetchActionDetails = async (actionId) => {
        try {
            const res = await api.get(`/api/actions/${actionId}`)
            if (!res.ok) return
            setActionDetails(await res.json())
        } catch (err) {
            console.error('Failed to load action details', err)
        }
    }

    const handleSelectAction = (node) => {
        setSelectedAction(node)
        setActionError('')
        setAllocError('')
        setShowSuspendForm(false)
        setSuspendReason('')
        setActionDetails(null)
        fetchActionDetails(node.id)
    }

    const handlePlanSubmit = async (e) => {
        e.preventDefault()
        setPlanLoading(true)
        setPlanError('')
        try {
            const body = {
                name: planName,
                targetStartDate,
                ...(sourceProtocolId ? { sourceProtocolId: parseInt(sourceProtocolId) } : {}),
            }
            const res = await api.post('/api/plans', body)
            if (!res.ok) throw new Error(await res.text())
            setPlanName('')
            setSourceProtocolId('')
            setTargetStartDate('')
            fetchPlans()
        } catch (err) {
            setPlanError(err.message)
        } finally {
            setPlanLoading(false)
        }
    }

    const parseError = async (res) => {
        const text = await res.text()
        try {
            const json = JSON.parse(text)
            if (json.message) return json.message
        } catch {}
        if (res.status === 500) return 'Action could not be performed — a required dependency may not be completed yet.'
        return text || `Request failed (${res.status})`
    }

    const handleTransition = async (transition, body = {}) => {
        setActionLoading(true)
        setActionError('')
        try {
            const endpoint = transitionEndpoint[transition] ?? transition
            const res = await api.post(`/api/actions/${selectedAction.id}/${endpoint}`, body)
            if (!res.ok) throw new Error(await parseError(res))
            setShowSuspendForm(false)
            setSuspendReason('')
            await fetchPlans()
            fetchActionDetails(selectedAction.id)
        } catch (err) {
            setActionError(err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleAllocSubmit = async (e) => {
        e.preventDefault()
        setAllocLoading(true)
        setAllocError('')
        try {
            const startISO = allocStartDate
                ? new Date(`${allocStartDate}T${allocStartTime || '00:00'}`).toISOString()
                : null
            const endISO = allocEndDate
                ? new Date(`${allocEndDate}T${allocEndTime || '00:00'}`).toISOString()
                : null
            const body = {
                resourceTypeId: parseInt(allocResourceTypeId),
                quantity: parseFloat(allocQuantity),
                kind: allocKind,
                ...(allocKind === 'SPECIFIC' && allocAssetId ? { assetId: allocAssetId } : {}),
                ...(startISO ? { timePeriodStart: startISO } : {}),
                ...(endISO ? { timePeriodEnd: endISO } : {}),
            }
            const res = await api.post(`/api/actions/${selectedAction.id}/allocations`, body)
            if (!res.ok) throw new Error(await res.text())
            setAllocResourceTypeId('')
            setAllocQuantity('')
            setAllocKind('GENERAL')
            setAllocAssetId('')
            setAllocStartDate('')
            setAllocStartTime('')
            setAllocEndDate('')
            setAllocEndTime('')
            fetchActionDetails(selectedAction.id)
        } catch (err) {
            setAllocError(err.message)
        } finally {
            setAllocLoading(false)
        }
    }

    const validTransitions = actionTransitions[selectedAction?.status] ?? []
    const actionDone = ['COMPLETED', 'ABANDONED', 'PENDING_APPROVAL'].includes(selectedAction?.status)

    return (
        <div className="grid grid-cols-3 w-full h-full gap-8 px-8 py-8 bg-neutral-800 overflow-hidden">

            {/* Plan list */}
            <div className="col-span-2 bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex items-center justify-between gap-4">
                    <h1 className="text-white font-bold text-xl tracking-wide">Plans</h1>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-neutral-400 text-xs">Depth:</span>
                        <input
                            type="range"
                            min="-1"
                            max="3"
                            value={treeDepth ?? -1}
                            onChange={e => {
                                const v = parseInt(e.target.value)
                                handleDepthChange(v === -1 ? null : v)
                            }}
                            className="w-20 accent-blue-500"
                        />
                        <span className="text-neutral-300 text-xs font-bold w-6">
                            {treeDepth === null ? 'All' : treeDepth}
                        </span>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-4 flex flex-col gap-2">
                    {plans.length === 0
                        ? <p className="text-neutral-400 p-2">No plans found</p>
                        : plans.map(plan => (
                            <div key={plan.id} className="bg-neutral-700 rounded border border-neutral-500 p-3 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-white font-bold text-base">{plan.name}</h2>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[plan.status] ?? 'bg-neutral-600 text-neutral-200'}`}>
                                            {plan.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {plan.targetStartDate && (
                                            <span className="text-neutral-400 text-xs">{plan.targetStartDate}</span>
                                        )}
                                        <button onClick={() => handleAdd(plan, 'sub-plan')} className="text-xs text-neutral-400 hover:text-white transition-colors">+ Plan</button>
                                        <button onClick={() => handleAdd(plan, 'action')} className="text-xs text-neutral-400 hover:text-white transition-colors">+ Action</button>
                                        <button
                                            onClick={() => handleShowMetrics(plan)}
                                            className={`text-xs transition-colors ${metricsTarget?.planId === plan.id ? 'text-blue-400' : 'text-neutral-400 hover:text-white'}`}
                                        >
                                            Metrics
                                        </button>
                                        {plan.children?.length > 0 && (
                                            <button
                                                onClick={() => togglePlan(plan.id)}
                                                className="text-xs text-neutral-400 hover:text-white transition-colors"
                                            >
                                                {expandedPlanIds.has(plan.id) ? 'Hide' : 'Show'} tree
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {expandedPlanIds.has(plan.id) && (
                                    <div className="mt-2 pl-1">
                                        {(treeDepth !== null && planTrees[plan.id]
                                            ? planTrees[plan.id].children ?? []
                                            : plan.children ?? []
                                        ).map(child => (
                                            <PlanNode
                                                key={child.id}
                                                node={child}
                                                depth={0}
                                                selectedActionId={selectedAction?.id}
                                                onSelectAction={handleSelectAction}
                                                onAdd={handleAdd}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-col min-h-0 overflow-y-auto gap-4">

                {addingTo ? (
                    <div className="bg-neutral-600 rounded overflow-hidden shrink-0">
                        <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex items-center justify-between">
                            <div>
                                <h1 className="text-white font-bold text-2xl tracking-wide">
                                    {addingTo.mode === 'sub-plan' ? 'Add Sub-plan' : 'Add Action'}
                                </h1>
                                <p className="text-neutral-400 text-xs mt-0.5">to: {addingTo.planName}</p>
                            </div>
                            <button onClick={() => setAddingTo(null)} className="text-xs text-neutral-400 hover:text-white transition-colors">Cancel</button>
                        </div>

                        {addingTo.mode === 'sub-plan' ? (
                            <form onSubmit={handleAddSubPlanSubmit} className="p-4 space-y-3">
                                <div>
                                    <label className="block text-white text-sm font-bold mb-1">Name</label>
                                    <input type="text" value={addPlanName} onChange={e => setAddPlanName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300" required />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-bold mb-1">Source Protocol <span className="text-neutral-400 font-normal">(optional)</span></label>
                                    <select value={addPlanSourceProtocolId} onChange={e => setAddPlanSourceProtocolId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300">
                                        <option value="">None</option>
                                        {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-bold mb-1">Target Start Date <span className="text-neutral-400 font-normal">(optional)</span></label>
                                    <input type="date" value={addPlanTargetStartDate} onChange={e => setAddPlanTargetStartDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300" />
                                </div>
                                {addError && <p className="text-red-400 text-sm">{addError}</p>}
                                <button type="submit" disabled={addLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:opacity-50">
                                    {addLoading ? 'Adding...' : 'Add Sub-plan'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleAddActionSubmit} className="p-4 space-y-3">
                                <div>
                                    <label className="block text-white text-sm font-bold mb-1">Name</label>
                                    <input type="text" value={addActionName} onChange={e => setAddActionName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300" required />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-bold mb-1">Party <span className="text-neutral-400 font-normal">(optional)</span></label>
                                    <input type="text" value={addActionParty} onChange={e => setAddActionParty(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300" />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-bold mb-1">Time Ref <span className="text-neutral-400 font-normal">(optional)</span></label>
                                    <input type="text" value={addActionTimeRef} onChange={e => setAddActionTimeRef(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300" />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-bold mb-1">Location <span className="text-neutral-400 font-normal">(optional)</span></label>
                                    <input type="text" value={addActionLocation} onChange={e => setAddActionLocation(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300" />
                                </div>
                                {addError && <p className="text-red-400 text-sm">{addError}</p>}
                                <button type="submit" disabled={addLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:opacity-50">
                                    {addLoading ? 'Adding...' : 'Add Action'}
                                </button>
                            </form>
                        )}
                    </div>
                ) : selectedAction ? (
                    <>
                        {/* Action controls */}
                        <div className="bg-neutral-600 rounded overflow-hidden shrink-0">
                            <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex items-center justify-between">
                                <div>
                                    <h1 className="text-white font-bold text-xl tracking-wide">{selectedAction.name}</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[selectedAction.status] ?? 'bg-neutral-600 text-neutral-200'}`}>
                                            {selectedAction.status}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedAction(null)}
                                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                                >
                                    ← New Plan
                                </button>
                            </div>
                            <div className="p-4 flex flex-col gap-2">
                                {validTransitions.map(t => t === 'suspend' ? (
                                    showSuspendForm ? (
                                        <div key="suspend-form" className="flex flex-col gap-2">
                                            <input
                                                type="text"
                                                value={suspendReason}
                                                onChange={(e) => setSuspendReason(e.target.value)}
                                                placeholder="Reason for suspension"
                                                className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300 text-sm"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleTransition('suspend', { reason: suspendReason })}
                                                    disabled={actionLoading || !suspendReason.trim()}
                                                    className="flex-1 font-bold py-2 rounded disabled:opacity-50 bg-amber-700 hover:bg-amber-800 text-white text-sm"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => { setShowSuspendForm(false); setSuspendReason('') }}
                                                    className="px-3 py-2 rounded bg-neutral-600 hover:bg-neutral-500 text-white text-sm"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            key="suspend"
                                            onClick={() => setShowSuspendForm(true)}
                                            disabled={actionLoading}
                                            className="w-full font-bold py-2 rounded bg-amber-700 hover:bg-amber-800 text-white"
                                        >
                                            Suspend
                                        </button>
                                    )
                                ) : (
                                    <button
                                        key={t}
                                        onClick={() => handleTransition(t)}
                                        disabled={actionLoading}
                                        className={`w-full font-bold py-2 rounded capitalize disabled:opacity-50 ${transitionStyle[t]}`}
                                    >
                                        {transitionLabel[t] ?? (t.charAt(0).toUpperCase() + t.slice(1))}
                                    </button>
                                ))}
                                {!actionDone && (
                                    <>
                                        {validTransitions.length > 0 && <hr className="border-neutral-500" />}
                                        <button
                                            onClick={() => handleTransition('abandon')}
                                            disabled={actionLoading}
                                            className="w-full font-bold py-2 rounded disabled:opacity-50 bg-red-700 hover:bg-red-800 text-white"
                                        >
                                            Abandon
                                        </button>
                                    </>
                                )}
                                {actionError && <p className="text-red-400 text-sm">{actionError}</p>}
                            </div>
                        </div>

                        {/* Allocations list */}
                        <div className="bg-neutral-600 rounded overflow-hidden shrink-0">
                            <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                                <h2 className="text-white font-bold text-lg tracking-wide">Allocations</h2>
                            </div>
                            <div className="p-4 flex flex-col gap-2">
                                {(actionDetails?.allocations ?? []).length === 0
                                    ? <p className="text-neutral-400 text-sm">None</p>
                                    : (actionDetails?.allocations ?? []).map(a => (
                                        <div key={a.id} className="bg-neutral-700 rounded border border-neutral-500 p-2 flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white text-sm font-medium">{a.resourceTypeName}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.kind === 'SPECIFIC' ? 'bg-blue-800 text-blue-200' : 'bg-neutral-500 text-neutral-200'}`}>
                                                    {a.kind}
                                                </span>
                                            </div>
                                            <p className="text-neutral-400 text-xs">Qty: {a.quantity}</p>
                                            {a.assetId && <p className="text-neutral-400 text-xs">Asset: {a.assetId}</p>}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Plan vs reality diff */}
                        {actionDetails?.actualStart && (() => {
                            const planned = {
                                party:    actionDetails.plannedParty    ?? null,
                                location: actionDetails.plannedLocation ?? null,
                                time:     actionDetails.plannedTimeRef  ?? null,
                            }
                            const actual = {
                                party:    actionDetails.actualParty    ?? null,
                                location: actionDetails.actualLocation ?? null,
                                time:     new Date(actionDetails.actualStart).toLocaleString(),
                            }
                            return (
                                <div className="bg-neutral-600 rounded overflow-hidden shrink-0">
                                    <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                                        <h2 className="text-white font-bold text-lg tracking-wide">Plan vs Reality</h2>
                                    </div>
                                    <div className="p-4">
                                        <DiffTable planned={planned} actual={actual} />
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Allocation form */}
                        {!actionDone && (
                            <div className="bg-neutral-600 rounded overflow-hidden shrink-0">
                                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                                    <h2 className="text-white font-bold text-lg tracking-wide">Add Allocation</h2>
                                </div>
                                <form onSubmit={handleAllocSubmit} className="p-4 space-y-3">
                                    <div>
                                        <label className="block text-white text-sm font-bold mb-1">Resource Type</label>
                                        <select
                                            value={allocResourceTypeId}
                                            onChange={(e) => setAllocResourceTypeId(e.target.value)}
                                            className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {resourceTypes.map(rt => (
                                                <option key={rt.id} value={rt.id}>{rt.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-bold mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={allocQuantity}
                                            onChange={(e) => setAllocQuantity(e.target.value)}
                                            className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-bold mb-1">Kind</label>
                                        <select
                                            value={allocKind}
                                            onChange={(e) => { setAllocKind(e.target.value); setAllocAssetId('') }}
                                            className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                        >
                                            <option value="GENERAL">GENERAL</option>
                                            <option value="SPECIFIC">SPECIFIC</option>
                                        </select>
                                    </div>
                                    {allocKind === 'SPECIFIC' && (
                                        <div>
                                            <label className="block text-white text-sm font-bold mb-1">Asset ID</label>
                                            <input
                                                type="text"
                                                value={allocAssetId}
                                                onChange={(e) => setAllocAssetId(e.target.value)}
                                                className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                                required
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-white text-sm font-bold mb-1">Start <span className="text-neutral-400 font-normal">(optional)</span></label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={allocStartDate}
                                                onChange={(e) => setAllocStartDate(e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                            />
                                            <input
                                                type="time"
                                                value={allocStartTime}
                                                onChange={(e) => setAllocStartTime(e.target.value)}
                                                disabled={!allocStartDate}
                                                className="w-28 px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300 disabled:opacity-40"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-bold mb-1">End <span className="text-neutral-400 font-normal">(optional)</span></label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={allocEndDate}
                                                onChange={(e) => setAllocEndDate(e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                            />
                                            <input
                                                type="time"
                                                value={allocEndTime}
                                                onChange={(e) => setAllocEndTime(e.target.value)}
                                                disabled={!allocEndDate}
                                                className="w-28 px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300 disabled:opacity-40"
                                            />
                                        </div>
                                    </div>
                                    {allocError && <p className="text-red-400 text-sm">{allocError}</p>}
                                    <button
                                        type="submit"
                                        disabled={allocLoading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:opacity-50"
                                    >
                                        {allocLoading ? 'Attaching...' : 'Attach Allocation'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </>
                ) : metricsTarget ? (
                    <div className="bg-neutral-600 rounded overflow-hidden shrink-0">
                        <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex items-center justify-between">
                            <div>
                                <h1 className="text-white font-bold text-xl tracking-wide">{metricsTarget.planName}</h1>
                                <p className="text-neutral-400 text-xs mt-0.5">Metrics</p>
                            </div>
                            <div className="flex gap-3 items-center">
                                <button
                                    onClick={() => fetchMetrics(metricsTarget.planId)}
                                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                                >
                                    Refresh
                                </button>
                                <button
                                    onClick={() => { setMetricsTarget(null); setMetrics(null) }}
                                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex flex-col gap-4">
                            {metricsLoading && <p className="text-neutral-400 text-sm">Loading...</p>}
                            {!metricsLoading && metrics && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${typeColors[metrics.nodeType] ?? 'bg-neutral-600 text-neutral-200'}`}>
                                            {metrics.nodeType}
                                        </span>
                                        <span className="text-white font-bold text-sm">{metrics.nodeName}</span>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-neutral-400 font-bold">Completion</span>
                                            <span className="text-neutral-300">
                                                {metrics.completedLeaves} / {metrics.totalLeaves} ({(metrics.completionRatio * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-neutral-700 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min(metrics.completionRatio * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-neutral-700 rounded border border-neutral-500 p-3 flex flex-col gap-0.5">
                                            <span className="text-neutral-400 text-xs font-bold">Total Cost</span>
                                            <span className="text-white text-lg font-bold">
                                                {metrics.totalCost != null ? `$${Number(metrics.totalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                                            </span>
                                        </div>
                                        <div className="bg-neutral-700 rounded border border-neutral-500 p-3 flex flex-col gap-0.5">
                                            <span className="text-neutral-400 text-xs font-bold">Risk Score</span>
                                            <span className={`text-lg font-bold ${
                                                metrics.riskScore === 0 ? 'text-green-400'
                                                : metrics.riskScore <= 2 ? 'text-amber-400'
                                                : 'text-red-400'
                                            }`}>
                                                {metrics.riskScore ?? '—'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-neutral-700 rounded border border-neutral-500 p-3">
                                        <p className="text-neutral-400 text-xs font-bold mb-1">Leaves</p>
                                        <p className="text-white text-sm">{metrics.totalLeaves} total &mdash; {metrics.completedLeaves} completed</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    /* New plan form */
                    <div className="bg-neutral-600 rounded overflow-hidden">
                        <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 shrink-0">
                            <h1 className="text-white font-bold text-2xl tracking-wide">New Plan</h1>
                        </div>
                        <form onSubmit={handlePlanSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-white text-sm font-bold mb-1">Name</label>
                                <input
                                    type="text"
                                    value={planName}
                                    onChange={(e) => setPlanName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-white text-sm font-bold mb-1">Source Protocol <span className="text-neutral-400 font-normal">(optional)</span></label>
                                <select
                                    value={sourceProtocolId}
                                    onChange={(e) => setSourceProtocolId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                >
                                    <option value="">None</option>
                                    {protocols.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-white text-sm font-bold mb-1">Target Start Date</label>
                                <input
                                    type="date"
                                    value={targetStartDate}
                                    onChange={(e) => setTargetStartDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                                    required
                                />
                            </div>
                            {planError && <p className="text-red-400 text-sm">{planError}</p>}
                            <button
                                type="submit"
                                disabled={planLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:opacity-50"
                            >
                                {planLoading ? 'Creating...' : 'Create Plan'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Plans
