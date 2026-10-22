import { startLab } from './lab';
import { mountLab, element } from './ui';
import './lab.css';

mountLab();
startLab().catch(error => { element('status').textContent = `Renderer unavailable. WebGL2 is required. ${String(error)}`; });
