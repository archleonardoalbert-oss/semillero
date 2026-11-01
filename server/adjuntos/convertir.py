"""Convierte un documento de oficina a Markdown legible por las sesiones de Claude (solo librería estándar).

Uso: python3 -I convertir.py <archivo> <salida.md>
Formatos: docx, pptx, xlsx, odt, odp, ods, epub, rtf y la lista de contenido de un zip.
"""
import html
import re
import resource
import sys
import zipfile
import posixpath
import xml.etree.ElementTree as ET

MAX_DESCOMPRIMIDO = 300 * 1024 * 1024  # contra ZIP bomba
MAX_XML = 40 * 1024 * 1024  # una parte XML mayor crearía millones de nodos en memoria
MAX_MEMORIA = 1536 * 1024 * 1024
MAX_SALIDA = 4 * 1024 * 1024


def local(tag):
    return tag.rsplit('}', 1)[-1]


def leer(z, nombre):
    info = z.getinfo(nombre)
    if info.file_size > MAX_DESCOMPRIMIDO:
        raise ValueError('archivo interno demasiado grande')
    return z.read(nombre)


def xml(z, nombre):
    if z.getinfo(nombre).file_size > MAX_XML:
        raise ValueError('parte XML demasiado grande')
    return ET.fromstring(leer(z, nombre))


def texto_de(el):
    return ''.join(t for t in el.itertext()).strip()


# --- Word ---------------------------------------------------------------------------------------------
def docx(z):
    raiz = xml(z, 'word/document.xml')
    salida = []

    def parrafo(p):
        estilo = ''
        for e in p.iter():
            if local(e.tag) == 'pStyle':
                estilo = next((v for k, v in e.attrib.items() if local(k) == 'val'), '')
        t = ''.join(e.text or '' for e in p.iter() if local(e.tag) == 't')
        m = re.match(r'(?i)(heading|título|titulo)\s*(\d)', estilo)
        if m and t.strip():
            return '#' * min(int(m.group(2)), 6) + ' ' + t.strip()
        if estilo.lower() == 'title' and t.strip():
            return '# ' + t.strip()
        return t

    cuerpo = next((e for e in raiz if local(e.tag) == 'body'), raiz)
    for e in cuerpo:
        if local(e.tag) == 'p':
            salida.append(parrafo(e))
        elif local(e.tag) == 'tbl':
            for fila in (f for f in e.iter() if local(f.tag) == 'tr'):
                celdas = [' '.join(parrafo(p) for p in c.iter() if local(p.tag) == 'p').strip() for c in fila if local(c.tag) == 'tc']
                salida.append(' | '.join(celdas))
            salida.append('')
    return '\n\n'.join(s for s in salida if s is not None)


# --- PowerPoint -----------------------------------------------------------------------------------------
def pptx(z):
    num = lambda n: int(re.search(r'(\d+)\.xml$', n).group(1))
    diapos = sorted((n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)), key=num)
    salida = []
    for n in diapos:
        raiz = xml(z, n)
        parrafos = []
        for p in (e for e in raiz.iter() if local(e.tag) == 'p' and e.tag.endswith('}p')):
            t = ''.join(e.text or '' for e in p.iter() if local(e.tag) == 't').strip()
            if t:
                parrafos.append(t)
        if not parrafos:
            parrafos = [t for t in (e.text for e in raiz.iter() if local(e.tag) == 't') if t]
        salida.append(f'## Diapositiva {num(n)}\n\n' + '\n\n'.join(parrafos))
        notas = f'ppt/notesSlides/notesSlide{num(n)}.xml'
        if notas in z.namelist():
            t = ' '.join(e.text or '' for e in xml(z, notas).iter() if local(e.tag) == 't').strip()
            if t:
                salida.append(f'*Notas del orador:* {t}')
    return '\n\n'.join(salida)


# --- Excel ----------------------------------------------------------------------------------------------
def columna(ref):
    letras = re.match(r'[A-Z]+', ref or '')
    if not letras:
        return None
    n = 0
    for c in letras.group(0):
        n = n * 26 + ord(c) - 64
    return n - 1


def xlsx(z):
    compartidas = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in (e for e in xml(z, 'xl/sharedStrings.xml') if local(e.tag) == 'si'):
            compartidas.append(''.join(t.text or '' for t in si.iter() if local(t.tag) == 't'))
    hojas = []
    try:
        libro = xml(z, 'xl/workbook.xml')
        rels = {}
        if 'xl/_rels/workbook.xml.rels' in z.namelist():
            for r in xml(z, 'xl/_rels/workbook.xml.rels'):
                rels[r.get('Id')] = posixpath.normpath(posixpath.join('xl', r.get('Target', '').lstrip('/').removeprefix('xl/')))
        for i, h in enumerate((e for e in libro.iter() if local(e.tag) == 'sheet'), 1):
            rid = next((v for k, v in h.attrib.items() if local(k) == 'id'), None)
            hojas.append((h.get('name', f'Hoja {i}'), rels.get(rid, f'xl/worksheets/sheet{i}.xml')))
    except KeyError:
        pass
    if not hojas:
        hojas = [(n, n) for n in sorted(z.namelist()) if re.match(r'xl/worksheets/sheet\d+\.xml$', n)]
    salida = []
    for nombre, ruta in hojas:
        if ruta not in z.namelist():
            continue
        filas = []
        for fila in (e for e in xml(z, ruta).iter() if local(e.tag) == 'row'):
            valores = []
            for c in (e for e in fila if local(e.tag) == 'c'):
                k = columna(c.get('r'))
                if k is not None:
                    valores.extend([''] * (k - len(valores)))
                v = next((e for e in c if local(e.tag) == 'v'), None)
                if c.get('t') == 's' and v is not None:
                    val = compartidas[int(v.text)] if v.text and int(v.text) < len(compartidas) else ''
                elif c.get('t') == 'inlineStr':
                    val = texto_de(c)
                else:
                    val = v.text if v is not None and v.text else ''
                valores.append(val.replace('\n', ' ').replace('|', '\\|'))
            if any(valores):
                filas.append(' | '.join(valores))
        salida.append(f'## Hoja «{nombre}»\n\n' + '\n'.join(filas))
    return '\n\n'.join(salida)


