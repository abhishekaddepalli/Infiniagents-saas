/**
 * One-command first run.
 *
 *   npm run first-run
 *
 * Writes .env, generates the two secrets, creates the tables and loads the
 * demo data. Plain Node with no dependencies, so it behaves the same on
 * Windows, macOS and Linux.
 */
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const ENV = '.env'
const EXAMPLE = '.env.example'
const PLACEHOLDER = 'postgresql://USER:PASSWORD@localhost:5432/agentflow?schema=public'

// Colour is skipped when the output is piped to a file or another program.
const paint = (code, text) => (stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)
const bold = (text) => paint(1, text)
const dim = (text) => paint(2, text)
const green = (text) => paint(32, text)
const red = (text) => paint(31, text)

function fail(message, hint) {
  console.error(`\n${red('x')} ${message}`)
  if (hint) console.error(`\n${hint}`)
  process.exit(1)
}

/** Replaces KEY="..." on its own line, leaving the rest of the file alone. */
function setEnvValue(contents, key, value) {
  const line = `${key}="${value}"`
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  return pattern.test(contents) ? contents.replace(pattern, line) : `${contents}\n${line}\n`
}

function readEnvValue(contents, key) {
  const match = contents.match(new RegExp(`^${key}="?([^"\\n]*)"?$`, 'm'))
  return match ? match[1] : ''
}

/** Runs a command, streaming its output, and stops the script if it fails. */
function run(command, args, failureHint) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    // npm and npx are .cmd shims on Windows, which need a shell to resolve.
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) fail(`"${command} ${args.join(' ')}" failed.`, failureHint)
}

// ---------------------------------------------------------------- Node version
const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 18 || (major === 18 && minor < 18)) {
  fail(
    `Node ${process.versions.node} is too old — this template needs 18.18 or newer.`,
    'Install the current LTS from https://nodejs.org and run this again.',
  )
}

console.log(`\n${bold('AgentFlow AI — first run')}\n`)

// --------------------------------------------------------------------- .env
if (!existsSync(ENV)) {
  if (!existsSync(EXAMPLE)) {
    fail(`Neither ${ENV} nor ${EXAMPLE} is here.`, 'Run this from the project folder.')
  }
  writeFileSync(ENV, readFileSync(EXAMPLE, 'utf8'))
  console.log(`${green('+')} Created ${ENV} from ${EXAMPLE}`)
}

let contents = readFileSync(ENV, 'utf8')

for (const key of ['AUTH_SECRET', 'ENCRYPTION_KEY']) {
  if (!readEnvValue(contents, key)) {
    contents = setEnvValue(contents, key, randomBytes(32).toString('base64'))
    console.log(`${green('+')} Generated ${key}`)
  }
}

const currentUrl = readEnvValue(contents, 'DATABASE_URL')
if (!currentUrl || currentUrl === PLACEHOLDER) {
  console.log(`
${bold('This needs a PostgreSQL database.')}

  ${bold('No PostgreSQL installed?')} Sign up free at ${bold('https://neon.com')}, create a
  project, and copy the connection string it shows you.

  ${bold('Already have PostgreSQL?')} Create a database and use, for example:
  ${dim('postgresql://postgres:yourpassword@localhost:5432/agentflow?schema=public')}
`)
  const rl = createInterface({ input: stdin, output: stdout })
  const answer = (await rl.question('Paste your DATABASE_URL: ')).trim()
  rl.close()

  if (!answer.startsWith('postgres')) {
    fail('That does not look like a PostgreSQL URL.', 'It should begin with postgresql:// or postgres://')
  }
  contents = setEnvValue(contents, 'DATABASE_URL', answer)
  console.log(`${green('+')} Saved DATABASE_URL`)
}

writeFileSync(ENV, contents)

// ------------------------------------------------------------- dependencies
if (!existsSync('node_modules')) {
  console.log(`\n${bold('Installing dependencies')} — this takes a minute or two.\n`)
  run('npm', ['install'], 'Check your internet connection and try again.')
}

// ------------------------------------------------------------------- database
console.log(`\n${bold('Setting up the database')}\n`)
run('npx', ['prisma', 'generate'])
run(
  'npx',
  ['prisma', 'migrate', 'deploy'],
  `The database could not be reached. Check DATABASE_URL in your ${ENV} file:
  - Is the database server running?
  - Are the username and password right?
  - Does the database named at the end of the URL exist?`,
)
run('npx', ['tsx', 'prisma/seed.ts'])

// ---------------------------------------------------------------------- done
console.log(`
${green('Ready.')} Start the app with:

    ${bold('npm run dev')}

Then open ${bold('http://localhost:3000')} and sign in with the accounts listed above.
`)
