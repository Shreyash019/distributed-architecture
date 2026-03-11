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
		"/auth":         "AUTH_SERVICE_URL",
		"/notification": "NOTIFICATION_SERVICE_URL",
		"/payment":      "PAYMENT_SERVICE_URL",
	}

	for prefix, envKey := range routes {
		upstream, err := requireEnv(envKey)
		if err != nil {
			return nil, err
		}
		p, err := proxy.New(upstream)
		if err != nil {
			return nil, fmt.Errorf("invalid upstream for %s: %w", prefix, err)
		}

		// Register both base and subtree patterns so /service does not redirect to /service/.
		mux.Handle(prefix, http.StripPrefix(prefix, p))
		mux.Handle(prefix+"/", http.StripPrefix(prefix, p))
	}

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	return mux, nil
}

func requireEnv(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return "", fmt.Errorf("required environment variable %q is not set", key)
	}
	return v, nil
}
