import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
 
// Letölti és ellenőrzi a fájlt, mielőtt az FBXLoader megkapja, hogy a hiba érthető legyen.
export async function loadFbx(url: string) {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  const head = new TextDecoder().decode(buf.slice(0, 18))
  if (!res.ok || head !== 'Kaydara FBX Binary') {
    const preview = new TextDecoder().decode(buf.slice(0, 80)).replace(/\s+/g, ' ')
    throw new Error(
      `A(z) ${url} nem bináris FBX. Státusz: ${res.status}, típus: ${res.headers.get('content-type')}, ` +
        `méret: ${buf.byteLength} bájt (várt: 180764), eleje: "${preview}". ` +
        `Ha "<!doctype html" az eleje, a fájl nincs a public mappában ezen a néven.`
    )
  }
  return new FBXLoader().parse(buf, '')
}
