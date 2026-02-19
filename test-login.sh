#!/bin/bash
curl -X POST https://24rxexchange.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://track.24rxexchange.com" \
  -d '{"email":"courier@24rx.in","password":"courier123"}' \
  -v
