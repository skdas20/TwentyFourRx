@echo off
echo Starting MinIO Server on D: drive...
set MINIO_ROOT_USER=minioadmin
set MINIO_ROOT_PASSWORD=minioadmin123
D:\minio\minio.exe server D:\minio\data --console-address ":9001"
