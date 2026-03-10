# Environment Configuration Guide

This project reads all runtime infrastructure values in `docker-compose.yml` from environment variables.

## 1. How To Use

1. Copy `.env` as your base.
2. Override values per machine/environment as needed.
3. Start infrastructure and services:

```bash
docker compose up -d
```

4. Check effective config rendering:

```bash
docker compose config
```

## Quick Start (3 Commands)

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

If needed, edit `.env` before running `docker compose up -d`.

## 2. Variable Groups

### Docker network
- `DOCKER_NETWORK_DRIVER`

### Container names
- `KAFKA_CONTAINER_NAME`
- `KAFKA_UI_CONTAINER_NAME`
- `POSTGRES_CONTAINER_NAME`
- `PGBOUNCER_CONTAINER_NAME`
- `MYSQL_CONTAINER_NAME`
- `PROXYSQL_CONTAINER_NAME`
- `MONGO_CONTAINER_NAME`
- `MONGO_EXPRESS_CONTAINER_NAME`
- `API_GATEWAY_CONTAINER_NAME`
- `AUTH_SERVICE_CONTAINER_NAME`
- `NOTIFICATION_SERVICE_CONTAINER_NAME`

### Images
- `KAFKA_IMAGE`
- `KAFKA_UI_IMAGE`
- `POSTGRES_IMAGE`
- `PGBOUNCER_IMAGE`
- `MYSQL_IMAGE`
- `PROXYSQL_IMAGE`
- `MONGO_IMAGE`
- `MONGO_EXPRESS_IMAGE`

### Kafka
- `KAFKA_PORT_HOST`
- `KAFKA_PORT_CONTAINER_EXTERNAL`
- `KAFKA_NODE_ID`
- `KAFKA_PROCESS_ROLES`
- `KAFKA_CONTROLLER_QUORUM_VOTERS`
- `KAFKA_LISTENERS`
- `KAFKA_ADVERTISED_LISTENERS`
- `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP`
- `KAFKA_INTER_BROKER_LISTENER_NAME`
- `KAFKA_CONTROLLER_LISTENER_NAMES`
- `KAFKA_CLUSTER_ID`
- `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR`
- `KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR`
- `KAFKA_TRANSACTION_STATE_LOG_MIN_ISR`
- `KAFKA_HEALTHCHECK_CMD`
- `KAFKA_HEALTHCHECK_INTERVAL`
- `KAFKA_HEALTHCHECK_TIMEOUT`
- `KAFKA_HEALTHCHECK_RETRIES`

### Kafka UI
- `KAFKA_UI_PORT_HOST`
- `KAFKA_UI_PORT_CONTAINER`
- `KAFKA_UI_CLUSTER_NAME`
- `KAFKA_UI_BOOTSTRAP_SERVERS`
- `KAFKA_UI_DYNAMIC_CONFIG_ENABLED`

### Postgres and PgBouncer
- `DB_POSTGRES_HOST`
- `DB_POSTGRES_PORT`
- `DB_POSTGRES_PORT_CONTAINER`
- `POSTGRES_PORT`
- `POSTGRES_PORT_HOST`
- `POSTGRES_HEALTHCHECK_CMD`
- `POSTGRES_HEALTHCHECK_INTERVAL`
- `POSTGRES_HEALTHCHECK_TIMEOUT`
- `POSTGRES_HEALTHCHECK_RETRIES`
- `DB_POSTGRES_NAME`
- `DB_POSTGRES_USER`
- `DB_POSTGRES_PASSWORD`
- `DB_POSTGRES_POOL_MIN`
- `DB_POSTGRES_POOL_MAX`
- `PGBOUNCER_IMAGE`
- `PGBOUNCER_DB_HOST`
- `PGBOUNCER_PORT_HOST`
- `PGBOUNCER_PORT_CONTAINER`
- `PGBOUNCER_AUTH_TYPE`
- `PGBOUNCER_POOL_MODE`
- `PGBOUNCER_MAX_CLIENT_CONN`
- `PGBOUNCER_DEFAULT_POOL_SIZE`

### MySQL and ProxySQL
- `DB_MYSQL_HOST`
- `DB_MYSQL_PORT`
- `DB_MYSQL_POOL_MAX`
- `MYSQL_PORT_HOST`
- `MYSQL_PORT_CONTAINER`
- `MYSQL_HEALTHCHECK_HOST`
- `MYSQL_HEALTHCHECK_INTERVAL`
- `MYSQL_HEALTHCHECK_TIMEOUT`
- `MYSQL_HEALTHCHECK_RETRIES`
- `MYSQL_HEALTHCHECK_START_PERIOD`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `PROXYSQL_PORT_HOST`
- `PROXYSQL_PORT_CONTAINER`
- `PROXYSQL_ADMIN_PORT_HOST`
- `PROXYSQL_ADMIN_PORT_CONTAINER`

### Mongo and Mongo Express
- `DB_MONGO_URI`
- `DB_MONGO_POOL_MAX`
- `MONGO_PORT_HOST`
- `MONGO_PORT_CONTAINER`
- `MONGO_HEALTHCHECK_CMD`
- `MONGO_HEALTHCHECK_INTERVAL`
- `MONGO_HEALTHCHECK_TIMEOUT`
- `MONGO_HEALTHCHECK_RETRIES`
- `MONGO_HEALTHCHECK_START_PERIOD`
- `MONGO_INITDB_ROOT_USERNAME`
- `MONGO_INITDB_ROOT_PASSWORD`
- `MONGO_INITDB_DATABASE`
- `MONGO_EXPRESS_PORT_HOST`
- `MONGO_EXPRESS_PORT_CONTAINER`
- `MONGO_EXPRESS_MONGODB_URL`
- `MONGO_EXPRESS_BASICAUTH`

### Services
- `API_GATEWAY_PORT`
- `AUTH_SERVICE_PORT`
- `NOTIFICATION_SERVICE_PORT`
- `PAYMENT_SERVICE_PORT`
- `DOCKER_API_GATEWAY_PORT`
- `AUTH_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- `PAYMENT_SERVICE_URL`

## 3. Service and Package Alignment

All runtime services are now env-driven, and service templates are aligned:

- API Gateway:
	- Reads `PORT` or `API_GATEWAY_PORT` (no hardcoded fallback).
	- Uses `AUTH_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `PAYMENT_SERVICE_URL`.
	- Template file: `services/api-gateway/.env.example`.
- Auth Service:
	- Uses `AUTH_SERVICE_PORT` and `DB_POSTGRES_*` variables.
	- Template file: `services/auth-service/.env.example`.
- Notification Service:
	- Uses `NOTIFICATION_SERVICE_PORT`.
	- Template file: `services/notification-service/.env.example`.

Packages status:

- `packages/logger-ts` and `packages/postgres-connector-ts` do not require package-local `.env` files.
- Package behavior is configured by service-level environment variables that are passed at runtime.

## 4. Important Port Rule (PgBouncer)

Use separate variables for host and container scopes:

- Host access (from your laptop): `DB_POSTGRES_PORT=6432`
- Container-to-container access: `DB_POSTGRES_PORT_CONTAINER=5432`

`auth-service` in Docker uses `DB_POSTGRES_PORT_CONTAINER`.

## 5. Team Workflow

1. Keep shared defaults in `.env`.
2. Override sensitive or machine-specific values with your local environment tooling.
3. When adding new docker-compose values, always add matching keys in `.env` and this document.
