package middleware

import (
	"log"
	"net/http"
	"os"
	"time"
)

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

func Logger(next http.Handler) http.Handler {
	instanceID := os.Getenv("HOSTNAME")
	if instanceID == "" {
		instanceID = "unknown"
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}

		// Expose which gateway replica handled this request for edge observability.
		rw.Header().Set("X-Instance-Id", instanceID)

		next.ServeHTTP(rw, r)

		log.Printf("instance=%s method=%s path=%s status=%d duration=%s client=%s xff=%q request_id=%q",
			instanceID,
			r.Method,
			r.URL.Path,
			rw.status,
			time.Since(start),
			r.RemoteAddr,
			r.Header.Get("X-Forwarded-For"),
			r.Header.Get("X-Request-Id"),
		)
	})
}
