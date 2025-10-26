// modules needed to run ts
const process = require('process')
const fs = require('fs')
const rls = require('readline-sync')

// basic stuffs
const filePath = process.argv[2]
const operation = process.argv[3]
const flags = process.argv.slice(4) ?? null

/**
* Variable storage
*/
const variables = {}
/**
 * Store functions to be called later
 */
const functions = {}
/**
 * Current mode.
 * Available modes:
 * *def* - Default,
 * *if* - If statement,
 * *func* - Writing a function
 */
var mode = 'def'

const codes = {
    success: 0,
    fail: 1
}

const eCodes = {
    nullFile: 1,
    dirNotFile: 2,
    invalidOperation: 3,
    notALoom: 4
}

if (!fs.existsSync(filePath)) {
    console.error("ERROR\nFile " + filePath + " doesn't exist (Error Code " + eCodes.nullFile + ")\nCheck if you may have misspelled the file name.")
    process.exit(codes.fail)
} else if (fs.lstatSync(filePath).isDirectory()) {
    console.error("ERROR\nThe specified path does not lead to a file, rather a directory (Error code " + eCodes.dirNotFile + ")\nIf you added a \\ or / after, the file name, please remove it, otherwise enter file path, not a directory.")
    process.exit(codes.fail)
} else if (!filePath.endsWith('.loom')) {
    console.error("ERROR\nThe file " + filePath + " is not a .loom file (Error code " + eCodes.notALoom + ")\nDid you accidentally type the wrong file name?")
    process.exit(codes.fail)
}

/**
 * Stop the thread for a specified amount of time
 * @param {number} milliseconds Time in milliseconds.
 */
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function interpretText(code = '') {
    const lines = code.split("\n")

    // Only during if statements!!
    var isTrue = null

    for (let line of lines) {
        if (line.startsWith('$')) { continue }
        const tokens = line.trim().split(/\s+/)
        if (!line) { continue }
        if (isTrue == false && tokens[0] != 'end') { continue }
        if (tokens[0] == 'print') {
            const printCont = tokens.slice(1)
            var res = ''
            for (let t of printCont) {
                if (t.startsWith('%')) {
                    t = t.replace('%', '')
                    if (!variables[t.trim()]) {
                        return 'Variable ' + t + ' doesn\'t exist.\nLine ' + parseInt(lines.indexOf(line) + 1);
                    } else {
                        res += variables[t.trim()] + ' '
                    }
                } else if (t == '\\t') {
                    res += '\t'
                } else if (t == '\\n') {
                    res += '\n'
                }  else {
                    res += t + ' '
                }
            }
            console.log(res)
        } else if (tokens[0] == 'set') {
            const name = tokens[1]
            var value = tokens.slice(3).join(' ') ?? null
            if (tokens[2] != '=') {
                return 'Incorrect variable definition at line ' + parseInt(lines.indexOf(line) + 1);
            }
            variables[name] = value
        } else if (tokens[0] == "input") {
            const saveAsVar = tokens[1]
            const inpt = tokens.slice(2)
            var inputText = ''
            for (let t of inpt) {
                if (t.startsWith('%')) {
                    t = t.replace('%', '')
                    if (!variables[t.trim()]) {
                        return 'Variable ' + t + ' doesn\'t exist.\nLine ' + parseInt(lines.indexOf(line) + 1);
                    } else {
                        inputText += variables[t.trim()] + ' '
                    }
                } else if (t == '\\t') {
                    inputText += '\t'
                } else if (t == '\\n') {
                    inputText += '\n'
                } else {
                    inputText += t + ' '
                }
            }
            const inputty = rls.question(inputText)
            if (saveAsVar == "_") {
                // do nothing
            } else {
                variables[saveAsVar] = inputty
            }
        } else if (tokens[0] == 'if') {
            const items = {
                1: tokens[1],
                op: tokens[2],
                2: tokens.slice(3).join('')
            }
            mode = 'if'
            if (!items["1"]) {
                return 'Invalid if statement.\nSyntax:\nif <item|%var> <==|!=> <value>\n\t[code]\nend\nLine ' + parseInt(lines.indexOf(line) + 1)
            } else if (!items.op) {
                return 'Invalid if statement.\nExpected operator, got NIL.\nLine ' + parseInt(lines.indexOf(line) + 1)
            } else if (!items["2"]) {
                return 'Invalid if statement.\nComparing with NIL. Not possible.\nLine ' + parseInt(lines.indexOf(line) + 1)
            } else if (items.op != '==' && items.op != '!=') {
                return 'Invalid operator for if statement.\nExpected == or !=, got ' + items.op + '.\nLine ' + parseInt(lines.indexOf(line) + 1)
            }
            if (items.op == '==') {
                if (items["1"].startsWith('%')) {
                    const v = items["1"].replace('%', '').trim()
                    if (!variables[v]) {
                        return 'Variable ' + v + ' doesn\'t exist.\nLine ' + parseInt(lines.indexOf(line) + 1)
                    }
                    isTrue = variables[v].trim() == items["2"]
                } else {
                    isTrue = items["1"] == items["2"]
                }
            } else if (items.op == '!=') {
                if (items["1"].startsWith('%')) {
                    const v = items["1"].replace('%', '').trim()
                    if (!variables[v]) {
                        return 'Variable ' + v + ' doesn\'t exist.\nLine ' + parseInt(lines.indexOf(line) + 1)
                    }
                    isTrue = variables[v] != items["2"]
                } else {
                    isTrue = items["1"] != items["2"]
                }
            }
        } else if (tokens[0] == 'end') {
            if (mode != 'if') {
                return 'Stray end at line ' + parseInt(lines.indexOf(line) + 1)
            } else {
                isTrue = null
                mode = 'def'
            }
        } else if (tokens[0] == 'sleep') {
            var time = tokens[1]// in seconds
            if (!time) {
                return 'No time (seconds) specified.\nLine ' + parseInt(lines.indexOf(line) + 1)
            }
            time = parseFloat(time) * 1000
            sleep(time)
        } else if (tokens[0] == 'math') {
            const op = tokens[1]
            const v = tokens[2]
            const num = tokens[3]
            if (!op) {
                return 'Operator doesn\'t exist.\nadd|sub|mult|div. Line ' + parseInt(lines.indexOf(line) + 1)
            } else if (!v || !variables[v]) {
                return 'Variable does not exist or is NIL.\nLine ' + parseInt(lines.indexOf(line) + 1)
            } else if (!num || !parseFloat(num)) {
                return 'Number doesn\'t exist or is not a number.\nLine ' + parseInt(lines.indexOf(line) + 1)
            }
            if (op == 'add') {
                variables[v] = parseFloat(variables[v]) + parseFloat(num)
            } else if (op == 'sub') {
                variables[v] = parseFloat(variables[v]) - parseFloat(num)
            } else if (op == 'mult') {
                variables[v] = parseFloat(variables[v]) * parseFloat(num)
            } else if (op == 'div') {
                variables[v] = parseFloat(variables[v]) + parseFloat(num)
            } else {
                return 'Invalid operator.\nLine ' + parseInt(lines.indexOf(line) + 1)
            }
        } else {
            if (tokens[0] == '' || tokens[0] == undefined) {} else { return 'Invalid command ' + tokens[0] + '.\nLine ' + parseInt(lines.indexOf(line) + 1) }
        }
    }
}

