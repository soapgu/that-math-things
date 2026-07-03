#!/bin/bash
PUBLIC_URL=/that-math-things/ BROWSER=none react-scripts start &
PID=$!
sleep 3
open http://localhost:3000/that-math-things/
wait $PID
