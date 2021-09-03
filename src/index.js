const p = require('path');
const fs = require('fs');

const startServer = require('./libs/http-server');
const createWss = require('./libs/websocket');
const connect = require('./helpers/connect-ws-server');
const ft = require('./helpers/file-type');
const FileWatcher = require('./libs/FileWatcher');

module.exports = function ({port=8082, path=".", config}) {
    const app = startServer();


    const server = connect(app, port, function () {
        console.log('Map Data  ->  http://localhost:%d%s', port, app.MAP_ROUTE);
        console.log('File View  ->  http://localhost:%d%s', port, app.FILE_VIEW_ROUTE);
    });

    path = p.resolve(path);
    const wss = createWss(path, app, {server});

    const injectGlobalData = {port};
    if (config) {
        const configWorker = require('./libs/config-worker');
        configWorker(config, {app, injectGlobalData});
        console.log("Config is Working!");
    }

    app.setStatic({
        path,
        injectGlobalData
    });

    const handleFileChange = function (eventType, filename) {
        const log = () => console.log(`Detected file's change: ${p.join(this.filename, filename)} => ${eventType}`);
        const filter = (client, name=filename) => {
            return p.isAbsolute(client.registerData.value)
                ? client.registerData.value == p.join(this.filename, name) : client.registerData.value == name
        };
        const absolutePath = p.join(this.filename, filename);
        if (/*ft.isHTML(filename)*/app.pathMap.exists(absolutePath)) {
            app.setPathMap(absolutePath, true).then(() => {
                log();
                wss.broadcast(['log', 'reload'], [`${filename} => ${eventType}`, null], filter);
            });
        } else {
            app.pathMap.keys().forEach((htmlPath)  => {
                const absolutePath = p.join(this.filename, filename);
                const isCssChange = absolutePath.endsWith(".css");
                let string = null;
                if (string = app.pathMap.get(htmlPath)[absolutePath]) {
                    if (htmlPath.startsWith(this.filename)) {
                        log();
                        let relativePath = htmlPath.substr(this.filename.length);
                        relativePath = relativePath.startsWith('/') ? relativePath.substr(1) : relativePath;
                        wss.broadcast(
                            ['log', isCssChange ? 'refreshCSS' : 'reload'],
                            [`${filename}(${string}) => ${eventType}`, isCssChange ? [string] : null],
                            (client) => {
                                return filter(client, relativePath);
                            }
                        );
                    }
                }
            });
        }
    };

    const registerFileWatcher = module.exports.registerFileWatcher = function (path, opts) {
        const watcher = new FileWatcher(path, opts);
        watcher.on('all', handleFileChange);
        return watcher;
    };

    registerFileWatcher(path);
}