/**
 * Interpret file with any flags
 * 
 * @param file Which file to interpret
 * @param flagz What flags to use
 * @returns Expected to return null if success, otherwise returns an exception
 */

function interpret(file = '', flagz = []) {
    const contents = fs.readFileSync(file, 'utf-8')
    const lines = contents.split("\n")

    // During function writing, use this.
    var fName = ''
    // Only during if statements!!
    var isTrue = null

    for (let line of lines) {
        if (line.startsWith('$')) { continue }
        const tokens = line.trim().split(/\s+/)
        if (isTrue == false && tokens[0] != 'end') { continue }
        if (fName.length > 0 && tokens[0] != 'end') {
            if (!functions[fName]) functions[fName] = ''  // init as empty string
            functions[fName] += line + '\n'
            continue
        }
        if (tokens[0] == 'print') {
            const printCont = tokens.slice(1)
            var res = ''
            for (let t of printCont) {
                if (t.startsWith('%')) {
                    t = t.replace('%', '')
                    if (!variables[t.trim()]) {
                        return 'Variable ' + t + ' doesn\'t exist.\nLine ' + parseInt(lines.indexOf(line) + 1);
                    } else {
                        res += variables[t.trim()] + ' '
                    }
                } else if (t == '\\t') {
                    res += '\t'
                } else if (t == '\\n') {
                    res += '\n'
                }  else {
                    res += t + ' '
                }
            }
            console.log(res)
        } else if (tokens[0] == 'set') {
            const name = tokens[1]
            var value = tokens.slice(3).join(' ') ?? null
            if (tokens[2] != '=') {
                return 'Incorrect variable definition at line ' + parseInt(lines.indexOf(line) + 1);
            }
            variables[name] = value
        } else if (tokens[0] == "input") {
            const saveAsVar = tokens[1]
            const inpt = tokens.slice(2)
            var inputText = ''
            for (let t of inpt) {
                if (t.startsWith('%')) {
                    t = t.replace('%', '')
                    if (!variables[t.trim()]) {
                        return 'Variable ' + t + ' doesn\'t exist.\nLine ' + parseInt(lines.indexOf(line) + 1);
                    } else {
                        inputText += variables[t.trim()] + ' '
                    }
                } else if (t == '\\t') {
                    inputText += '\t'
                } else if (t == '\\n') {
                    inputText += '\n'
                } else {
                    inputText += t + ' '
                }
            }
            const inputty = rls.question(inputText)
            if (saveAsVar == "_") {
                // do nothing
            } else {
                variables[saveAsVar] = inputty
            }
        } else if (tokens[0] == 'if') {
            const items = {
                1: tokens[1],
                op: tokens[2],
                2: tokens.slice(3).join('')
            }
            mode = 'if'
            if (!items["1"]) {
                return 'Invalid if statement.\nSyntax:\nif <item|%var> <==|!=> <value>\n\t[code]\nend\nLine ' + parseInt(lines.indexOf(line) + 1)
            } else if (!items.op) {
                return 'Invalid if statement.\nExpected operator, got NIL.\nLine ' + parseInt(lines.indexOf(line) + 1)
            } else if (!items["2"]) {
                return 'Invalid if statement.\nComparing with NIL. Not possible.\nLine ' + parseInt(lines.indexOf(line) + 1)
            } else if (items.op != '==' && items.op != '!=') {
                return 'Invalid operator for if statement.\nExpected == or !=, got ' + items.op + '.\nLine ' + parseInt(lines.indexOf(line) + 1)
            }
            if (items.op == '==') {
                if (items["1"].startsWith('%')) {
                    const v = items["1"].replace('%', '').trim()
                    if (!variables[v]) {
                        return 'Variable ' + v + ' doesn\'t exist.\nLine ' + parseInt(lines.indexOf(line) + 1)
                    }
                    isTrue = variables[v].trim() == items["2"]
                } else {
                    isTrue = items["1"] == items["2"]
                }
            } else if (items.op == '!=') {
                if (items["1"].startsWith('%')) {
                    const v = items["1"].replace('%', '').trim()
                    if (!variables[v]) {
                        return 'Variable ' + v + ' doesn\'t exist.\nLine ' + parseInt(lines.indexOf(line) + 1)
                    }
                    isTrue = variables[v] != items["2"]
                } else {
                    isTrue = items["1"] != items["2"]
                }
            }
        } else if (tokens[0] == 'end') {
            if (mode != 'if' && mode != 'func') {
                return 'Stray end at line ' + parseInt(lines.indexOf(line) + 1)
            } else {
                isTrue = null
                fName = ''
                mode = 'def'
            }
        } else if (tokens[0] == 'sleep') {
            var time = tokens[1]// in seconds
            if (!time) {
                return 'No time (seconds) specified.\nLine ' + parseInt(lines.indexOf(line) + 1)
            }
            time = parseFloat(time) * 1000
            sleep(time)
        } else if (tokens[0] == 'math') {
            const op = tokens[1]
            const v = tokens[2]
            var num = tokens[3]
            if (!op) {
                return 'Operator doesn\'t exist.\nadd|sub|mult|div. Line ' + parseInt(lines.indexOf(line) + 1)
            } else if (!v || !variables[v]) {
                return 'Variable does not exist or is NIL.\nLine ' + parseInt(lines.indexOf(line) + 1)
            } else if (!num || !parseFloat(num) && !num.startsWith('%')) {
                return 'Number doesn\'t exist or is not a number.\nLine ' + parseInt(lines.indexOf(line) + 1)
            }
            if (num.startsWith('%')) {
               num = variables[num.replace('%', '')] 
            }
            if (op == 'add') {
                variables[v] = parseFloat(variables[v]) + parseFloat(num)
            } else if (op == 'sub') {
                variables[v] = parseFloat(variables[v]) - parseFloat(num)
            } else if (op == 'mult') {
                variables[v] = parseFloat(variables[v]) * parseFloat(num)
            } else if (op == 'div') {
                variables[v] = parseFloat(variables[v]) + parseFloat(num)
            } else {
                return 'Invalid operator.\nLine ' + parseInt(lines.indexOf(line) + 1)
            }
        } else if (tokens[0] == 'function') {
            mode = 'func'
            const functionName = tokens[1]
            if (!functionName.endsWith('()')) {
                return 'Invalid function name at line ' + parseInt(lines.indexOf(line) + 1)
            }
            fName = functionName
        } else {
            if (tokens[0] == '') {} else if (tokens[0].endsWith('()')) {
                const e = interpretText(functions[tokens[0]])
                if (e) {
                    return 'Function call returned exception: ' + e
                }
            } else { return 'Invalid command ' + tokens[0] + '.\nLine ' + parseInt(lines.indexOf(line) + 1) }
        }
    }
}

if (operation == 'run') {
    const res = interpret(filePath, flags)
    if (res) {
        console.error("ERROR\n" + res)
        process.exit(codes.fail)
    }
} else {
    console.error("ERROR\nInvalid operation " + operation + " (Error code " + eCodes.invalidOperation + ")\nCurrently available operations: run")
}