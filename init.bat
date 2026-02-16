@echo off
echo Checking node and npm versions... > init.log
node -v >> init.log 2>&1
npm -v >> init.log 2>&1

echo Installing server dependencies... >> init.log
cd server
call npm install >> ../install.log 2>&1
if errorlevel 1 echo Server install failed >> ../init.log
cd ..

echo Creating client app... >> init.log
if exist client (
    echo Client directory exists, checking if empty... >> init.log
    dir client >> init.log
)
call npm create vite@latest client -- --template react >> create.log 2>&1
if errorlevel 1 echo Client create failed >> ../init.log

echo DONE > done.txt
