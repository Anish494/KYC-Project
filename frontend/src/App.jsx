import { useState } from "react"
import VerifyPage from "./pages/VerifyPage"
import ResultPage from "./pages/ResultPage"

export default function App() {
  const [result, setResult] = useState(null)
  const [page, setPage] = useState("verify")

  function handleResult(data) {
    setResult(data)
    setPage("result")
  }

  function handleReset() {
    setResult(null)
    setPage("verify")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {page === "verify" && <VerifyPage onResult={handleResult} />}
      {page === "result" && <ResultPage result={result} onReset={handleReset} />}
    </div>
  )
}