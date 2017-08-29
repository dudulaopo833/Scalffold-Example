import fs from 'fs';import shell from 'shelljs';import winston from 'winston';import inquirer from 'inquirer';import { isString, isFunction, forIn, has, assign, lowerFirst, join, split } from 'lodash';import semver from 'semver';import jsonfile from 'jsonfile';import handlebars from 'handlebars';import cbPackageJson from '../../package';import pcList from './packageconfig';shell.config.silent = true;winston.addColors({    error: 'red',    warn: 'yellow',    info: 'blue'});winston.configure({    transports: [        new winston.transports.Console({            level: 'info',            handleExceptions: true,            json: false,            colorize: true        })    ]});export const logger = winston;export class ProcessMessage {    constructor () {        this.loader = [            '/ Processing, please wait...',            '| Processing, please wait...',            '\\ Processing, please wait...',            '- Processing, please wait...'        ];        this.ui = new inquirer.ui.BottomBar({ bottomBar: this.loader[this.loader.length % 4] });        this.start = this.start.bind(this);        this.stop = this.stop.bind(this);        this.complete = this.complete.bind(this);    }    start () {        if (this.handler) {            clearInterval(this.handler);            this.handler = null;        }        let index = 0;        this.handler = setInterval(() => {            this.ui.updateBottomBar(this.loader[index++ % 4]);        }, 300);    }    stop () {        if (this.handler) {            clearInterval(this.handler);            this.handler = null;        }    }    complete () {        if (this.handler) {            this.stop();        }        this.ui.updateBottomBar('Processing completed!\n');    }}export const executeComand = (command) => {    let execResult = null;    if (isString(command)) {        execResult = shell.exec(command);    } else if (isFunction(command)) {        execResult = command();    } else {        throw new Error(`Invalid type of argument ${command}. Expecting "string" or "function" but actually recieved "${typeof command}".`);    }    if (execResult && execResult.code && execResult.code !== 0) {        logger.error(`Error: Execute command "${command}" failed with code ${execResult.code}.`);        shell.exit(1);        process.exit(1);    }    return execResult;};export const getExistingProjectName = () => {    const sourceDir = getCurrentDir();    const projectNames = [];    if (fs.existsSync(sourceDir)) {        fs.readdirSync(sourceDir).forEach((name) => {            projectNames.push(name);        });    }    return projectNames;};export const getExistingPages = () => {    const pwd = getCurrentDir();    const sourceDir = `${pwd}/src/pages`;    const pages = [];    if (fs.existsSync(sourceDir)) {        fs.readdirSync(sourceDir).forEach((page) => {            pages.push(page);        });    }    return pages;};export const getComponenstList = (sourceDir) => {    const components = [];    const templateDir = `${sourceDir}/templates`;    if (fs.existsSync(templateDir)) {        fs.readdirSync(templateDir).forEach((template) => {            components.push(template);        });    }    const organismDir = `${sourceDir}/organisms`;    if (fs.existsSync(organismDir)) {        fs.readdirSync(organismDir).forEach((organism) => {            components.push(organism);        });    }    const moleculeDir = `${sourceDir}/molecules`;    if (fs.existsSync(moleculeDir)) {        fs.readdirSync(moleculeDir).forEach((molecule) => {            components.push(molecule);        });    }    const atomDir = `${sourceDir}/atoms`;    if (fs.existsSync(atomDir)) {        fs.readdirSync(atomDir).forEach((atom) => {            components.push(atom);        });    }    return components;};export const getExistingPageComponents = (pageName) => {    const pwd = getCurrentDir();    const sourceDir = `${pwd}/src/pages/${pageName}/components`;    const components = getComponenstList(sourceDir);    return components;};export const getExistingSharedComponent = () => {    const pwd = getCurrentDir();    const sourceDir = `${pwd}/src/shared/components`;    const components = getComponenstList(sourceDir);    return components;};export const getExistingSharedContainer = () => {    const pwd = getCurrentDir();    const sourceDir = `${pwd}/src/shared/containers`;    const containers = [];    if (fs.existsSync(sourceDir)) {        fs.readdirSync(sourceDir).forEach((container) => {            containers.push(container);        });    }    return containers;};export const getCurrentDir = () => {    const pwdResult = executeComand(() => {        return shell.pwd();    });    return pwdResult.stdout;};export const initAppWithMetaInfo = (metaInfo) => {    const pwd = getCurrentDir();    createAppStructureWithMetaInfo(pwd, metaInfo);    copyWebpackConfig(pwd, cbPackageJson);    copyPackagesConfig(pwd, cbPackageJson);    copyAppTemplates(pwd, cbPackageJson);    handleAppTemplates(pwd, cbPackageJson, metaInfo);    updateContentPackageJson(pwd);    executeComand(`${getNpmClient()} install`);    scanPackageToMergeDependencies();    executeComand(`${getNpmClient()} install`);};export const designItemsWithMetaInfo = (metaInfo) => {    const pwd = getCurrentDir();    // Create each page's structure    createPagesStructureWithMetaInfo(pwd, metaInfo.pages);    // Create each shared container structure    createSharedContainersStructureWithMetaInfo(pwd, metaInfo.sharedContainers);    // Create each shared components structure    createSharedComponentsStructureWithMetaInfo(pwd, metaInfo.sharedComponents);    // Create each page components structure    createPageComponentsStructureWithMetaInfo(pwd, metaInfo.pageComponents);};export const createExampleApp = () => {    executeComand('git clone git@alm-github.systems.uk.hsbc:Digital-Wealth-FE/group-digital-wealth-example-app-content.git');    executeComand('git clone git@alm-github.systems.uk.hsbc:Digital-Wealth-FE/group-digital-wealth-example-app.git');};export const createPlainApp = (applicationJsonData) => {    const isContentApp = false;    commonActionToCreateApp(applicationJsonData, isContentApp);};export const createPlainContentApp = (contentJsonData) => {    const isContentApp = true;    commonActionToCreateApp(contentJsonData, isContentApp);};const commonActionToCreateApp = (packageJsonData, isContentApp) => {    const devDependentPackage = isContentApp ? { 'group-digital-wealth-content-builder': '^1.0.0' } : { 'group-digital-wealth-starterkit': '^1.0.0' };    const packageJsonContent = {        'name': packageJsonData.name,        'version': '1.0.0',        'description': packageJsonData.description,        'main': 'index.js',        'author': 'HSBC',        'license': 'ISC',        'keywords': [],        'repository': {            'type': 'git',            'url': `git+${packageJsonData.gitRepository}`        },        'private': true,        'publishConfig': {            'registry': ''        },        'scripts': {        },        'devDependencies': {            ...devDependentPackage        }    };    // Create package.json file    let pwd = getCurrentDir();    const projectName = packageJsonData.name;    shell.mkdir('-p', [`${pwd}/${projectName}`]);    shell.cd(`${projectName}`);    pwd = getCurrentDir();    const packageJsonLoc = `${pwd}/package.json`;    shell.touch(packageJsonLoc);    jsonfile.writeFileSync(packageJsonLoc, packageJsonContent, { spaces: 2 });    executeComand(`${getNpmClient()} install`);};const getNpmClient = () => {    const nodeEnv = process.env.NODE_ENV || 'development';    let npmClient = 'npm';    if (nodeEnv === 'development') {        npmClient = 'yarn';    }    return npmClient;};export const updateContentPackageJson = (pwd) => {    const packageJsonLoc = `${pwd}/package.json`;    const jsonToMergeLoc = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/package.json`;    const oldContent = jsonfile.readFileSync(packageJsonLoc);    const contentToMerge = jsonfile.readFileSync(jsonToMergeLoc);    const oldDevDependencies = oldContent.devDependencies || {};    const newDevDependencies = contentToMerge.devDependencies || {};    const newPackageJson = {        ...oldContent,        ...contentToMerge,        devDependencies: {            ...oldDevDependencies,            ...newDevDependencies        }    };    jsonfile.writeFileSync(packageJsonLoc, newPackageJson, { spaces: 2 });};export const createAppStructureWithMetaInfo = (pwd, metaInfo) => {    // Create the base structure    shell.mkdir('-p', [        `${pwd}/src/images`,        `${pwd}/src/pages`,        `${pwd}/src/routes`,        `${pwd}/src/shared/components`,        `${pwd}/src/shared/components/templates`,        `${pwd}/src/shared/components/atoms`,        `${pwd}/src/shared/components/molecules`,        `${pwd}/src/shared/components/organisms`,        `${pwd}/src/shared/containers`,        `${pwd}/src/state`,        `${pwd}/src/styles/fonts`,        `${pwd}/webpack`,        `${pwd}/webpack/plugins`,        `${pwd}/config`,        `${pwd}/content`,        `${pwd}/server`,        `${pwd}/server/static`    ]);    // Create each page's structure    createPagesStructureWithMetaInfo(pwd, metaInfo.pages);    // Create each shared container structure    createSharedContainersStructureWithMetaInfo(pwd, metaInfo.sharedContainers);    // Create each shared components structure    createSharedComponentsStructureWithMetaInfo(pwd, metaInfo.sharedComponents);    // Create each page components structure    createPageComponentsStructureWithMetaInfo(pwd, metaInfo.pageComponents);};export const createPagesStructureWithMetaInfo = (pwd, pageListArray) => {    // Create each page's structure    for (const page of pageListArray) {        const pageName = page.pageName;        const folderArray = [            `${pwd}/src/pages/${pageName}`,            `${pwd}/src/pages/${pageName}/components/styles`,            `${pwd}/src/pages/${pageName}/components/templates`,            `${pwd}/src/pages/${pageName}/components/organisms`,            `${pwd}/src/pages/${pageName}/components/molecules`,            `${pwd}/src/pages/${pageName}/components/atoms`,            `${pwd}/src/pages/${pageName}/containers/state`        ];        const fileArray = [            `${pwd}/src/pages/${pageName}/index.js`,            `${pwd}/src/pages/${pageName}/components/styles/${pageName}.scss`,            `${pwd}/src/pages/${pageName}/components/templates/${pageName}.js`,            `${pwd}/src/pages/${pageName}/containers/index.js`,            `${pwd}/src/pages/${pageName}/containers/state/actions.js`,            `${pwd}/src/pages/${pageName}/containers/state/reducers.js`        ];        const needService = page.needFeatures.includes('Need Service');        if (needService) {            folderArray.push(                `${pwd}/src/pages/${pageName}/services`            );            fileArray.push(                `${pwd}/src/pages/${pageName}/services/configureApi.js`            );        }        const needValidation = page.needFeatures.includes('Need Validation');        if (needValidation) {            folderArray.push(                `${pwd}/src/pages/${pageName}/validators`            );            fileArray.push(                `${pwd}/src/pages/${pageName}/validators/sampleValidator.js`            );        }        shell.mkdir('-p', folderArray);        // Create the empty file        for (const path of fileArray) {            shell.touch(path);        }    }};export const createSharedContainersStructureWithMetaInfo = (pwd, containersList) => {    let folderArray = [];    let fileArray = [];    for (const container of containersList) {        folderArray = [...folderArray, ...[            `${pwd}/src/shared/containers/${container}`,            `${pwd}/src/shared/containers/${container}/state`        ]];        fileArray = [...fileArray, ...[            `${pwd}/src/shared/containers/${container}/index.js`,            `${pwd}/src/shared/containers/${container}/state/actions.js`,            `${pwd}/src/shared/containers/${container}/state/reducers.js`        ]];    }    shell.mkdir('-p', folderArray);    for (const path of fileArray) {        shell.touch(path);    }};export const createSharedComponentsStructureWithMetaInfo = (pwd, componentsList) => {    const { folderArray, fileArray } = generateComponentsStructurePath(pwd, true, componentsList);    shell.mkdir('-p', folderArray);    for (const path of fileArray) {        shell.touch(path);    }};export const createPageComponentsStructureWithMetaInfo = (pwd, componentsList) => {    const { folderArray, fileArray } = generateComponentsStructurePath(pwd, false, componentsList);    shell.mkdir('-p', folderArray);    for (const path of fileArray) {        shell.touch(path);    }};export const generateComponentsStructurePath = (pwd, sharedComponentFlag, componentsList) => {    let folderArray = [];    let fileArray = [];    for (const component of componentsList) {        const componentName = component.componentName;        const componentType = component.componentType;        const underPageName = sharedComponentFlag === true ? '' : component.underPageName;        const prefixPWD = sharedComponentFlag === true ? `${pwd}/src/shared/components/` : `${pwd}/src/pages/${underPageName}/components`;        switch (componentType) {            case 'Atom': {                const result = generateComponentTypeStructurePath(prefixPWD, 'atoms', componentName);                folderArray = [...folderArray, ...result.folderArray];                fileArray = [...fileArray, ...result.fileArray];                break;            }            case 'Molecule': {                const result = generateComponentTypeStructurePath(prefixPWD, 'molecules', componentName);                folderArray = [...folderArray, ...result.folderArray];                fileArray = [...fileArray, ...result.fileArray];                break;            }            case 'Organism': {                const result = generateComponentTypeStructurePath(prefixPWD, 'organisms', componentName);                folderArray = [...folderArray, ...result.folderArray];                fileArray = [...fileArray, ...result.fileArray];                break;            }            case 'Template': {                const result = generateComponentTypeStructurePath(prefixPWD, 'templates', componentName);                folderArray = [...folderArray, ...result.folderArray];                fileArray = [...fileArray, ...result.fileArray];                break;            }            default:                break;        }    }    return {        folderArray,        fileArray    };};export const generateComponentTypeStructurePath = (prefixPWD, componentType, componentName) => {    const folderArray = [        `${prefixPWD}/${componentType}/${componentName}`    ];    const fileArray = [        `${prefixPWD}/${componentType}/${componentName}/index.js`,        `${prefixPWD}/${componentType}/${componentName}/${componentName}.js`,        `${prefixPWD}/${componentType}/${componentName}/style.scss`    ];    return {        folderArray,        fileArray    };};export const copyPackagesConfig = (pwd, cbPackageJson) => {    const sourceDirwithoutDot = `${pwd}/node_modules/${cbPackageJson.name}/configuration/packagesConfig/withoutDot`;    fs.readdirSync(sourceDirwithoutDot).forEach((templateFileName) => {        shell.cp('-f', `${sourceDirwithoutDot}/${templateFileName}`, `${pwd}/${templateFileName}`);    });    const sourceDirwithDot = `${pwd}/node_modules/${cbPackageJson.name}/configuration/packagesConfig/withDot`;    fs.readdirSync(sourceDirwithDot).forEach((templateFileName) => {        shell.cp('-f', `${sourceDirwithDot}/${templateFileName}`, `${pwd}/.${templateFileName}`);    });};export const copyWebpackConfig = (pwd, cbPackageJson) => {    const sourceDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/webpackConfig/configs`;    fs.readdirSync(sourceDir).forEach((templateFileName) => {        shell.cp('-f', `${sourceDir}/${templateFileName}`, `${pwd}/webpack/${templateFileName}`);    });    const pluginDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/webpackConfig/plugins`;    fs.readdirSync(pluginDir).forEach((templateFileName) => {        shell.cp('-f', `${pluginDir}/${templateFileName}`, `${pwd}/webpack/plugins/${templateFileName}`);    });};export const copyAppTemplates = (pwd, cbPackageJson) => {    const templateSourceDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/indexTemplates`;    fs.readdirSync(templateSourceDir).forEach((templateFileName) => {        shell.cp('-f', `${templateSourceDir}/${templateFileName}`, `${pwd}/src/${templateFileName}`);    });    const routersSourceDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/routesTemplates`;    fs.readdirSync(routersSourceDir).forEach((templateFileName) => {        shell.cp('-f', `${routersSourceDir}/${templateFileName}`, `${pwd}/src/routes/${templateFileName}`);    });    const styleSourceDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/styleTemplates`;    fs.readdirSync(styleSourceDir).forEach((templateFileName) => {        shell.cp('-f', `${styleSourceDir}/${templateFileName}`, `${pwd}/src/styles/${templateFileName}`);    });    const fontSourceDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/fonts`;    fs.readdirSync(fontSourceDir).forEach((templateFileName) => {        shell.cp('-f', `${fontSourceDir}/${templateFileName}`, `${pwd}/src/styles/fonts/${templateFileName}`);    });    const serverSourceDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/serverTemplates`;    fs.readdirSync(serverSourceDir).forEach((templateFileName) => {        shell.cp('-f', `${serverSourceDir}/${templateFileName}`, `${pwd}/server/${templateFileName}`);    });    const imageDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/background.jpg`;    shell.cp('-f', `${imageDir}`, `${pwd}/src/images/background.jpg`);    const contentDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/content/index.js`;    shell.cp('-f', `${contentDir}`, `${pwd}/content/index.js`);};export const handleAppTemplates = (pwd, cbPackageJson, metaInfo) => {    const configSourceDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/configTemplates`;    const handlebarsData = handleHBSData(metaInfo);    fs.readdirSync(configSourceDir).forEach((templateFileName) => {        const convertTemplateSrc = fs.readFileSync(`${configSourceDir}/${templateFileName}`).toString();        const convertTemplate = handlebars.compile(convertTemplateSrc);        const content = convertTemplate(handlebarsData);        const finalFileName = join(split(templateFileName, '.', 2), '.');        const destFilePath = `${pwd}/config/${finalFileName}`;        shell.touch(destFilePath);        fs.writeFileSync(destFilePath, content);    });    const stateSourceDir = `${pwd}/node_modules/${cbPackageJson.name}/configuration/appTemplates/stateTemplates`;    fs.readdirSync(stateSourceDir).forEach((templateFileName) => {        const convertTemplateSrc = fs.readFileSync(`${stateSourceDir}/${templateFileName}`).toString();        const convertTemplate = handlebars.compile(convertTemplateSrc);        const content = convertTemplate(handlebarsData);        const finalFileName = join(split(templateFileName, '.', 2), '.');        const destFilePath = `${pwd}/src/state/${finalFileName}`;        shell.touch(destFilePath);        fs.writeFileSync(destFilePath, content);    });};export const handleHBSData = (metaInfo) => {    const data = {        pages: extractHBSPagesData(metaInfo.pages),        servicePages: extractHBSServicesData(metaInfo.pages),        reducers: extractHBSReducersData(metaInfo.pages, metaInfo.sharedContainers),        indexPage: lowerFirst(metaInfo.indexPage)    };    return data;};export const extractHBSPagesData = (pages) => {    const pagesData = [];    for (const page of pages) {        pagesData.push({ lowerFirstPageName: `${lowerFirst(page.pageName)}`, pageLoaderName: `load${page.pageName}`, pageName: `${page.pageName}` });    }    return pagesData;};export const extractHBSReducersData = (pages, containers) => {    const reducersData = [];    for (const page of pages) {        reducersData.push({ componentName: `${lowerFirst(page.pageName)}`, reducerName: `${lowerFirst(page.pageName)}Reducer`, reducerPath: `../pages/${page.pageName}/containers/state/reducers` });    }    for (const container of containers) {        reducersData.push({ componentName: `${lowerFirst(container)}`, reducerName: `${lowerFirst(container)}Reducer`, reducerPath: `../shared/containers/${container}/state/reducers` });    }    return reducersData;};export const extractHBSServicesData = (pages) => {    const servicesData = [];    for (const page of pages) {        const needService = page.needFeatures.includes('Need Service');        if (needService) {            servicesData.push({ pageName: `${lowerFirst(page.pageName)}` });        }    }    return servicesData;};export const scanPackageToMergeDependencies = () => {    const pwd = getCurrentDir();    const packageJsonPath = `${pwd}/package.json`;    let contentPackageJson = jsonfile.readFileSync(packageJsonPath);    // Search the digital packages in dependencies    pcList.packages.forEach((key) => {        if (has(contentPackageJson.dependencies, key)) {            const packageJsonToMerge = jsonfile.readFileSync(`${pwd}/node_modules/${key}/package.json`);            contentPackageJson = mergePeerToDependencies(contentPackageJson, packageJsonToMerge);        }    });    jsonfile.writeFileSync(packageJsonPath, contentPackageJson, { spaces: 2 });    return contentPackageJson;};export const mergePeerToDependencies = (contentPackageJson, packageJsonToMerge) => {    const dependencies = contentPackageJson.dependencies;    const peerDependencies = packageJsonToMerge.peerDependencies;    let dependenciesToMerge = {};    // For each peerDependency and get the correct version and correct prefix to use    forIn(peerDependencies, (value, key) => {        if (!excludeDevDependencies(key)) {            let correctVersion = splitVersion(value);            if (has(dependencies, key)) {                correctVersion = getPackageGreaterVersion(value, dependencies[key]);            }            dependenciesToMerge = assign(dependenciesToMerge, JSON.parse(`{"${key}" : "${correctVersion.prefix}${correctVersion.versionNumber}"}`));        }    });    const newContentPackageJson = {        ...contentPackageJson,        dependencies: {            ...dependencies,            ...dependenciesToMerge        }    };    return newContentPackageJson;};export const getPackageGreaterVersion = (firstV, secondV) => {    const splitFirstV = splitVersion(firstV);    const splitSecondV = splitVersion(secondV);    // If the version is the same, select use the ^ or ~ as the common prefix    if (semver.eq(splitFirstV.versionNumber, splitSecondV.versionNumber)) {        if (splitFirstV.prefix === '^' || splitSecondV.prefix === '^') {            splitFirstV.prefix = '^';            splitSecondV.prefix = '^';        } else if (splitFirstV.prefix === '~' || splitSecondV.prefix === '~') {            splitFirstV.prefix = '~';            splitSecondV.prefix = '~';        }    }    const result = semver.gt(splitFirstV.versionNumber, splitSecondV.versionNumber);    return result ? splitFirstV : splitSecondV;};export const splitVersion = (versionName) => {    let prefixChar = versionName.charAt(0);    prefixChar = /^\d+$/.test(prefixChar) ? '' : prefixChar; // If the first char is number, then use '' as prefix    const version = prefixChar === '' ? versionName : versionName.slice(1);    return {        'prefix': prefixChar,        'versionNumber': version    };};export const excludeDevDependencies = (packageName) => {    const devDepen = pcList.excludeScanning;    let excludeFlag = false;    for (let counter = 0; counter < devDepen.length; counter++) {        if (packageName.includes(devDepen[counter])) {            excludeFlag = true;            return excludeFlag;        }    }    return excludeFlag;};// export const getDataFromAcornParsedData = (acornParsedBodyArray) => {//     console.log(acornParsedBodyArray); // eslint-disable-line no-console//     const importArray = [];//     let objectVariable = {//     };//     for (const value of acornParsedBodyArray) {//         if (value.type === 'ImportDeclaration') {//             importArray.push({//                 'name': value.specifiers[0].local.name,//                 'value': value.source.value//             });//         } else if (value.type === 'VariableDeclaration') {//             switch (value.declarations[0].init.type) {//                 case 'ArrayExpression'://                     break;//                 case 'ObjectExpression'://                     objectVariable = Object.assign({}, objectVariable, {//                         'kind': value.kind,//                         'id': value.declarations[0].id.name,//                         'variableType': value.declarations[0].init.type//                     });//                     break;//                 case 'Identifier'://                     break;//                 default: break;//             }//         }//     }//     return {//         importArray,//         objectVariable//     };// };export const writeFileToInsert = (importArray, variableArray, exportContent) => {};export default {    getCurrentDir,    initAppWithMetaInfo,    copyPackagesConfig,    createAppStructureWithMetaInfo,    copyWebpackConfig,    logger,    ProcessMessage,    scanPackageToMergeDependencies,    mergePeerToDependencies,    getPackageGreaterVersion,    excludeDevDependencies,    splitVersion,    getExistingProjectName,    getExistingPages,    createPlainApp,    createPlainContentApp,    createExampleApp,    designItemsWithMetaInfo};
