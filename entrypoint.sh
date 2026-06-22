#!/bin/sh

echo "run_id: $RUN_ID"


npm run zap:start &

echo "Waiting for ZAP to start..."

# Wait for ZAP to be ready with retries
MAX_ATTEMPTS=30
ATTEMPT=1
SLEEP_TIME=5

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Checking ZAP status (attempt $ATTEMPT/$MAX_ATTEMPTS)..."
  
  if curl -s --max-time 5 http://127.0.0.1:8090 >/dev/null; then
    echo "ZAP is running"
    break
  fi
  
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "ZAP failed to start after $MAX_ATTEMPTS attempts"
    exit 1
  fi
  
  echo "ZAP not ready yet, waiting ${SLEEP_TIME}s..."
  sleep $SLEEP_TIME
  ATTEMPT=$((ATTEMPT + 1))
done


npm test
test_exit_code=$?

# Default to publishing results unless explicitly disabled (compose.yml does so).
PUBLISH_TEST_RESULTS=${PUBLISH_TEST_RESULTS:-1}

if [ "$PUBLISH_TEST_RESULTS" -eq 1 ]; then
  npm run report:publish
  publish_exit_code=$?
  if [ $publish_exit_code -ne 0 ]; then
    echo "failed to publish test results (exit $publish_exit_code)"
  fi
fi

# Propagate playwright's exit code so the portal sees pass/fail correctly.
if [ $test_exit_code -ne 0 ]; then
  echo "test suite failed (exit $test_exit_code)"
  exit $test_exit_code
fi

# Allow an explicit FAILED marker to override (matches CDP template convention).
if [ -f FAILED ]; then
  echo "test suite failed"
  cat ./FAILED
  exit 1
fi

if [ "$PUBLISH_TEST_RESULTS" -eq 1 ] && [ "${publish_exit_code:-0}" -ne 0 ]; then
  exit $publish_exit_code
fi

echo "test suite passed"
exit 0
