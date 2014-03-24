MOCHA = ./node_modules/.bin/mocha

test:
	@NODE_ENV=test $(MOCHA) -r should -R spec --timeout 60000

.PHONY: test