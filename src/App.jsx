import { useState, useRef } from 'react'
import { Plus, Trash2, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight, Upload, Eye, EyeOff } from 'lucide-react'

function App() {
  const [jsonItems, setJsonItems] = useState([])
  const [inputText, setInputText] = useState('')
  const [error, setError] = useState('')
  const [expandedItems, setExpandedItems] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  const [ignoredFields, setIgnoredFields] = useState(new Set())
  const fileInputRef = useRef(null)

  const addJsonItem = () => {
    setError('')
    try {
      const parsed = JSON.parse(inputText)
      const newId = Date.now()
      setJsonItems([...jsonItems, { id: newId, data: parsed }])
      setExpandedItems({ ...expandedItems, [newId]: false })
      setInputText('')
    } catch (e) {
      setError('Invalid JSON: ' + e.message)
    }
  }

  const removeJsonItem = (id) => {
    setJsonItems(jsonItems.filter(item => item.id !== id))
    const newExpanded = { ...expandedItems }
    delete newExpanded[id]
    setExpandedItems(newExpanded)
  }

  const toggleItemExpanded = (id) => {
    setExpandedItems({ ...expandedItems, [id]: !expandedItems[id] })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result)
            const newId = Date.now() + Math.random()
            setJsonItems(prev => [...prev, { id: newId, data: parsed, fileName: file.name }])
            setExpandedItems(prev => ({ ...prev, [newId]: false }))
            setError('')
          } catch (e) {
            setError(`Error parsing ${file.name}: ${e.message}`)
          }
        }
        reader.readAsText(file)
      }
    })
  }

  const handleFileInput = (event) => {
    const files = Array.from(event.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result)
          const newId = Date.now() + Math.random()
          setJsonItems(prev => [...prev, { id: newId, data: parsed, fileName: file.name }])
          setExpandedItems(prev => ({ ...prev, [newId]: false }))
          setError('')
        } catch (err) {
          setError(`Error parsing ${file.name}: ${err.message}`)
        }
      }
      reader.readAsText(file)
    })
    event.target.value = ''
  }

  // Get all unique field paths (including nested and within arrays) across all JSON objects
  const getAllFieldPaths = (obj, prefix = '') => {
    const paths = []
    
    if (obj === null || obj === undefined) {
      return [prefix]
    }
    
    // Handle arrays - extract fields from first item as template
    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
        // Get paths from first array element
        return getAllFieldPaths(obj[0], prefix)
      }
      return [prefix]
    }
    
    if (typeof obj !== 'object') {
      return [prefix]
    }
    
    Object.keys(obj).forEach(key => {
      const newPrefix = prefix ? `${prefix}.${key}` : key
      const value = obj[key]
      
      if (value !== null && typeof value === 'object') {
        paths.push(...getAllFieldPaths(value, newPrefix))
      } else {
        paths.push(newPrefix)
      }
    })
    
    return paths
  }

  const getAllFields = () => {
    const fields = new Set()
    jsonItems.forEach(item => {
      const paths = getAllFieldPaths(item.data)
      paths.forEach(path => fields.add(path))
    })
    return Array.from(fields).sort()
  }

  const getValueAtPath = (obj, path) => {
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined
      }
      
      // If current is an array, extract from all items
      if (Array.isArray(current)) {
        return current.map(item => {
          if (item && typeof item === 'object') {
            return item[key]
          }
          return undefined
        })
      }
      
      current = current[key]
    }
    
    return current
  }

  // Compare a specific field path across all items
  const compareField = (fieldPath) => {
    if (jsonItems.length === 0) return { isConsistent: true, failingItems: [], values: [] }
    if (jsonItems.length === 1) return { isConsistent: true, failingItems: [], values: [] }

    const values = jsonItems.map((item, index) => ({
      index,
      id: item.id,
      value: getValueAtPath(item.data, fieldPath),
      stringValue: JSON.stringify(getValueAtPath(item.data, fieldPath))
    }))

    const firstValue = values[0].stringValue
    const failingItems = []

    values.forEach((item) => {
      if (item.stringValue !== firstValue) {
        failingItems.push(item.index)
      }
    })

    return {
      isConsistent: failingItems.length === 0,
      failingItems,
      values,
      referenceValue: firstValue
    }
  }

  const toggleFieldIgnored = (fieldPath) => {
    const newIgnored = new Set(ignoredFields)
    if (newIgnored.has(fieldPath)) {
      newIgnored.delete(fieldPath)
    } else {
      newIgnored.add(fieldPath)
    }
    setIgnoredFields(newIgnored)
  }

  const fields = getAllFields()
  const activeFields = fields.filter(field => !ignoredFields.has(field))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="text-white" size={28} />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Balance Checker</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Compare balance validation files and identify field differences with precision</p>
        </div>

        {/* Field Filter Section */}
        {fields.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Eye className="text-white" size={18} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Field Filters</h2>
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{activeFields.length}</span> of <span className="font-semibold">{fields.length}</span> fields active
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {fields.map(field => {
                const isIgnored = ignoredFields.has(field)
                return (
                  <button
                    key={field}
                    onClick={() => toggleFieldIgnored(field)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all hover:shadow-md ${
                      isIgnored
                        ? 'border-slate-300 bg-slate-100 text-slate-500 hover:border-slate-400'
                        : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300'
                    }`}
                  >
                    {isIgnored ? (
                      <EyeOff size={16} className="flex-shrink-0" />
                    ) : (
                      <Eye size={16} className="flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium break-all">{field}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Field Comparison - Moved to Top */}
        {activeFields.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="text-white" size={18} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Field Comparison Results</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeFields.map(field => {
                const comparison = compareField(field)
                return (
                  <div
                    key={field}
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      comparison.isConsistent
                        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300'
                        : 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-800 break-all text-sm">{field}</h3>
                      {comparison.isConsistent ? (
                        <CheckCircle2 className="flex-shrink-0 text-green-600" size={20} />
                      ) : (
                        <XCircle className="flex-shrink-0 text-red-600" size={20} />
                      )}
                    </div>
                    
                    {comparison.isConsistent ? (
                      <div className="text-sm text-green-700">
                        <p className="font-medium mb-1">✓ Consistent</p>
                        <p className="text-xs text-green-600 font-mono break-all">
                          {comparison.referenceValue}
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-red-700">
                        <p className="font-medium mb-2">✗ Inconsistent</p>
                        <div className="space-y-2">
                          {comparison.values.map((val, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold">Item {val.index}:</span>
                              <span className="ml-1 font-mono text-red-800">{val.stringValue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Input Section with Drag & Drop */}
        <div 
          className={`bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8 transition-all ${
            isDragging ? 'ring-4 ring-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' : 'hover:shadow-xl'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Plus className="text-white" size={18} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Add Balance Files</h2>
          </div>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="text-blue-600" size={32} />
              </div>
              <p className="text-lg font-semibold text-slate-700 mb-2">Drop your balance files here</p>
              <p className="text-sm text-slate-500 mb-4">Supports JSON files • Multiple files allowed</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg"
              >
                Browse Files
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">or paste JSON</span>
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='Paste your JSON here, e.g., {"name": "John", "age": 30}'
              className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <button
              onClick={addJsonItem}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
            >
              <Plus size={20} />
              Add Balance Data
            </button>
          </div>
        </div>

        {/* JSON Items List - Collapsible */}
        {jsonItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{jsonItems.length}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                Balance Files ({jsonItems.length})
              </h2>
            </div>
            <div className="space-y-3">
              {jsonItems.map((item, index) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 transition-all duration-200">
                    <button
                      onClick={() => toggleItemExpanded(item.id)}
                      className="flex-shrink-0 p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                      {expandedItems[item.id] ? (
                        <ChevronDown size={20} className="text-slate-600" />
                      ) : (
                        <ChevronRight size={20} className="text-slate-600" />
                      )}
                    </button>
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.fileName && (
                        <p className="text-sm font-medium text-slate-700 truncate">{item.fileName}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {Object.keys(item.data).length} fields
                      </p>
                    </div>
                    <button
                      onClick={() => removeJsonItem(item.id)}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {expandedItems[item.id] && (
                    <div className="p-4 bg-white border-t border-slate-200">
                      <pre className="text-sm font-mono text-slate-700 overflow-x-auto">
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {jsonItems.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Ready to Compare Balance Files</h3>
              <p className="text-slate-600 text-lg">
                Upload your balance validation files to start comparing field differences
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
