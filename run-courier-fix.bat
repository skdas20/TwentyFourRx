@echo off
echo Connecting to server to fix courier deployment...
ssh -i 24rx_deploy_key admin_24rx@35.225.19.249 "bash -s" < deploy-courier-manual.sh
echo.
echo Done! Check https://track.24rxexchange.com
pause
