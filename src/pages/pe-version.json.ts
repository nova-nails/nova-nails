// Welcher Stand ist online? Der Bearbeiten-Modus vergleicht das mit dem neusten Stand auf GitHub.
import { buildInfo } from '../../peter-und-co-editor/build/build-info';

export const GET = () => new Response(JSON.stringify({ commit: buildInfo().commit }), { headers: { 'Content-Type': 'application/json' } });
