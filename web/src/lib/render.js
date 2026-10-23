import DOMPurify from 'dompurify';
import { crearRenderizador } from './markdown.js';

export const renderizar = crearRenderizador(DOMPurify);
