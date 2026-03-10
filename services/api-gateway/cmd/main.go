package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/kinematics/monorepo/services/api-gateway/internal/middleware"
	"github.com/kinematics/monorepo/services/api-gateway/internal/router"
)

func main() {
	mux, err := router.New()
	if err != nil {
		log.Fatalf("failed to build router: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("API_GATEWAY_PORT")
	}
	if port == "" {
		log.Fatal("required environment variable PORT or API_GATEWAY_PORT is not set")
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      middleware.Logger(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("api-gateway listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
