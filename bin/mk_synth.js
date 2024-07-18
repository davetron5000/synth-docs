#!/usr/bin/env node

import ejs from "ejs"
import { parseArgs } from 'node:util'
import process from 'node:process'
import fs from 'node:fs'
import path from 'node:path'

class CLIError extends Error {
}
const run = (args) => {
  const {
    values,
    positionals
  } = parseArgs({
    args: args,
    options: {
      input: {
        type: "string",
      },
      outputRoot: {
        type: "string",
      },
      outputDirInRoot: {
        type: "string",
      },
      template: {
        type: "string",
      },
      indexTemplate: {
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
    console.log("  --input DIR               -  path to JSON file describing the synths")
    console.log("  --outputRoot DIR          -  path to the root of all generated HTML for the entire site")
    console.log("  --outputDirInRoot DIR     -  path, relative to outputRoot, where the synth HTML should be written")
    console.log("  --template FILENAME       -  path to the EJS template for a synth")
    console.log("  --indexTemplate FILENAME  -  path to the EJS template for /index.html")
    console.log("  --root PATH               -  relative path of the root of the project when served, to locate CSS and JS")
    return
  }
  let cliError = false

  const requiredOptions = [ "input", "outputRoot", "outputDirInRoot", "template", "indexTemplate" ]
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
    values.root = values.root.slice(0,-1)
  }

  return values
}

const log = (string) => {
  console.log(`[ ${process.argv[0]} ] ${string}`)
}

class InvalidSynth extends Error {
  constructor(fileName, errorMessage) {
    super(`${fileName}: ${errorMessage}`)
  }
}

class Synth {
  constructor({ fileName, metadata }) {
    this.fileName = fileName
    this.metadata = metadata
    if (!this.metadata.synth) {
      throw InvalidSynth(fileName,"No 'synth' top-level key")
    }
    const requiredKeys = [ "name", "features", "midi" ]
    requiredKeys.forEach( (requiredKey) => {
      if (!this.metadata.synth[requiredKey]) {
        throw InvalidSynth(fileName,`No key '${requiredKey}' inside 'synth'`)
      }
    })
    this.name = metadata.synth.name
  }
}

class InputFile {
  constructor({dirent}) {
    this.file = dirent.isFile()
    this.extname = path.extname(dirent.name)
    this.fullPath = path.join(dirent.path,dirent.name)
    this.basename = path.basename(dirent.name,this.extname)
  }

  basename() {
    return this.basename
  }

  isSynthJSON() {
    return this.file && this.extname === ".json"
  }

  fileContents() {
    return JSON.parse(fs.readFileSync(this.fullPath))
  }

  toString() {
    return this.fullPath
  }
}

class OutputFile {
  constructor({outputRoot, outputDirInRoot, synth, rootUrl, template}) {

    const synthHtmlFileName = `${synth.fileName}.html`

    this.fileName        = path.join(outputRoot,outputDirInRoot,synthHtmlFileName)
    this.synth           = synth
    this.rootUrl         = rootUrl
    this.template        = template
    this.relativePath    = `${outputDirInRoot}/${synthHtmlFileName}`
  }


  write() {
    ejs.renderFile(
      this.template,
      { root_url: this.rootUrl, synth: this.synth.metadata.synth },
      {},
      (err, str) => {
        if (err) {
          throw err
        }
        fs.writeFileSync(this.fileName,str)
      }
    )
  }
  toString() { return this.fileName }
}

try {
  const options = run(process.argv.slice(2))
  const synths = []

  fs.readdirSync(options.input, { withFileTypes: true }).forEach( (dirent) => {
    const inputFile = new InputFile({dirent})
    if (inputFile.isSynthJSON()) {
      log(`Processing ${inputFile}`)
      synths.push(
        new Synth({
          fileName: inputFile.basename,
          metadata: inputFile.fileContents() 
        })
      )
    }
    else {
      if (options.verbose) {
        console.log(`${dirent.name} is not a file or not JSON - skipping`)
      }
    }
  })
  const outputFiles = synths.map( (synth) => {
    return new OutputFile({
      outputRoot: options.outputRoot,
      outputDirInRoot: options.outputDirInRoot,
      synth: synth,
      rootUrl: options.root || "/",
      template: options.template,
    })
  }).sort( (a,b) => {
    return a.synth.name.localeCompare(b.synth.name)
  })

  outputFiles.forEach( (outputFile) => {
    log(`Outputing ${outputFile}`)
    outputFile.write() 
  })

  const indexFile = path.join(options.outputRoot,"index.html")

  log(`Creating index file ${indexFile}`)

  ejs.renderFile(
    options.indexTemplate,
    { root_url: options.root, outputFiles: outputFiles },
    {},
    (err, str) => {
      if (err) {
        throw err
      }
      fs.writeFileSync(indexFile,str)
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


