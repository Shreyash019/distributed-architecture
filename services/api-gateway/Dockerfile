# Start from the official Golang image for building the binary
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum files
COPY go.mod go.sum ./
RUN go mod download

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