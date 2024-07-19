#!/usr/bin/env node

import ejs from "ejs"
import { parseArgs } from 'node:util'
import process from 'node:process'
import fs from 'node:fs'
import path from 'node:path'

class CLIError extends Error {
}
const parseCLI = (args) => {
  const {
    values,
    positionals
  } = parseArgs({
    args: args,
    options: {
      template: {
        type: "string",
      },
      output: {
        type: "string",
      },
      iconsDir: {
        type: "string",
      },
      verbose: {
        type: "boolean",
      },
      root: {
        type: "string"
      },
      help: {
        type: "boolean",
        short: "h",
      }
    },
    strict: true,
  })

  if (values.help) {
    console.log("Usage: mk_synths [options]")
    console.log()
    console.log("OPTIONS")
    console.log()
    console.log("  --template FILENAME  -  path to the EJS template for a synth")
    console.log("  --output DIR         -  path to where the HTML should be output")
    console.log("  --iconsDir DIR       -  path to where the SVG icons are")
    console.log("  --root PATH          -  relative path of the root of the project when served, to locate CSS and JS")
    return
  }
  let cliError = false

  const requiredOptions = [ "template", "output", "iconsDir" ]
  requiredOptions.forEach( (requiredOption) => {
    if (!values[requiredOption]) {
      cliError = true
      console.log(`--${requiredOption} is required`)
    }
  })

  if (cliError) {
    throw new CLIError()
  }

  if (values.root && values.root[values.root.length - 1] == "/") {
    values.root = values.root.slice(0,-1) || ""
  }
  else if (!values.root) {
    values.root = ""
  }

  return values
}

const log = (string) => {
  console.log(`[ ${process.argv[0]} ] ${string}`)
}

class Icon {
  constructor({dirent}) {
    this.file = dirent.isFile()
    this.extname = path.extname(dirent.name)
    this.fullPath = path.join(dirent.path,dirent.name)
    this.basename = path.basename(dirent.name,this.extname)
  }

  basename() {
    return this.basename
  }

  isIcon() {
    return this.file && this.extname === ".svg" && !this.basename.startsWith("icon_")
  }

  fileContents() {
    return fs.readFileSync(this.fullPath,"utf-8")
  }

  toString() {
    return this.fullPath
  }
}

try {
  const options = parseCLI(process.argv.slice(2))
  const icons = []

  fs.readdirSync(options.iconsDir, { withFileTypes: true }).forEach( (dirent) => {
    const icon = new Icon({dirent})
    if (icon.isIcon()) {
      log(`Processing ${icon}`)
      icons.push(icon)
    }
    else {
      if (options.verbose) {
        console.log(`${dirent.name} is not a file or not SVG - skipping`)
      }
    }
  })

  const iconsContents = icons.map( (icon) => icon.fileContents() )

  const outputFile = path.join(options.output,path.basename(options.template))

  log(`Creating index file ${outputFile}`)

  ejs.renderFile(
    options.template,
    { root_url: options.root, icons: iconsContents },
    {},
    (err, str) => {
      if (err) {
        throw err
      }
      fs.writeFileSync(outputFile,str)
    }
  )
  log("Done")
}
catch (e) {
  if (e instanceof CLIError) {
    process.exit(1)
  }
  else {
    console.log(e)
    process.exit(2)
  }
}


