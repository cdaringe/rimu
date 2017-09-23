/*
  Command-lne app to convert Rimu source to HTML.
  Run 'node rimu.js --help' for details.
*/

import * as fs from 'fs'
import * as path from 'path'
import * as rimu from 'rimu'

const MANPAGE = `NAME
  rimuc - convert Rimu source to HTML

SYNOPSIS
  rimuc [OPTIONS...] [FILES...]

DESCRIPTION
  Reads Rimu source markup from stdin, converts them to HTML
  then writes the HTML to stdout. If FILES are specified
  the Rimu source is read from FILES. The contents of files
  with an .html extension are passed directly to the output.

  If a file named .rimurc exists in the user's home directory
  then its contents is processed (with --safe-mode 0) after
  --prepend sources but before any other inputs.
  This behavior can be disabled with the --no-rimurc option.

OPTIONS
  -h, --help
    Display help message.

  --layout LAYOUT
    Generate a styled HTML document with one of the following
    predefined document layouts:

    'classic': Desktop-centric styling.
    'flex':    Flexbox responsive styling (experimental).
    'sequel':  Responsive cross-device styling.
    'v8':      Rimu version 8 styling.

    If only one source file is specified and the --output
    option is not specified then the output is written to a
    same-named file with an .html extension.
    This option enables --header-ids.

  -o, --output OUTFILE
    Write output to file OUTFILE instead of stdout.
    If OUTFILE is a hyphen '-' write to stdout.

  -p, --prepend SOURCE
    Process the SOURCE text before other inputs.
    Rendered with --safe-mode 0.

  --no-rimurc
    Do not process .rimurc from the user's home directory.

  --safe-mode NUMBER
    Non-zero safe modes ignore: Definition elements; API option elements;
    HTML attributes in Block Attributes elements.
    Also specifies how to process HTML elements:

    --safe-mode 0 renders HTML (default).
    --safe-mode 1 ignores HTML.
    --safe-mode 2 replaces HTML with --html-replacement option value.
    --safe-mode 3 renders HTML as text.

    Add 4 to --safe-mode to ignore Block Attribute elements.
    Add 8 to --safe-mode to allow Macro Definitions.

  --html-replacement TEXT
    Embedded HTML is replaced by TEXT when --safe-mode is set to 2.
    Defaults to '<mark>replaced HTML</mark>'.

  --theme THEME, --lang LANG, --title TITLE, --highlightjs, --mathjax,
  --no-toc, --custom-toc, --section-numbers, --header-ids, --header-links

    Shortcuts for the following prepended macro definitions:
    --prepend "{--theme}='THEME'"
    --prepend "{--lang}='LANG'"
    --prepend "{--title}='TITLE'"
    --prepend "{--highlightjs}='true'"
    --prepend "{--mathjax}='true'"
    --prepend "{--no-toc}='true'"
    --prepend "{--custom-toc}='true'"
    --prepend "{--section-numbers}='true'"
    --prepend "{--header-ids}='true'"
    --prepend "{--header-links}='true'"

PREDEFINED MACROS
  Macro name         Description
  _______________________________________________________________
  --                 Blank macro (empty string).
  --header-ids       Set to a non-blank value to generate h1, h2
                     and h3 header id attributes.
  _______________________________________________________________

STYLING MACROS AND CLASSES
  The following macros and CSS classes are available when the
  --layout option is used:

  Macro name         Description
  _______________________________________________________________
  --theme            Styling theme. Theme names:
                     'legend', 'graystone', 'vintage'.
  --lang             HTML document language attribute value.
  --title            HTML document title.
  --highlightjs      Set to non-blank value to enable syntax
                     highlighting with Highlight.js.
  --mathjax          Set to a non-blank value to enable MathJax.
  --no-toc           Set to a non-blank value to suppress table of
                     contents generation.
  --custom-toc       Set to a non-blank value if a custom table
                     of contents is used.
  --section-numbers  Apply h2 and h3 section numbering.
  --header-links     Set to a non-blank value to generate h2 and
                     h3 header header links.
  _______________________________________________________________
  These macros must be defined prior to processing (using rimuc
  options or in .rimurc).

  CSS class        Description
  ______________________________________________________________
  verse            Verse format (paragraphs, division blocks).
  sidebar          Sidebar format (paragraphs, division blocks).
  cite             Quote and verse attribution.
  bordered         Add borders to table.
  align-left       Text alignment left.
  align-center     Text alignment center.
  align-right      Text alignment right.
  no-print         Do not print.
  line-breaks      Honor line breaks in source text.
  page-break       Force page break before the element.
  no-page-break    Avoid page break inside the element.
  dl-numbered      Number labeled list items.
  dl-horizontal    Format labeled lists horizontally.
  dl-counter       Prepend dl item counter to element content.
  ol-counter       Prepend ol item counter to element content.
  ul-counter       Prepend ul item counter to element content.
  ______________________________________________________________
`
const HOME_DIR = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']
const RIMURC = path.resolve(HOME_DIR, '.rimurc')

// Helpers.
function die(message: string): void {
  console.error(message)
  process.exit(1)
}

declare const require: (filename: string) => any

