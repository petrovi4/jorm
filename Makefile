MOCHA = ./node_modules/.bin/mocha

test_init:
	@bash ./test/sql/init_db.sh

test:
	@NODE_ENV=test ./test/sql/init_db.sh && $(MOCHA) -R spec -S

.PHONY: test