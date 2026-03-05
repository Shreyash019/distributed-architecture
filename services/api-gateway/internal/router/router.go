package router

import (
	"fmt"
	"net/http"
	"os"

	"github.com/kinematics/monorepo/services/api-gateway/internal/proxy"
)

func New() (*http.ServeMux, error) {
	mux := http.NewServeMux()

	routes := map[string]string{
		"/auth/":         envOrDefault("AUTH_SERVICE_URL", "http://localhost:8001"),
		"/notification/": envOrDefault("NOTIFICATION_SERVICE_URL", "http://localhost:8002"),
		"/payment/":      envOrDefault("PAYMENT_SERVICE_URL", "http://localhost:8003"),
	}

	for prefix, upstream := range routes {
		p, err := proxy.New(upstream)
		if err != nil {
			return nil, fmt.Errorf("invalid upstream for %s: %w", prefix, err)
		}
		mux.Handle(prefix, http.StripPrefix(prefix, p))
	}

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	return mux, nil
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
