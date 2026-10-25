// Visor de una germinación exportada desde Semillero: sirve la página embebida en 127.0.0.1,
// abre el navegador y termina solo cuando se cierra la última pestaña.
package main

import (
	"embed"
	"flag"
	"fmt"
	"hash/fnv"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"time"
)

//go:embed all:sitio
var sitio embed.FS

// Gracia tras cerrar la última pestaña: una recarga vuelve a conectar antes.
var gracia = 10 * time.Second

func main() {
	puerto := flag.Int("puerto", 0, "puerto fijo (0: el preferido o uno libre)")
	sinNavegador := flag.Bool("sin-navegador", false, "no abrir el navegador")
	flag.DurationVar(&gracia, "gracia", gracia, "espera tras cerrar la última pestaña antes de terminar")
	flag.Parse()

	for ext, tipo := range map[string]string{".woff2": "font/woff2", ".woff": "font/woff", ".md": "text/markdown; charset=utf-8",
		".epub": "application/epub+zip", ".djvu": "image/vnd.djvu", ".svg": "image/svg+xml", ".json": "application/json", ".js": "text/javascript", ".css": "text/css"} {
		mime.AddExtensionType(ext, tipo)
	}

	raiz, err := fs.Sub(sitio, "sitio")
	if err != nil {
		fatal(err)
	}
	vida := &vigilante{}
	mux := http.NewServeMux()
	mux.Handle("/", http.FileServerFS(raiz))
	mux.HandleFunc("/__vivo", vida.conexion)

	ln, err := escuchar(*puerto)
	if err != nil {
		fatal(err)
	}
	url := fmt.Sprintf("http://%s/", ln.Addr().String())
	fmt.Printf("Germinación disponible en %s\nCierra la pestaña del navegador (o esta ventana) para terminar.\n", url)
	if !*sinNavegador {
		abrir(url)
	}
	go vida.vigilar()
	if err := http.Serve(ln, mux); err != nil {
		fatal(err)
	}
}

// El puerto preferido depende del contenido: así el navegador recuerda lo visto de una vez a otra.
func escuchar(fijo int) (net.Listener, error) {
	if fijo != 0 {
		return net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", fijo))
	}
	h := fnv.New32a()
	if datos, err := sitio.ReadFile("sitio/datos.json"); err == nil {
		h.Write(datos[:min(len(datos), 4096)])
	}
	if ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", 41000+int(h.Sum32()%8000))); err == nil {
		return ln, nil
	}
	return net.Listen("tcp", "127.0.0.1:0")
}

func abrir(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		fmt.Println("No se pudo abrir el navegador: abre la dirección de arriba a mano.")
		return
	}
	go cmd.Wait()
}

// Cuenta las pestañas conectadas por Server-Sent Events.
type vigilante struct {
	mu        sync.Mutex
	abiertas  int
	alguna    bool
	ultimoFin time.Time
}

func (v *vigilante) conexion(w http.ResponseWriter, r *http.Request) {
	fl, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "sin streaming", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	v.mu.Lock()
	v.abiertas++
	v.alguna = true
	v.mu.Unlock()
	fmt.Fprint(w, "retry: 1000\ndata: hola\n\n")
	fl.Flush()
	<-r.Context().Done()
	v.mu.Lock()
	v.abiertas--
	v.ultimoFin = time.Now()
	v.mu.Unlock()
}

func (v *vigilante) vigilar() {
	for range time.Tick(time.Second) {
		v.mu.Lock()
		fin := v.alguna && v.abiertas == 0 && time.Since(v.ultimoFin) > gracia
		v.mu.Unlock()
		if fin {
			os.Exit(0)
		}
	}
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "Error:", err)
	if runtime.GOOS == "windows" {
		time.Sleep(15 * time.Second) // que se pueda leer antes de que se cierre la ventana
	}
	os.Exit(1)
}
