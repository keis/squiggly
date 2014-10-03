ISTANBUL=node_modules/.bin/istanbul
MOCHA=node_modules/.bin/_mocha
DOCCO=node_modules/.bin/docco

SRC=squiggle.js
TESTSRC=$(shell find test/ -type f)
DOCS=$(patsubst %.js, docs/%.html, $(SRC))

all: test docs

.PHONY: test docs

test: coverage/coverage.json

docs: $(DOCS)

docs/%.html: %.js
	docco $^

coverage/coverage.json: $(SRC) $(TESTSRC)

coverage/coverage.json:
	$(ISTANBUL) cover $(MOCHA) -- --require test/bootstrap.js --compilers coffee:coffee-script/register --recursive test/component

coverage/index.html: coverage/coverage.json
	$(ISTANBUL) report html

coverage/lcov.info: coverage/coverage.json
	$(ISTANBUL) report lcov
