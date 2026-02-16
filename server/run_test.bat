@echo off
echo Starting test... > test_log.txt
node test_mcp.js >> test_log.txt 2>&1
echo Test finished. >> test_log.txt
