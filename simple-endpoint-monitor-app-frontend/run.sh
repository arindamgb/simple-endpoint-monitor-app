#!/bin/bash
docker rm -f simple-endpoint-monitor-app-frontend
docker run -itd --name simple-endpoint-monitor-app-frontend -p 9090:80 simple-endpoint-monitor-app-frontend:0.0.1
