import path from 'path';
import fs from 'fs';
import {app, protocol} from 'electron';


/** @typedef  {{path: string, fallbackFile: string | null, protocolConfig: Electron.CustomScheme, handlers: {host: string, (req : Electron.Request, res: Electron.Response) => void}}} config*/

/**
 * 
 * @param {config} config 
 */
export default function createServe({path, handlers = {}, protocolConfig, fallbackFile = null}) {
    if (!path) throw new Error('Please provide the Path of the static build');
    if (!protocolConfig) throw new Error('Please provide configuration for the protocol');
    if (!protocolConfig?.scheme) throw new Error('Please provide custom_protocol');

    protocol.registerSchemesAsPrivileged([protocolConfig])

    const buildFileHandler = createBuildFileHandler(path, fallbackFile);
    app.addListener('ready', () => {
        protocol.handle(protocolConfig.scheme, (req, res) => {
            const {host, pathname} = new URL(req.url);
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

/**
 * 
 * @param {string} path_
 * @param {string | null} fallbackFile 
 * @returns 
 */
function createBuildFileHandler(path_, fallbackFile) {
    try {
        if (fallbackFile) {
            const fallbackFileState = fs.existsSync(fallbackFile);
            if (!fallbackFileState) throw new Error('t');
        }
    } catch (error) {
        throw new Error(`Provided fallbackFile not found: ${fallbackFile}.`);
    }
    return async function(request){
        const pathName = new URL(request.url).pathname;
        const filePath = path.join(path_, pathName);
        let fileName = await readForFile(filePath);
        if (!fileName) fileName = fallbackFile;
        if (!fileName) {
            return new Response('bad', {
                status: 404,
                statusText: 'Not Found'
            })
        }  
        const extension = path.extname(fileName);
        const contentType = getContentTypeFromExtension(extension);
        return new Response(fs.ReadStream(fileName), {
            headers: {'content-type': contentType}
        })   
    }
}

