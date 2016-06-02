#!/bin/bash

psql -d template1 -c "REASSIGN OWNED BY jorm_test_user TO postgres;"
psql -d template1 -c "DROP OWNED BY jorm_test_user;"
psql -d template1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='jorm_test';"
psql -d template1 -c "DROP DATABASE IF EXISTS jorm_test;"
psql -d template1 -c "DROP USER IF EXISTS jorm_test_user;"
psql -d template1 -c "CREATE USER jorm_test_user WITH PASSWORD 'jorm_test_user_pass';"
psql -d template1 -c "CREATE DATABASE jorm_test WITH ENCODING 'UTF8' TEMPLATE template0;"
psql -U jorm_test_user -d jorm_test -a -f ./test/sql/jorm_test_db.sql
