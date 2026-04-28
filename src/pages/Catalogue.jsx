import { useState, useEffect } from 'react'
import api from '../api'

function Catalogue() {
    const [protocols, setProtocols] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [expandedIds, setExpandedIds] = useState(new Set())
    const [jsonText, setJsonText] = useState('')

    const fetchProtocols = async () => {
        try {
            const res = await api.get('/api/protocols')
            const data = await res.json()
            setProtocols(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load protocols', err)
        }
    }

    useEffect(() => {
        fetchProtocols()
    }, [])

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleCreate = async () => {
        setLoading(true)
        setError('')
        let parsed
        try {
            parsed = JSON.parse(jsonText)
        } catch {
            setError('Invalid JSON')
            setLoading(false)
            return
        }
        try {
            const res = await api.post('/api/protocols', parsed)
            if (!res.ok) throw new Error(await res.text())
            setJsonText('')
            fetchProtocols()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-3 w-full h-full gap-8 px-8 py-8 bg-neutral-800 overflow-hidden">

            {/* Protocol list */}
            <div className="col-span-2 bg-neutral-600 rounded overflow-hidden flex flex-col min-h-0">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500">
                    <h1 className="text-white font-bold text-xl tracking-wide">Protocols</h1>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-4 flex flex-col gap-2">
                    {protocols.length === 0
                        ? <p className="text-neutral-400 p-2">No protocols found</p>
                        : protocols.map(p => (
                            <div key={p.id} className="bg-neutral-700 rounded border border-neutral-500 p-3 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-white font-bold text-base">{p.name}</h2>
                                        {p.steps?.length > 0 && (
                                            <span className="text-xs bg-neutral-600 text-neutral-300 px-2 py-0.5 rounded">
                                                {p.steps.length} step{p.steps.length !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    {p.steps?.length > 0 && (
                                        <button
                                            onClick={() => toggleExpand(p.id)}
                                            className="text-xs text-neutral-400 hover:text-white transition-colors"
                                        >
                                            {expandedIds.has(p.id) ? 'Hide steps' : 'Show steps'}
                                        </button>
                                    )}
                                </div>
                                {p.description && (
                                    <p className="text-neutral-400 text-xs">{p.description}</p>
                                )}
                                {expandedIds.has(p.id) && p.steps?.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-1 pl-3 border-l border-neutral-500">
                                        {p.steps.map((step, idx) => (
                                            <div key={step.id} className="text-xs text-neutral-300">
                                                <span className="text-neutral-500 mr-1">{idx + 1}.</span>
                                                <span className="font-medium text-white">{step.subProtocol?.name}</span>
                                                {step.dependsOn?.length > 0 && (
                                                    <span className="text-neutral-400 ml-1">
                                                        — after step{step.dependsOn.length !== 1 ? 's' : ''} {step.dependsOn.map(d => d + 1).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* JSON editor panel */}
            <div className="flex flex-col min-h-0 bg-neutral-600 rounded overflow-hidden">
                <div className="bg-neutral-700 px-4 py-3 border-b border-neutral-500 flex items-center justify-between shrink-0">
                    <h1 className="text-white font-bold text-2xl tracking-wide">Protocol Editor</h1>
                    {jsonText && (
                        <button
                            onClick={() => { setJsonText(''); setError('') }}
                            className="text-xs text-neutral-400 hover:text-white transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">
                    <textarea
                        value={jsonText}
                        onChange={(e) => { setJsonText(e.target.value); setError('') }}
                        placeholder={'{\n  "name": "",\n  "description": "",\n  "steps": []\n}'}
                        className="flex-1 min-h-0 w-full px-3 py-2 rounded-md bg-neutral-700 text-white font-mono text-xs border border-neutral-500 focus:outline-none focus:border-neutral-300 resize-none"
                        spellCheck={false}
                    />
                    {error && <p className="text-red-400 text-sm shrink-0">{error}</p>}
                    <button
                        onClick={handleCreate}
                        disabled={loading || !jsonText.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:opacity-50 shrink-0"
                    >
                        {loading ? 'Creating...' : 'Create Protocol'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Catalogue
