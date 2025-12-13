#!/bin/bash
# Test script to create tasks in different backlog buckets

echo "Creating tasks in different backlog buckets..."
echo ""

# Week bucket
echo "Creating task in Next Week bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Week] Task in Next Week bucket", "timeHorizon": "week"}'
echo ""
echo ""

# Month bucket
echo "Creating task in Next Month bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Month] Task in Next Month bucket", "timeHorizon": "month"}'
echo ""
echo ""

# Quarter bucket
echo "Creating task in Next Quarter bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Quarter] Task in Next Quarter bucket", "timeHorizon": "quarter"}'
echo ""
echo ""

# Year bucket
echo "Creating task in Next Year bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Year] Task in Next Year bucket", "timeHorizon": "year"}'
echo ""
echo ""

# Someday bucket (explicit)
echo "Creating task in Someday bucket (explicit)..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Someday] Task in Someday bucket", "timeHorizon": "someday"}'
echo ""
echo ""

# Never bucket
echo "Creating task in Never bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Never] Task in Never bucket", "timeHorizon": "never"}'
echo ""
echo ""

# Default (no timeHorizon - should go to Someday)
echo "Creating task with no timeHorizon (should be Someday)..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Default] Task with no timeHorizon"}'
echo ""
echo ""

echo "Done! Check your Sunsama backlog for 7 new tasks:"
echo "  - [API-Week] in 'Someday in the next week'"
echo "  - [API-Month] in 'Someday in the next month'"
echo "  - [API-Quarter] in 'Someday in the next quarter'"
echo "  - [API-Year] in 'Someday in the next year'"
echo "  - [API-Someday] in 'Someday'"
echo "  - [API-Never] in 'Never'"
echo "  - [API-Default] in 'Someday' (default)"

