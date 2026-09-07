import { useState, useRef, useEffect } from "react"
import axios from "axios"

export default function VerifyPage({ onResult }) {
  const [form, setForm] = useState({
    name: "", fname: "", mname: "", c_no: "", gender: ""
  })
  const [frontImage, setFrontImage]       = useState(null)
  const [selfieImage, setSelfieImage]     = useState(null)
  const [selfieMode, setSelfieMode]       = useState("upload")
  const [cameraActive, setCameraActive]   = useState(false)
  const [instruction, setInstruction]     = useState("Position your face in the frame")
  const [faceDetected, setFaceDetected]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState("")
  const [movementBonus, setMovementBonus] = useState(0)

  const videoRef       = useRef(null)
  const canvasRef      = useRef(null)
  const streamRef      = useRef(null)
  const initialPosRef  = useRef(null)
  const capturedRef    = useRef(false)
  const animFrameRef   = useRef(null)

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      })
      streamRef.current  = stream
      videoRef.current.srcObject = stream
      setCameraActive(true)
      capturedRef.current = false
      initialPosRef.current = null
      setInstruction("Position your face in the frame")
      setFaceDetected(false)
      startFaceTracking()
    } catch (err) {
      setError("Camera access denied. Please allow camera permission.")
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    setCameraActive(false)
  }

  function startFaceTracking() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext("2d")

    function detectFace() {
      if (!streamRef.current || capturedRef.current) return

      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const cx = estimateFaceCenter(imageData, canvas.width, canvas.height)

      if (cx) {
        setFaceDetected(true)

        if (!initialPosRef.current) {
          initialPosRef.current = cx
          setInstruction("Now slowly move your head")
        } else {
          const dx = Math.abs(cx.x - initialPosRef.current.x)
          const dy = Math.abs(cx.y - initialPosRef.current.y)

          if (dx > 30 || dy > 30) {
            // Movement detected — auto capture
            autoCaptureFrame(canvas)
            return
          }
        }
      } else {
        setFaceDetected(false)
        setInstruction("Position your face in the frame")
        initialPosRef.current = null
      }

      animFrameRef.current = requestAnimationFrame(detectFace)
    }

    video.onloadeddata = () => {
      animFrameRef.current = requestAnimationFrame(detectFace)
    }
  }

  // Simple skin-tone based face center estimation
  function estimateFaceCenter(imageData, w, h) {
    const data = imageData.data
    let sumX = 0, sumY = 0, count = 0

    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const i = (y * w + x) * 4
        const r = data[i], g = data[i+1], b = data[i+2]
        // Skin tone detection heuristic
        if (r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15 &&
            r - b > 15) {
          sumX += x
          sumY += y
          count++
        }
      }
    }

    if (count < 200) return null
    return { x: sumX / count, y: sumY / count }
  }

  function autoCaptureFrame(canvas) {
    if (capturedRef.current) return
    capturedRef.current = true

    setInstruction("Movement detected! Capturing...")
    setMovementBonus(0.7)

    canvas.toBlob(blob => {
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" })
      setSelfieImage(file)
      stopCamera()
      setInstruction("Selfie captured successfully!")
    }, "image/jpeg", 0.95)
  }

  function handleSelfieMode(mode) {
    setSelfieMode(mode)
    setSelfieImage(null)
    setMovementBonus(0)
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
      formData.append("movement_bonus", movementBonus.toString())

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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">E-KYC Verification</h1>
        <p className="text-gray-500 mt-2">Nepali Citizenship Document Verification</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 space-y-6">

        <div className="grid grid-cols-2 gap-4">

          {/* Citizenship Front */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Citizenship Front
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl h-36 cursor-pointer hover:border-blue-400 transition overflow-hidden">
              {frontImage ? (
                <img src={URL.createObjectURL(frontImage)} className="h-full w-full object-cover"/>
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Click to upload</p>
                  <p className="text-gray-300 text-xs mt-1">JPG, PNG</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => setFrontImage(e.target.files[0])}/>
            </label>
          </div>

          {/* Selfie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selfie</label>

            <div className="flex gap-2 mb-2">
              <button onClick={() => handleSelfieMode("upload")}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition ${selfieMode === "upload" ? "bg-blue-600 text-white border-blue-600" : "text-gray-500 border-gray-300"}`}>
                Upload
              </button>
              <button onClick={() => handleSelfieMode("camera")}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition ${selfieMode === "camera" ? "bg-blue-600 text-white border-blue-600" : "text-gray-500 border-gray-300"}`}>
                📷 Camera
              </button>
            </div>

            {selfieMode === "upload" && (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl h-28 cursor-pointer hover:border-blue-400 transition overflow-hidden">
                {selfieImage ? (
                  <img src={URL.createObjectURL(selfieImage)} className="h-full w-full object-cover"/>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Click to upload</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => setSelfieImage(e.target.files[0])}/>
              </label>
            )}

            {selfieMode === "camera" && (
              <div className="relative border-2 border-gray-300 rounded-xl overflow-hidden bg-black">
                {selfieImage ? (
                  <div>
                    <img src={URL.createObjectURL(selfieImage)} className="w-full object-cover h-28"/>
                    <button
                      onClick={() => { setSelfieImage(null); setMovementBonus(0); startCamera() }}
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white text-xs px-3 py-1 rounded-full shadow">
                      Retake
                    </button>
                  </div>
                ) : (
                  <div>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-28 object-cover"/>
                    <canvas ref={canvasRef} className="hidden"/>
                    {cameraActive && (
                      <div className={`absolute bottom-2 left-0 right-0 text-center`}>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          faceDetected ? "bg-green-500 text-white" : "bg-yellow-400 text-gray-800"
                        }`}>
                          {instruction}
                        </span>
                      </div>
                    )}
                  </div>
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
            <input name="name" value={form.name} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="पूरा नाम"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Father's Name <span className="text-gray-400">(बाबुको नाम)</span>
            </label>
            <input name="fname" value={form.fname} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="बाबुको नाम"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mother's Name <span className="text-gray-400">(आमाको नाम)</span>
            </label>
            <input name="mname" value={form.mname} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="आमाको नाम"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Citizenship No <span className="text-gray-400">(नागरिकता नम्बर)</span>
            </label>
            <input name="c_no" value={form.c_no} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="नागरिकता नम्बर"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender <span className="text-gray-400">(लिङ्ग)</span>
            </label>
            <select name="gender" value={form.gender} onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Select gender</option>
              <option value="पुरुष">पुरुष (Male)</option>
              <option value="महिला">महिला (Female)</option>
              <option value="अन्य">अन्य (Other)</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
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