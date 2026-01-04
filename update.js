// noinspection ExceptionCaughtLocallyJS

import sources from './sources.js'
import { rename, open } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join as pathJoin } from 'node:path'
import process from 'node:process'
import { geofeedToRanges } from 'geofeed2ranges'

process.env.TZ = 'UTC'

const rootPath = dirname(fileURLToPath(import.meta.url))
const tmpPath = pathJoin(rootPath, '.tmp.ranges.txt')

const errors = /** @type {any[]} */ ([])

for (const source of sources) {
	try {
		const finalPath = pathJoin(rootPath, 'ranges', source.filename)
		const srcUrl = source.url

		const srcRes = await fetch(srcUrl)

		if (srcRes.status !== 200) {
			throw new Error(
				`Failed to fetch source file at ${srcUrl}. Server returned status ${srcRes.status}.`,
			)
		}
		if (srcRes.body == null) {
			throw new Error(
				`Got OK response for source file at ${srcUrl}, but it had no body.`,
			)
		}

		const fh = await open(tmpPath, 'w')

		await fh.write(
			`# Generated from ${srcUrl}\n# Last updated: ${new Date().toISOString()}\n`,
		)

		for await (const ln of geofeedToRanges(srcRes.body)) {
			await fh.write(ln + '\n')
		}

		await fh.close()

		await rename(tmpPath, finalPath)
	} catch (err) {
		errors.push(err)
	}
}

if (errors.length > 0) {
	console.error('Encountered the following errors:')
	for (const err of errors) {
		console.error(err)
	}

	process.exit(1)
}
