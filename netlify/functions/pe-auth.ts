// Bearbeiten-Modus (Peter & Co Editor), dünner Adapter, Logik in peter-und-co-editor/core.
import peConfig from '../../pe.config.ts';
import info from '../../peter-und-co-editor/generated/build-info.ts';
import { netlifyHandler } from '../../peter-und-co-editor/adapter/netlify/index.ts';

export default netlifyHandler(peConfig, info);
export const config = { path: ['/api/pe/login', '/api/pe/logout', '/api/pe/sitzung'] };
