const KEY = 'ttg_device_id'

function generate(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = generate()
    localStorage.setItem(KEY, id)
  }
  return id
}
