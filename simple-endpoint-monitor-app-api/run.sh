#!/bin/bash
docker rm -f simple-endpoint-monitor-app-api
docker run -itd --name simple-endpoint-monitor-app-api -v ./.env:/app/.env -v ./endpoints.txt:/app/endpoints.txt --env-file .env -p 9091:8000 simple-endpoint-monitor-app-api:0.0.1