function readResourceFile(name: string): string {
  return require(`./resources/${name}`)
}

let safe_mode = 0
let html_replacement: string | undefined
let layout = ''
let no_rimurc = false

// Skip executable and script paths.
process.argv.shift(); // Skip executable path.
process.argv.shift(); // Skip rimuc script path.

// Parse command-line options.
let source = ''
let outfile: string | undefined
let arg: string | undefined
outer:
  while (!!(arg = process.argv.shift())) {
    switch (arg) {
      case '--help':
      case '-h':
        console.log('\n' + MANPAGE)
        process.exit()
        break
      case '--lint': // Deprecated in Rimu 10.0.0
      case '-l':
        break
      case '--output':
      case '-o':
        outfile = process.argv.shift()
        if (!outfile) {
          die('missing --output file name')
        }
        break
      case '--prepend':
      case '-p':
        source += process.argv.shift() + '\n'
        break
      case '--no-rimurc':
        no_rimurc = true
        break
      case '--safe-mode':
      case '--safeMode':  // Deprecated in Rimu 7.1.0.
        safe_mode = parseInt(process.argv.shift() || '99', 10)
        if (safe_mode < 0 || safe_mode > 15) {
          die('illegal --safe-mode option value')
        }
        break
      case '--html-replacement':
      case '--htmlReplacement': // Deprecated in Rimu 7.1.0.
        html_replacement = process.argv.shift()
        break
      case '--styled': // Deprecated in Rimu 10.0.0
      case '-s':
        source += '{--header-ids}=\'true\'\n'
        if (layout === '') {
          layout = 'classic'
        }
        break
      // Styling macro definitions shortcut options.
      case '--highlightjs':
      case '--mathjax':
      case '--section-numbers':
      case '--theme':
      case '--title':
      case '--lang':
      case '--toc': // Deprecated in Rimu 8.0.0
      case '--no-toc':
      case '--sidebar-toc': // Deprecated in Rimu 10.0.0
      case '--dropdown-toc': // Deprecated in Rimu 10.0.0
      case '--custom-toc':
      case '--header-ids':
      case '--header-links':
        let macro_value = ['--lang', '--title', '--theme'].indexOf(arg) > -1 ? process.argv.shift() : 'true'
        source += '{' + arg + '}=\'' + macro_value + '\'\n'
        break
      case '--layout':
      case '--styled-name': // Deprecated in Rimu 10.0.0
        layout = process.argv.shift() || ''
        if (!layout) {
          die('missing --layout')
        }
        if (['classic', 'flex', 'sequel', 'v8'].indexOf(layout) === -1) {
          die('illegal --layout: ' + layout)
        }
        source += '{--header-ids}=\'true\'\n'
        break
      default:
        if (arg[0] === '-') {
          die('illegal option: ' + arg)
        }
        process.argv.unshift(arg); // argv contains source file names.
        break outer
    }
  }

// process.argv contains the list of source files.
let files = process.argv
if (files.length === 0) {
  files.push('/dev/stdin')
}
else if (layout !== '' && !outfile && files.length === 1) {
  // Use the source file name with .html extension for the output file.
  outfile = files[0].substr(0, files[0].lastIndexOf('.')) + '.html'
}

const RESOURCE_TAG = 'resource:' // Tag for trusted files.

if (layout !== '') {
  // Envelope source files with header and footer.
  files.unshift(`${RESOURCE_TAG}${layout}-header.rmu`)
  files.push(`${RESOURCE_TAG}${layout}-footer.rmu`)
}

// Prepend $HOME/.rimurc file if it exists.
if (!no_rimurc && fs.existsSync(RIMURC)) {
  files.unshift(RIMURC)
}

// Convert Rimu source files to HTML.
let output = ''
let errors = 0
if (source !== '') {
  output += rimu.render(source) + '\n'; // --prepend options source.
}
let options: rimu.Options = {}
if (html_replacement !== undefined) {
  options.htmlReplacement = html_replacement
}
for (let infile of files) {
  if (infile.startsWith(RESOURCE_TAG)) {
    source = readResourceFile(infile.substr(RESOURCE_TAG.length))
    options.safeMode = 0  // Resources are trusted.
  }
  else {
    options.safeMode = (infile === RIMURC) ? 0 : safe_mode  // ~/.rimurc is trusted.
    if (!fs.existsSync(infile)) {
      die('source file does not exist: ' + infile)
    }
    try {
      source = fs.readFileSync(infile).toString()
    } catch (e) {
      die('source file permission denied: ' + infile)
    }
  }
  let ext = infile.split('.').pop()
  if (ext === 'html') {
    output += source + '\n'
    continue
  }
  options.callback = function (message): void {
    let msg = message.type + ': ' + infile + ': ' + message.text
    if (msg.length > 120) {
      msg = msg.slice(0, 117) + '...'
    }
    console.error(msg)
    if (message.type === 'error') {
      errors += 1
    }
  }
  output += rimu.render(source, options) + '\n'
}
output = output.trim()
if (!outfile || outfile === '-') {
  process.stdout.write(output)
}
else {
  fs.writeFileSync(outfile, output)
}
if (errors) {
  process.exit(1)
}
