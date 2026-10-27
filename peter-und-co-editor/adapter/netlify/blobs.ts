// KV über Netlify Blobs. Ohne Netlify-Umgebung (lokal) im Arbeitsspeicher.
import { getStore } from '@netlify/blobs';
import { type KV, speicherImRam } from '../../core/speicher.ts';

export function netlifyBlobs(name = 'peter-und-co-editor'): KV {
  let store: ReturnType<typeof getStore> | null | undefined;
  const ram = speicherImRam();
  const holen = () => {
    if (store === undefined) {
      try {
        store = getStore({ name, consistency: 'strong' });
      } catch {
        store = null;
      }
    }
    return store;
  };
  return {
    async get(k) {
      const s = holen();
      return s ? (((await s.get(k, { type: 'json' })) as never) ?? null) : ram.get(k);
    },
    async set(k, v) {
      const s = holen();
      if (!s) return ram.set(k, v);
      await (v === null ? s.delete(k) : s.setJSON(k, v));
    },
  };
}
