# Multi-stage Dockerfile for Go API Gateway
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o api-gateway ./cmd/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/api-gateway ./api-gateway
EXPOSE ${API_GATEWAY_PORT:-5000}
CMD ["./api-gateway"]
