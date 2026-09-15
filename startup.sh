#!/bin/sh
# Idempotent startup script for the App Builder environment

# Check if the dev server is already responding on port 8080
if curl -s http://127.0.0.1:8080/ > /dev/null; then
  echo "Dev server already running."
  exit 0
fi

echo "Starting dev server..."
# Start the dev server in the background and redirect output
npm run dev > .grok/dev-server.log 2>&1 &

# Wait for it to become available
timeout=30
count=0
while ! curl -s http://127.0.0.1:8080/ > /dev/null; do
  sleep 1
  count=$((count + 1))
  if [ $count -ge $timeout ]; then
    echo "Dev server failed to start within $timeout seconds."
    exit 1
  fi
done

echo "Dev server is up."
exit 0
