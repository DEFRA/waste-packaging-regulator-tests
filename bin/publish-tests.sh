#!/bin/sh

DIRECTORY="$PWD/allure-report"
ZAP_LOG="/tmp/zap-${RUN_ID:-local}.log"

echo "Publishing test results to S3"

if [ -n "$RESULTS_OUTPUT_S3_PATH" ]; then
   aws s3 cp --quiet "$ZAP_LOG" "$RESULTS_OUTPUT_S3_PATH/ZAP_LOG"
   if [ -d "$DIRECTORY" ]; then
      aws s3 cp --quiet "$DIRECTORY" "$RESULTS_OUTPUT_S3_PATH" --recursive
      
      
      echo "Test results published to $RESULTS_OUTPUT_S3_PATH"
   else
      echo "$DIRECTORY is not found"
      exit 1
   fi
else
   echo "RESULTS_OUTPUT_S3_PATH is not set"
   exit 1
fi
