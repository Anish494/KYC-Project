export default function ResultPage({ result, onReset }) {
  const approved = result.status === "APPROVED"

  function ScoreBar({ score }) {
    const pct = Math.round(score * 100)
    const color = pct >= 60 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500"
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium w-10 text-right">{pct}%</span>
      </div>
    )
  }

  function StatusBadge({ value }) {
    return value
      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Pass</span>
      : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Fail</span>
  }

  const modules = [
    { key: "ocr",       label: "OCR Matching",      score: result.breakdown.ocr.score,       weight: "25%" },
    { key: "face",      label: "Face Matching",      score: result.breakdown.face.score,      weight: "25%" },
    { key: "liveness",  label: "Liveness Detection", score: result.breakdown.liveness.score,  weight: "20%" },
    { key: "stamp",     label: "Stamp Verification", score: result.breakdown.stamp.score,     weight: "15%" },
    { key: "tampering", label: "Tampering Detection",score: result.breakdown.tampering.score, weight: "15%" },
  ]

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">KYC Result</h1>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl p-8 text-center mb-6 ${approved ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className={`text-6xl mb-3`}>
          {approved ? "✅" : "❌"}
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${approved ? "text-green-700" : "text-red-700"}`}>
          {result.status}
        </h2>
        <p className="text-gray-600 text-sm">{result.reason}</p>
        <div className="mt-4">
          <span className="text-gray-500 text-sm">Overall Score: </span>
          <span className="font-bold text-lg">{Math.round(result.weighted_score * 100)}%</span>
        </div>
      </div>

      {/* Module Breakdown */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">Module Breakdown</h3>
        <div className="space-y-4">
          {modules.map(mod => (
            <div key={mod.key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">{mod.label}</span>
                <span className="text-xs text-gray-400">weight {mod.weight}</span>
              </div>
              <ScoreBar score={mod.score} />
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">Details</h3>
        <div className="space-y-3">

          {/* OCR Fields */}
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">OCR Field Matching</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.details.ocr.fields).map(([field, data]) => (
                <div key={field} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600 uppercase">{field}</span>
                  <StatusBadge value={data.match} />
                </div>
              ))}
            </div>
          </div>

          {/* Face */}
          <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-600">Face Match</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{Math.round(result.details.face.score * 100)}%</span>
              <StatusBadge value={result.details.face.match} />
            </div>
          </div>

          {/* Liveness */}
          <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-600">Liveness</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{result.details.liveness.label}</span>
              <StatusBadge value={result.details.liveness.is_live} />
            </div>
          </div>

          {/* Stamp */}
          <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-600">Stamp Genuine</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{Math.round(result.details.stamp.avg_score * 100)}%</span>
              <StatusBadge value={result.details.stamp.is_genuine} />
            </div>
          </div>

          {/* Tampering */}
          <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-600">Document Genuine</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{Math.round(result.details.tampering.genuine_score * 100)}%</span>
              <StatusBadge value={result.details.tampering.is_genuine} />
            </div>
          </div>

        </div>
      </div>

    

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-xl transition"
      >
        Verify Another
      </button>
    </div>
  )
}