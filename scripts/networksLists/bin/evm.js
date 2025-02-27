main('https://cdn.subsquid.io/archives/evm.json')

async function main(evmJsonUrl) {
	let resp
	try {
		resp = await require('axios').get(evmJsonUrl)
	}
	catch (e) {
		const errorDescription = e.code==='ERR_BAD_REQUEST' ? `${e.code} ${e.response.status}` : e.code
		console.error(`Retrieving ${evmJsonUrl} failed with ${errorDescription}`)
	}

	const rows = await evmNetworksRows(resp.data.archives)

	const header = {
		network: 'Network',
		chainId: 'Chain ID',
		stateDiffs: 'State diffs',
		traces: 'Traces',
		url: 'Gateway URL'
	}
	console.log(require('../lib/formatTable')(rows, header, ['network', 'chainId', 'stateDiffs', 'traces', 'url']))
}

async function evmNetworksRows(networksJson) {
	const nameMapping = arch => {
		switch (arch.network) {
			case 'astar':
			case 'moonbase':
			case 'moonbeam':
			case 'moonriver':
			case 'shibuya-testnet':
			case 'shiden-mainnet':
				return `${arch.chainName} (*)`
			case 'neon-devnet':
				return `${arch.chainName} (!)`
			default:
				return arch.chainName
		}
	}

	const minirows = networksJson.map(a => ({
		network: nameMapping(a),
		chainId: a.chainId.toString(),
		url: a.providers.find(p => p.provider==='subsquid' && p.release==='ArrowSquid')?.dataSourceUrl
	}))

	const capsMapping = (network, capName, capIsPresent) => {
		if (capName==='stateDiffs') {
			switch (network) {
				case 'bitgert-mainnet':
					return '<BitgertTooltip>?</BitgertTooltip>'
				case 'optimism-mainnet':
					return capIsPresent ? '<FromBlockTooltip tip="105235063">✓</FromBlockTooltip>' : ' '
				default:
					return capIsPresent ? '✓' : ' '
			}
		}
		if (capName==='traces') {
			switch (network) {
				case 'zksync-mainnet':
					return capIsPresent ? '<FromBlockTooltip tip="15500000">✓</FromBlockTooltip>' : ' '
				default:
					return capIsPresent ? '✓' : ' '
			}
		}
	}

	getArchiveCapabilities = require('../lib/getArchiveCapabilities')
	const booleanCaps = await Promise.all(minirows.map(r => getArchiveCapabilities(r.url)))
	const stringCaps = booleanCaps.map((c, i) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, capsMapping(networksJson[i].network, k, v)])))

	return minirows.map((r, i) => ({
		...r,
		...stringCaps[i]
	}))
}
