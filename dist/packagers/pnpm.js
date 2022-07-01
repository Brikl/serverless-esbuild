"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pnpm = void 0;
const ramda_1 = require("ramda");
const utils_1 = require("../utils");
/**
 * pnpm packager.
 */
class Pnpm {
    get lockfileName() {
        return 'pnpm-lock.yaml';
    }
    get copyPackageSectionNames() {
        return [];
    }
    get mustCopyModules() {
        return false;
    }
    getProdDependencies(cwd, depth) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get first level dependency graph
            const command = /^win/.test(process.platform) ? 'pnpm.cmd' : 'pnpm';
            const args = [
                'ls',
                '--prod',
                '--json',
                depth ? `--depth=${depth}` : null,
            ].filter(Boolean);
            // If we need to ignore some errors add them here
            const ignoredPnpmErrors = [];
            try {
                const processOutput = yield utils_1.spawnProcess(command, args, { cwd });
                const depJson = processOutput.stdout;
                return JSON.parse(depJson);
            }
            catch (err) {
                if (err instanceof utils_1.SpawnError) {
                    // Only exit with an error if we have critical npm errors for 2nd level inside
                    const errors = ramda_1.split('\n', err.stderr);
                    const failed = ramda_1.reduce((f, error) => {
                        if (f) {
                            return true;
                        }
                        return (!ramda_1.isEmpty(error) &&
                            !ramda_1.any(ignoredError => ramda_1.startsWith(`npm ERR! ${ignoredError.npmError}`, error), ignoredPnpmErrors));
                    }, false, errors);
                    if (!failed && !ramda_1.isEmpty(err.stdout)) {
                        return { stdout: err.stdout };
                    }
                }
                throw err;
            }
        });
    }
    _rebaseFileReferences(pathToPackageRoot, moduleVersion) {
        if (/^file:[^/]{2}/.test(moduleVersion)) {
            const filePath = ramda_1.replace(/^file:/, '', moduleVersion);
            return ramda_1.replace(/\\/g, '/', `file:${pathToPackageRoot}/${filePath}`);
        }
        return moduleVersion;
    }
    /**
     * We should not be modifying 'pnpm-lock.yaml'
     * because this file should be treated as internal to pnpm.
     */
    rebaseLockfile(pathToPackageRoot, lockfile) {
        if (lockfile.version) {
            lockfile.version = this._rebaseFileReferences(pathToPackageRoot, lockfile.version);
        }
        if (lockfile.dependencies) {
            for (const lockedDependency in lockfile.dependencies) {
                this.rebaseLockfile(pathToPackageRoot, lockedDependency);
            }
        }
        return lockfile;
    }
    install(cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = /^win/.test(process.platform) ? 'pnpm.cmd' : 'pnpm';
            const args = ['install', '--frozen-lockfile'];
            yield utils_1.spawnProcess(command, args, { cwd });
        });
    }
    prune(cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = /^win/.test(process.platform) ? 'pnpm.cmd' : 'pnpm';
            const args = ['prune'];
            yield utils_1.spawnProcess(command, args, { cwd });
        });
    }
    runScripts(cwd, scriptNames) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = /^win/.test(process.platform) ? 'pnpm.cmd' : 'pnpm';
            yield Promise.all(scriptNames.map(scriptName => {
                const args = ['run', scriptName];
                return utils_1.spawnProcess(command, args, { cwd });
            }));
        });
    }
}
exports.Pnpm = Pnpm;
