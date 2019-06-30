.DEFAULT_GOAL := help
.PHONY: help
help:
	@printf "Makefile (%s)\n" $$(pwd)
	@echo ""
	@echo "  usage: make <target> [<target>, ...]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo ""


tests:						## Run unit tests
	npm run test
publish:					## Publish npm package
	npm publish --access public

build-docs:					## Build docs
	npm run build-docs
documentation-server:				## Build, watch and serve docs
	npm run build-docs-watch					&\
	cd docs; python3 -m http.server 8000
