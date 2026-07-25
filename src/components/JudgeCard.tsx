import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  gameCount: number
}

export default function JudgeCard({ gameCount }: Props) {
  const [qrCode, setQrCode] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number>()
  const publicUrl = window.location.origin

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(publicUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#29445e', light: '#fffdf7' },
      errorCorrectionLevel: 'M',
    }).then(dataUrl => {
      if (!cancelled) setQrCode(dataUrl)
    })
    return () => { cancelled = true }
  }, [publicUrl])

  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const copyLink = async () => {
    await navigator.clipboard?.writeText(publicUrl)
    setCopied(true)
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <section className="judge-card" aria-label="Open Flickcade on your phone">
      {qrCode && <img src={qrCode} alt={`QR code for ${publicUrl}`} width="94" height="94" />}
      <div>
        <strong>SCAN. PLAY. SWIPE.</strong>
        <span>{gameCount} games · no lobby · live ranks</span>
        <button onClick={copyLink}>{copied ? 'LINK COPIED!' : 'COPY JUDGE LINK'}</button>
      </div>
    </section>
  )
}