# --- OpenDocument ---------------------------------------------------------------------------------------
def odf(z):
    raiz = xml(z, 'content.xml')
    salida = []

    def recorrer(e):
        n = local(e.tag)
        if n == 'h':
            salida.append('#' * int(next((v for k, v in e.attrib.items() if local(k) == 'outline-level'), '1')) + ' ' + texto_de(e))
        elif n == 'p':
            salida.append(texto_de(e))
        elif n == 'table-row':
            salida.append(' | '.join(texto_de(c) for c in e if local(c.tag) == 'table-cell'))
        elif n == 'page':
            salida.append(f'## Diapositiva «{next((v for k, v in e.attrib.items() if local(k) == "name"), "")}»')
            for h in e:
                recorrer(h)
        else:
            for h in e:
                recorrer(h)

    recorrer(raiz)
    return '\n\n'.join(s for s in salida if s.strip())


# --- EPUB -----------------------------------------------------------------------------------------------
def html_a_texto(datos):
    t = datos.decode('utf-8', 'replace')
    t = re.sub(r'(?is)<(script|style)\b.*?</\1>', '', t)
    t = re.sub(r'(?i)<h([1-6])[^>]*>', lambda m: '\n\n' + '#' * int(m.group(1)) + ' ', t)
    t = re.sub(r'(?i)<(br|/p|/div|/li|/tr|/h[1-6])[^>]*>', '\n', t)
    t = re.sub(r'<[^>]+>', '', t)
    return re.sub(r'\n{3,}', '\n\n', html.unescape(t)).strip()


def epub(z):
    cont = xml(z, 'META-INF/container.xml')
    opf = next(e.get('full-path') for e in cont.iter() if local(e.tag) == 'rootfile')
    raiz = xml(z, opf)
    base = posixpath.dirname(opf)
    items = {e.get('id'): e.get('href') for e in raiz.iter() if local(e.tag) == 'item'}
    orden = [e.get('idref') for e in raiz.iter() if local(e.tag) == 'itemref']
    partes = []
    for i in orden:
        ruta = posixpath.normpath(posixpath.join(base, items.get(i, '')))
        if ruta in z.namelist() and z.getinfo(ruta).file_size <= MAX_XML:
            partes.append(html_a_texto(leer(z, ruta)))
    return '\n\n'.join(partes)


def rtf(datos):
    t = datos.decode('latin-1')
    t = re.sub(r"\\'([0-9a-f]{2})", lambda m: bytes([int(m.group(1), 16)]).decode('cp1252', 'replace'), t)
    t = re.sub(r'\\u(-?\d+)\??', lambda m: chr(int(m.group(1)) % 65536), t)
    t = re.sub(r'\\(par|line)\b ?', '\n', t)
    t = re.sub(r'\{\\\*[^{}]*\}|\\[a-z]+-?\d* ?|[{}]', '', t)
    return t.strip()


def lista_zip(z):
    filas = [f'- {i.filename} ({i.file_size} bytes)' for i in z.infolist()[:2000]]
    return 'Contenido del archivo comprimido (no se ha extraído):\n\n' + '\n'.join(filas)


def convertir(archivo):
    ext = archivo.rsplit('.', 1)[-1].lower() if '.' in archivo else ''
    if ext == 'rtf':
        with open(archivo, 'rb') as f:
            return rtf(f.read())
    with zipfile.ZipFile(archivo) as z:
        if sum(i.file_size for i in z.infolist()) > MAX_DESCOMPRIMIDO * 4 and ext != 'zip':
            raise ValueError('el documento descomprimido es demasiado grande')
        if ext in ('docx', 'docm', 'dotx'):
            return docx(z)
        if ext in ('pptx', 'pptm', 'ppsx'):
            return pptx(z)
        if ext in ('xlsx', 'xlsm'):
            return xlsx(z)
        if ext in ('odt', 'odp', 'ods', 'ott'):
            return odf(z)
        if ext == 'epub':
            return epub(z)
        return lista_zip(z)


if __name__ == '__main__':
    # Tope de memoria: un documento malicioso no puede llevarse la RAM del portátil.
    resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORIA, MAX_MEMORIA))
    archivo, salida = sys.argv[1], sys.argv[2]
    texto = convertir(archivo)
    if len(texto) > MAX_SALIDA:
        texto = texto[:MAX_SALIDA] + '\n\n[… recortado: el documento es muy largo]'
    with open(salida, 'w', encoding='utf-8') as f:
        f.write(texto + '\n')
