#!/bin/bash
# Test script to create tasks in different backlog buckets

echo "Creating tasks in different backlog buckets..."
echo ""

# Soon bucket (next week or two)
echo "Creating task in Soon bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Soon] Task in Soon bucket", "timeHorizon": "soon"}'
echo ""
echo ""

# Next bucket (next month)
echo "Creating task in Next bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Next] Task in Next bucket", "timeHorizon": "next"}'
echo ""
echo ""

# Next-quarter bucket
echo "Creating task in Next Quarter bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Next-Quarter] Task in Next Quarter bucket", "timeHorizon": "next-quarter"}'
echo ""
echo ""

# Later bucket (next year)
echo "Creating task in Later bucket..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer sk_test" \
  -H "Content-Type: application/json" \
  -d '{"text": "[API-Later] Task in Later bucket", "timeHorizon": "later"}'
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
echo "  - [API-Soon] in 'Soon' (next week or two)"
echo "  - [API-Next] in 'Next' (next month)"
echo "  - [API-Next-Quarter] in 'Next Quarter'"
echo "  - [API-Later] in 'Later' (next year)"
echo "  - [API-Someday] in 'Someday'"
echo "  - [API-Never] in 'Never'"
echo "  - [API-Default] in 'Someday' (default)"

