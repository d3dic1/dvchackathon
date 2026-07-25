export function hapticLight() {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(10) } catch {}
  }
}

export function hapticMedium() {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(25) } catch {}
  }
}

export function hapticError() {
  if ('vibrate' in navigator) {
    try { navigator.vibrate([30, 20, 50]) } catch {}
  }
}
