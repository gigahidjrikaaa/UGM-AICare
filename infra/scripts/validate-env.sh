#!/usr/bin/env bash

# Validate and clean .env file
# This script checks for common .env file issues that can cause deployment failures

set -euo pipefail

ENV_FILE="${1:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Error: $ENV_FILE not found"
  exit 1
fi

echo "🔍 Validating $ENV_FILE..."
echo ""

ISSUES_FOUND=0

# Check for lines without equals sign (except comments and empty lines)
echo "Checking for invalid variable declarations..."
INVALID_LINES=$(grep -vE '^[[:space:]]*#|^[[:space:]]*$' "$ENV_FILE" | grep -vE '^[A-Za-z_][A-Za-z0-9_]*=' || true)

if [[ -n "$INVALID_LINES" ]]; then
  echo "⚠️  Found lines without '=' (these will cause 'command not found' errors):"
  echo "$INVALID_LINES"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check for empty variable declarations
echo "Checking for empty variable declarations..."
EMPTY_VARS=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=$' "$ENV_FILE" || true)

if [[ -n "$EMPTY_VARS" ]]; then
  echo "⚠️  Found empty variable declarations (may cause issues):"
  echo "$EMPTY_VARS"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check for required variables
echo "Checking for required variables..."
REQUIRED_VARS=(
  "DATABASE_URL"
  "POSTGRES_DB"
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "JWT_SECRET_KEY"
  "GEMINI_API_KEY"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -qE "^${var}=.+" "$ENV_FILE"; then
    MISSING_VARS+=("$var")
  fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  echo "❌ Missing required variables:"
  printf '   - %s\n' "${MISSING_VARS[@]}"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check for variables with values containing unquoted special characters
echo "Checking for unquoted special characters..."
SPECIAL_CHAR_LINES=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=[^"'"'"'].*[&|;`$(){}]' "$ENV_FILE" || true)

if [[ -n "$SPECIAL_CHAR_LINES" ]]; then
  echo "⚠️  Found variables with special characters (consider quoting):"
  echo "$SPECIAL_CHAR_LINES"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ISSUES_FOUND -eq 0 ]]; then
  echo "✅ $ENV_FILE validation passed!"
  echo "   No issues found."
else
  echo "⚠️  Found $ISSUES_FOUND issue(s) in $ENV_FILE"
  echo ""
  echo "Recommendations:"
  echo "1. Remove or comment out (with #) any unused variables"
  echo "2. Ensure all variables have format: VAR_NAME=value"
  echo "3. Add missing required variables"
  echo "4. Quote values with special characters: VAR=\"value with spaces\""
  exit 1
fi
