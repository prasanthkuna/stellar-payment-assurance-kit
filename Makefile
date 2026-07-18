.PHONY: setup test ci testnet-evidence

setup:
	npm install

test:
	npm test

ci: test

testnet-evidence:
	npm run testnet-evidence
