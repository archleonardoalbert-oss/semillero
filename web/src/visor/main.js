import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/jetbrains-mono/400.css';
import 'katex/dist/katex.min.css';
import '../estilos/tokens.css';
import '../estilos/base.css';
import '../estilos/manuscrito.css';
import { mount } from 'svelte';
import Visor from './Visor.svelte';

mount(Visor, { target: document.getElementById('app') });
