MOCHA = ./node_modules/.bin/mocha

test_init:
	@bash ./test/sql/init_db.sh

test:
	@NODE_ENV=test $(MOCHA) -R spec -S

test_select:
	@NODE_ENV=test $(MOCHA) -R spec -S ./test/5.select.js

test_order:
	@NODE_ENV=test $(MOCHA) -R spec -S ./test/6.order_limit_offset.js

test_join:
	@NODE_ENV=test $(MOCHA) -R spec -S ./test/7.join.js

.PHONY: test