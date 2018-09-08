package main

import (
    "net"
    "net/http"
    "os"
    "strconv"
)

func download(w http.ResponseWriter, r *http.Request) {
    size, err := strconv.Atoi(r.URL.Query().Get("size"))
    if err != nil { size = 8 * 1024 * 1024 }
    w.Write(make([]byte, size))
}

func empty(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte(""))
}

func ip(w http.ResponseWriter, r *http.Request) {
    ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil { return }
	userIP := net.ParseIP(ip)
	if userIP == nil { return }
    w.Write([]byte(userIP.String()))
}

func main() {
    port := os.Args[1]
    if port == "" { port = "80" }
    basePath := os.Args[2]
    if basePath == "" { basePath = "web" }
    http.Handle("/", http.FileServer(http.Dir(basePath)))
    http.HandleFunc("/download", download)
    http.HandleFunc("/ip", ip)
    http.HandleFunc("/ping", empty)
    http.HandleFunc("/upload", empty)
    if err := http.ListenAndServe(":"+port, nil); err != nil {
        panic(err)
    }
}
