# Multi-stage Dockerfile for Go API Gateway
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o api-gateway ./cmd/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/api-gateway ./api-gateway
EXPOSE 3000
CMD ["./api-gateway"]

# Copy the source code
COPY . .

# Build the Go binary
RUN go build -o api-gateway .

# Use a minimal image for running the binary
FROM alpine:latest

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/api-gateway .

# Expose port (change if your API gateway uses a different port)
EXPOSE 8080

# Run the binary
CMD ["./api-gateway"]