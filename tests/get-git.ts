import { execSync } from 'child_process'
import fs from 'fs'

const out = execSync('git log -p -n 3 src/lib/env.ts src/lib/llm/gateway.ts')
fs.writeFileSync('tests/git-log-utf8.txt', out.toString('utf-8'))
