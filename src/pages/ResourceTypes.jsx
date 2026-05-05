import { useState, useEffect } from 'react'
import api from '../api'

const kindColors = {
    ASSET: 'bg-green-800 text-green-200',
    CONSUMABLE: 'bg-amber-800 text-amber-200',
}

function ResourceTypes() {
    const [resourceTypes, setResourceTypes] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState(null)

    const [name, setName] = useState('')
    const [kind, setKind] = useState('ASSET')
    const [unitOfMeasure, setUnitOfMeasure] = useState('')
    const [unitCost, setUnitCost] = useState('')

    const fetchResourceTypes = async () => {
        try {
            const res = await api.get('/api/resource-types')
            const data = await res.json()
            setResourceTypes(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load resource types', err)
        }
    }

    useEffect(() => {
        fetchResourceTypes()
    }, [])

    const handleEdit = (rt) => {
        setEditingId(rt.id)
        setName(rt.name)
        setKind(rt.kind)
        setUnitOfMeasure(rt.unitOfMeasure)
        setUnitCost(rt.unitCost != null ? String(rt.unitCost) : '')
        setError('')
    }

    const handleClear = () => {
        setEditingId(null)
        setName('')
        setKind('ASSET')
        setUnitOfMeasure('')
        setUnitCost('')
        setError('')
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const body = {
                name,
                kind,
                unitOfMeasure,
                ...(unitCost !== '' ? { unitCost: parseFloat(unitCost) } : {}),
            }
            const res = editingId
                ? await api.put(`/api/resource-types/${editingId}`, body)
                : await api.post('/api/resource-types', body)
            if (!res.ok) throw new Error(await res.text())
            handleClear()
            fetchResourceTypes()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            const res = await api.delete(`/api/resource-types/${id}`)
            if (!res.ok) throw new Error(await res.text())
            if (editingId === id) handleClear()
            fetchResourceTypes()
        } catch (err) {
            console.error('Failed to delete resource type', err)
        }
    }

    return (
        <div className="grid grid-cols-3 w-full h-full gap-8 px-8 py-8 bg-neutral-800 overflow-hidden">

            {/* Resource type list */}
            <div className="col-span-2 bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                    <h1 className="text-white font-bold text-xl tracking-wide">Resource Types</h1>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-4 flex flex-col gap-2">
                    {resourceTypes.length === 0
                        ? <p className="text-neutral-400 p-2">No resource types found</p>
                        : resourceTypes.map(rt => (
                            <div key={rt.id} className="bg-neutral-700 rounded border border-neutral-500 p-3 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-white font-bold text-base">{rt.name}</h2>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${kindColors[rt.kind] ?? 'bg-neutral-600 text-neutral-200'}`}>
                                            {rt.kind}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleEdit(rt)}
                                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rt.id)}
                                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <p className="text-neutral-400 text-xs">Unit: {rt.unitOfMeasure}{rt.unitCost != null ? ` · $${Number(rt.unitCost).toFixed(2)} / unit` : ''}</p>
                                {rt.poolAccountId != null && (
                                    <p className="text-neutral-400 text-xs">Pool account: {rt.poolAccountId}</p>
                                )}
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* Form panel */}
            <div className="flex flex-col min-h-0 bg-neutral-600 rounded overflow-hidden">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-white font-bold text-2xl tracking-wide">Resource Type Editor</h1>
                        <p className="text-neutral-400 text-xs mt-0.5">
                            {editingId ? `Editing: ${name}` : 'New resource type'}
                        </p>
                    </div>
                    {editingId && (
                        <button
                            onClick={handleClear}
                            className="text-xs text-neutral-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
                <form onSubmit={handleSave} className="p-4 space-y-3">
                    <div>
                        <label className="block text-white text-sm font-bold mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-white text-sm font-bold mb-1">Kind</label>
                        <select
                            value={kind}
                            onChange={(e) => setKind(e.target.value)}
                            className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                        >
                            <option value="ASSET">ASSET</option>
                            <option value="CONSUMABLE">CONSUMABLE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-white text-sm font-bold mb-1">Unit of Measure</label>
                        <input
                            type="text"
                            value={unitOfMeasure}
                            onChange={(e) => setUnitOfMeasure(e.target.value)}
                            className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-white text-sm font-bold mb-1">Unit Cost <span className="text-neutral-400 font-normal">(optional)</span></label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={unitCost}
                            onChange={(e) => setUnitCost(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 rounded-md bg-neutral-700 text-white border border-neutral-500 focus:outline-none focus:border-neutral-300"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Resource Type'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ResourceTypes
