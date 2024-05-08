import path from 'path';
import fs from 'fs';
import { protocol, app } from 'electron';

/** @typedef  {{path: string, custom_protocol: string, protocolConfig: Electron.CustomScheme, handlers: {host: string, (req : Electron.Request, res: Electron.Response) => void}}} config*/

/**
 * 
 * @param {config} config 
 */
export function createServe({path, custom_protocol, handlers = {}, protocolConfig}) {
    if (!path) throw new Error('Please provide the Path of the static build');
    if (!custom_protocol) throw new Error('Please provide custom_protocol');
    if (!protocolConfig) throw new Error('Please provide configuration for the protocol');

    protocol.registerSchemesAsPrivileged([protocolConfig])

    const buildFileHandler = createBuildFileHandler(path);
    app.whenReady(() => {
        protocol.handle(custom_protocol, (req, res) => {
            const {host, pathname} = new URL(request.URL);
            if (host === 'app') {
                return buildFileHandler(req);
            }
            handlers[host] && handlers[host](req, res);
        })
    })
}

/**
 * 
 * @param {string} path 
 * @param { (path: string, details: fs.Stats) => void} fileFoundAction 
 * @returns 
 */
const readForFile = async (pathToGet) => {
    try {
        const res = await fs.promises.stat(pathToGet);
        if (res.isDirectory()) {
            return readForFile(path.join(pathToGet, 'index.html'));
        }
        if (res.isFile()) {
            return pathToGet;
        }
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * 
 * @param {string} ext 
 * @returns 
 */
const getContentTypeFromExtension = (ext) => {
    ext = ext?.slice(1);
    switch(ext) {
        case 'html': {
            return `text/html`
        }
        case 'css': {
            return 'text/css'
        }
        case 'js': {
            return 'text/javascript'
        }
        case 'json':
        case 'map': {
            return 'application/json'
        }
        default: {
            return 'application/octet-stream'
        }
    }
}

async function createBuildFileHandler(path_) {
    const indexFilePath = path.join(path_, 'index.html');
    try {
        const indexFileStat = await fs.promises.stat(indexFilePath);
    } catch (error) {
        throw new Error(`No index file found at ${indexFilePath}.`);
    }
    return async (request) => {
        const pathName = new URL(request.url).pathname;
        const filePath = path.join(path_, pathName);
        let fileName = await readForFile(filePath);
        if (!fileName) fileName = indexFilePath;
        const extension = path.extname(fileName);
        const contentType = getContentTypeFromExtension(extension);
        return new Response(fs.ReadStream(fileName), {
            headers: {'content-type': contentType}
        })   
    }
}

