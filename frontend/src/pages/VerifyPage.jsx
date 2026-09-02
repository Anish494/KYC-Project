import { useState, useRef } from "react"
import axios from "axios"

export default function VerifyPage({ onResult }) {
  const [form, setForm] = useState({
    name: "", fname: "", mname: "", c_no: "", gender: ""
  })
  const [frontImage, setFrontImage]     = useState(null)
  const [selfieImage, setSelfieImage]   = useState(null)
  const [selfieMode, setSelfieMode]     = useState("upload")
  const [cameraActive, setCameraActive] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState("")

  const videoRef  = useRef(null)
  const streamRef = useRef(null)

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch (err) {
      setError("Camera access denied. Please allow camera permission.")
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  function capturePhoto() {
    const canvas = document.createElement("canvas")
    canvas.width  = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" })
      setSelfieImage(file)
      stopCamera()
    }, "image/jpeg")
  }

  function handleSelfieMode(mode) {
    setSelfieMode(mode)
    setSelfieImage(null)
    if (mode === "upload") stopCamera()
    if (mode === "camera") startCamera()
  }

  async function handleSubmit() {
    if (!frontImage || !selfieImage) {
      setError("Please upload citizenship image and provide a selfie")
      return
    }
    if (!form.name || !form.fname || !form.mname || !form.c_no || !form.gender) {
      setError("Please fill all fields")
      return
    }

    setError("")
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("citizenship_front", frontImage)
      formData.append("selfie",  selfieImage)
      formData.append("name",    form.name)
      formData.append("fname",   form.fname)
      formData.append("mname",   form.mname)
      formData.append("c_no",    form.c_no)
      formData.append("gender",  form.gender)

      const response = await axios.post("http://localhost:8000/verify", formData)
      onResult(response.data)
    } catch (err) {
      setError("Server error. Make sure backend is running.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">E-KYC Verification</h1>
        <p className="text-gray-500 mt-2">Nepali Citizenship Document Verification</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 space-y-6">

        {/* Image Uploads */}
        <div className="grid grid-cols-2 gap-4">

          {/* Citizenship Front */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Citizenship Front
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl h-36 cursor-pointer hover:border-blue-400 transition overflow-hidden">
              {frontImage ? (
                <img
                  src={URL.createObjectURL(frontImage)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Click to upload</p>
                  <p className="text-gray-300 text-xs mt-1">JPG, PNG</p>
                </div>
              )}
              <input
                type="file" accept="image/*" className="hidden"
                onChange={e => setFrontImage(e.target.files[0])}
              />
            </label>
          </div>

          {/* Selfie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selfie
            </label>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => handleSelfieMode("upload")}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
                  selfieMode === "upload"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-500 border-gray-300 hover:border-blue-400"
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => handleSelfieMode("camera")}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
                  selfieMode === "camera"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-500 border-gray-300 hover:border-blue-400"
                }`}
              >
                📷 Camera
              </button>
            </div>

            {/* Upload mode */}
            {selfieMode === "upload" && (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl h-28 cursor-pointer hover:border-blue-400 transition overflow-hidden">
                {selfieImage ? (
                  <img
                    src={URL.createObjectURL(selfieImage)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Click to upload</p>
                    <p className="text-gray-300 text-xs mt-1">JPG, PNG</p>
                  </div>
                )}
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={e => setSelfieImage(e.target.files[0])}
                />
              </label>
            )}

            {/* Camera mode */}
            {selfieMode === "camera" && (
              <div className="relative border-2 border-gray-300 rounded-xl h-28 overflow-hidden bg-black">
                {selfieImage ? (
                  <img
                    src={URL.createObjectURL(selfieImage)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                )}

                {cameraActive && !selfieImage && (
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white text-xs px-3 py-1 rounded-full shadow font-medium hover:bg-gray-100"
                  >
                    📸 Capture
                  </button>
                )}

                {selfieImage && (
                  <button
                    onClick={() => { setSelfieImage(null); startCamera() }}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white text-xs px-3 py-1 rounded-full shadow font-medium hover:bg-gray-100"
                  >
                    Retake
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-gray-400">(नाम)</span>
            </label>
            <input
              name="name" value={form.name} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="पूरा नाम"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Father's Name <span className="text-gray-400">(बाबुको नाम)</span>
            </label>
            <input
              name="fname" value={form.fname} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="बाबुको नाम"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mother's Name <span className="text-gray-400">(आमाको नाम)</span>
            </label>
            <input
              name="mname" value={form.mname} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="आमाको नाम"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Citizenship No <span className="text-gray-400">(नागरिकता नम्बर)</span>
            </label>
            <input
              name="c_no" value={form.c_no} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="नागरिकता नम्बर"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender <span className="text-gray-400">(लिङ्ग)</span>
            </label>
            <select
              name="gender" value={form.gender} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select gender</option>
              <option value="पुरुष">पुरुष (Male)</option>
              <option value="महिला">महिला (Female)</option>
              <option value="अन्य">अन्य (Other)</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Verifying...
            </span>
          ) : "Verify Identity"}
        </button>

      </div>
    </div>
  )
}